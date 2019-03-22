const DDPG = (function () {
  const NODEJS = typeof module !== 'undefined' && typeof module.exports !== 'undefined';
  if (NODEJS) {
    ({API, N, Util, Deque, tf} = {
      API: require('../lib/api'),
      N: require('nial'),
      Util: require('../lib/util'),
      Deque: require('../lib/deque'),
      tf: require('@tensorflow/tfjs-node'),  
      //tf: require('@tensorflow/tfjs-node-gpu'),
    });    
  }
  const SAVE_METHOD = NODEJS ? `file://${process.cwd()}/saves/ddpg/` : 'indexeddb://';
  
  class OUNoise {
    constructor(size, mu=0., theta=0.15, sigma=0.05) {
      this.mu =  N.mul(mu, N.ones([size]));
      this.theta = theta;
      this.sigma = sigma;
      this.reset();
    }
    reset() {
      this.state = N.clone(this.mu);
    }
    sample() {
      const x = this.state;
      const dx = N.add(N.mul(this.theta, N.sub(this.mu, x)),
                 N.mul(this.sigma, N.til(x.length).map(Math.random)));
      this.state = N.add(x, dx)
      return this.state
    }
  }

  const sample = (array, size) => {
    const results = [],
          sampled = {};
    while(results.length<size && results.length<array.length) {
      const index = Math.trunc(Math.random() * array.length);
      if(!sampled[index]) {
        results.push(array[index]);
        sampled[index] = true;
      }
    }
    return results;
  }

  class ReplayBuffer {
    constructor(bufferSize, batchSize) {
      this.bufferSize = bufferSize;
      this.memory = new Deque(bufferSize+1);
      this.batchSize = batchSize;
    }
    add (state, action, reward, nextState, done) {
      this.memory.push({state, action, reward, nextState, done});
      if (this.memory.length > this.bufferSize) {
        this.memory.shift();
      }
    }
    sample() {
      const experiences = sample(this.memory, this.batchSize);
      return tf.tidy(() => {
        return {
          states: tf.tensor(experiences.map(x => x.state)), 
          actions: tf.tensor(experiences.map(x => x.action)), 
          rewards: tf.tensor(experiences.map(x => [x.reward])), 
          nextStates: tf.tensor(experiences.map(x => x.nextState)), 
          dones: tf.tensor(experiences.map(x => [x.done])),
        };
      });
    }

    get length() {
      return this.memory.length;
    }
  }

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

  const makeActor = (inputShape, outputShape, fc=256) => tf.sequential({
    layers: [
      tf.layers.dense({inputShape: [inputShape], units: fc, activation: 'relu'}),
      tf.layers.dense({units:  outputShape, activation: 'tanh'}),
    ]
  });

  // Can't use 'LeakyReLU' due to https://github.com/tensorflow/tfjs/issues/1093
  const criticActivation = 'relu'; 

  const makeCritic = (inputShape, actionShape, ds=256, d2=256, d3=128) => {
    const stateInput = tf.input({shape: [inputShape]});
    const actionInput = tf.input({shape: [actionShape]});
    const fcs1 = tf.layers.dense({units: ds, activation: criticActivation})
                   .apply(stateInput);
    const concat = tf.layers.concatenate().apply([fcs1, actionInput]);
    const fc2 = tf.layers.dense({units: d2, activation: criticActivation}).apply(concat);
    const fc3 = tf.layers.dense({units: d3, activation: criticActivation}).apply(fc2);
    const output = tf.layers.dense({units: 1}).apply(fc3);
    const model = tf.model({inputs: [stateInput, actionInput], outputs: output});
    return model;
  }

  class DDPG {
    constructor(stateSize, actionSize, epsilon=1.0, 
        lrActor=LR_ACTOR, lrCritic=LR_CRITIC, weightDecay=0) {
      this.stateSize = stateSize;
      this.actionSize = actionSize;
      this.epsilon = epsilon;
      this.weightDecay = weightDecay;
      this.noise = new OUNoise(actionSize);
      this.actor = makeActor(stateSize, actionSize);
      this.actorTarget = makeActor(stateSize, actionSize);
      this.critic =makeCritic(stateSize, actionSize);
      this.criticTarget =makeCritic(stateSize, actionSize);
      this.actorOptimizer = tf.train.adam(lrActor);
      this.criticOptimizer = tf.train.adam(lrCritic);
      hardUpdate(this.actor, this.actorTarget);
      hardUpdate(this.critic, this.criticTarget);      
    }

    act (state, addNoise=true) {
      return tf.tidy(() => {
        let action = tf.squeeze(this.actor.predict(tf.tensor([state])));
        if (addNoise) {
          action = action.add(this.noise.sample());
        }
        return action.clipByValue(-1, 1);
      });
    }

    reset () {
      this.noise.reset();
    }

    learn(experiences, gamma, tau=TAU, epsilonDecay=1e-6) {
      const {states, actions, rewards, nextStates, dones} = experiences;
      tf.tidy(() => {
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
      this.epsilon -= epsilonDecay;
      this.noise.reset();
    }

    async save(infix) {
      //console.log(SAVE_METHOD + 'actor_' + infix);
      await this.actor.save(SAVE_METHOD + infix + '_actor');
      await this.critic.save(SAVE_METHOD + infix + '_critic');
    }

    async load(infix) {
      const aPath = `${SAVE_METHOD}actor_${infix}/model.json`;
      const cPath = `${SAVE_METHOD}critic_${infix}/model.json`;
      this.actor = await tf.loadLayersModel(aPath);
      this.critic = await tf.loadLayersModel(cPath);
      hardUpdate(this.actor, this.actorTarget);
      hardUpdate(this.critic, this.criticTarget);
    }
  }
  
  const BUFFER_SIZE = 1e6;
  const BATCH_SIZE = 128;
  const GAMMA = 0.99;
  const TAU = 1e-3;
  const LR_ACTOR = 1e-4;
  const LR_CRITIC = 3e-4;
  //const WEIGHT_DECAY = 0.0001;
  // const MIN_BUFFER_SIZE = 1e3;
  // const UPDATE_EVERY = 10;
  
  

  const learn = (agent, buffer, stepNo) => {
    if (buffer.length > BATCH_SIZE) {
      const experiences = buffer.sample();
      agent.learn(experiences, GAMMA);
    }
  }


  const continuous = async (env, maxEpisodes, render) => {
    const {instanceId, observationSpace, actionSpace, maxSteps} = env;
    const inputSize = observationSpace.shape[0];
    const outputSize = actionSpace.shape[0];
    const buffer = new ReplayBuffer(BUFFER_SIZE, BATCH_SIZE);
    const agent = new DDPG(inputSize, outputSize);
    // await agent.load(530);
    let maxReward = -Infinity;
    for (const epNo of N.til(maxEpisodes)) {
      let epReward = 0, observation, reward, done;
      let stepsTaken  = 0;
      observation = await API.environmentReset(instanceId);
      for (const stepNo of N.til(maxSteps)) {
        let action = await agent.act(observation).data();
        action = Array.from(action);
        const prevState = observation;
        ({observation, reward, done} =
          await Util.stepResponse(instanceId, action, render));
        //console.log(`EpNo ${epNo} stepNo ${stepNo} reward ${reward}`); 
        reward = Math.max(reward, -1);
        done = done ? 1. : 0.;
        buffer.add(prevState, action, reward, observation, done);
        learn(agent, buffer, epNo, stepNo);
        epReward += reward;
        
        ++stepsTaken;
        if (done) break;
      }
      epReward /= stepsTaken;
      console.log(`EpNo:${epNo}, epReward:${epReward},stepsTaken:${stepsTaken}`);
      if (epReward > maxReward) {
        maxReward =  epReward;
        await agent.save(epNo);
      } else if (epNo % 10 === 0) {
        await agent.save('last');
      }
    }
    return {maxReward};
  };

  return {
    continuous,
    __internal__: {
      DDPG,
      ReplayBuffer,
      hardUpdate,
      softUpdate,
      makeActor,
      makeCritic,
    },
  };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = DDPG;
}