import * as tf from '@tensorflow/tfjs';

import ReplayBuffer from '../lib/replay.buffer';
import OUNoise from '../lib/ounoise';
import {softmax} from '../lib/util';


const NODEJS = typeof window === 'undefined';
const SAVE_METHOD = NODEJS ? `file://` : 'indexeddb://';

const hardUpdate = (source, target) => {
  tf.tidy(() => {
    target.layers.forEach((layer, i) => 
    layer.setWeights(source.layers[i].getWeights()));
  });
}

const softUpdate = (source, target, tau) => {
  tf.tidy(() => {
    target.layers.forEach((layer, i) =>  {
      const sWeights = source.layers[i].getWeights();
      const tWeights = layer.getWeights();
      const res = sWeights.map((s, i) => 
        tf.mul(s, tau).add(tf.mul(tWeights[i], 1-tau)));
      layer.setWeights(res);
    });
  });
}

const BUFFER_SIZE = 1e6;
const BATCH_SIZE = 16;
const GAMMA = 0.99;
const TAU = 1e-3;
const LR_ACTOR = 1e-4;
const LR_CRITIC = 3e-4;
const MIN_BUFFER_SIZE = 2 * BATCH_SIZE;
const UPDATE_EVERY = 10;
const EPSILON =1.0;
const EPSILON_DECAY =1e-6;
const MIN_EPSILON = 0.05;

class DDPG {
  constructor(actionSize, makeActor, makeCritic, { epsilon=EPSILON,
      epsilonDecay=EPSILON_DECAY, minEpsilon=MIN_EPSILON,
      lrActor=LR_ACTOR, lrCritic=LR_CRITIC,
      minBufferSize=MIN_BUFFER_SIZE, updateEvery=UPDATE_EVERY,
      bufferSize=BUFFER_SIZE, batchSize=BATCH_SIZE} = {},
      buffer) {
    this.epsilon = epsilon;
    this.epsilonDecay = epsilonDecay;
    this.minEpsilon = minEpsilon;
    this.minBufferSize = minBufferSize;
    this.updateEvery = updateEvery;
    this.noise = new OUNoise(actionSize);
    this.buffer = buffer || new ReplayBuffer(bufferSize, batchSize);

    this.actor = makeActor();
    this.actorTarget = makeActor();
    this.critic =makeCritic();
    this.criticTarget =makeCritic();
    this.actorOptimizer = tf.train.adam(lrActor);
    this.criticOptimizer = tf.train.adam(lrCritic);

    hardUpdate(this.actor, this.actorTarget);
    hardUpdate(this.critic, this.criticTarget);      
  }

  async act (state, train=true) {
    const action = tf.tidy(() => {
      let action = tf.squeeze(this.actor.predict(tf.tensor([state])));
      if (train) {
        const noise = softmax(this.noise.sample());        
        action = action.mul(1-this.epsilon).add(tf.mul(noise, this.epsilon));
      }
      return action;
    });
    const data = await action.data();
    return Array.from(data);
  }

  reset () {
    this.noise.reset();
  }

  async step (envStep, other) {
    const {prevState, action, reward, observation, done} = envStep;
    const {stepNo} = other;
    this.buffer.add(prevState, action, reward, observation, done, other);    
    if (this.buffer.length > this.minBufferSize && stepNo % this.updateEvery === 0) {        
      const episodes = await this.buffer.sample();
      this.learn(episodes, GAMMA);
      console.log('Epsilon', this.epsilon.toFixed(2));
    }          
  }

  learn(experiences, gamma, tau=TAU) {    
    tf.tidy(() => {      
      const tensorified = {};
      Object.keys(experiences).map(function(key) {
        tensorified[key] = tf.tensor(experiences[key]);        
      });      
      const {states, actions, rewards, nextStates, dones} = tensorified;

      // Get predicted next-state actions and Q values from target models
      const actionsNext = this.actorTarget.predict(nextStates)
      const qTargetsNext = this.criticTarget.predict([nextStates, actionsNext]);        
      // Critic update
      this.criticOptimizer.minimize(() => {
        // Compute Q targets for current states (y-i)
        const qTargets = tf.add(rewards, tf.mul(tf.mul(gamma, qTargetsNext), tf.sub(1, dones)));
        const qExpected = this.critic.predict([states, actions]);
        const criticLoss = tf.losses.meanSquaredError(qExpected, qTargets);
        // torch.nn.utils.clip_grad_norm_(self.critic.parameters(), 1)
        return criticLoss;
      });
      // Actor update
      this.actorOptimizer.minimize(() => {
        const actionsPred = this.actor.predict(states);
        const actorLoss = this.critic.predict([states, actionsPred]).mean().mul(-1.);
        return actorLoss;
      });
    });
    // Targets update
    softUpdate(this.critic, this.criticTarget, tau);
    softUpdate(this.actor, this.actorTarget, tau);
    // Noise update
    this.epsilon = Math.max(this.minEpsilon, this.epsilon - this.epsilonDecay);
    this.noise.reset();    
  }

  async save(infix) {
    await this.actor.save(SAVE_METHOD + infix + '_actor');
    await this.critic.save(SAVE_METHOD + infix + '_critic');
  }

  async load(infix) {
    const aPath = `${SAVE_METHOD}${infix}_actor/model.json`;
    const cPath = `${SAVE_METHOD}${infix}_critic/model.json`;
    this.actor = await tf.loadLayersModel(aPath);
    this.critic = await tf.loadLayersModel(cPath);
    hardUpdate(this.actor, this.actorTarget);
    hardUpdate(this.critic, this.criticTarget);
  }
}

export default DDPG;