const DDPG = (function () {
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    ({N, tf} = {
      N: require('nial'),
      tf: require('@tensorflow/tfjs-node'),  
    });
  }

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

  const makeActor = (inputShape, outputShape, l1=96, l2=96) => tf.sequential({
    layers: [
      tf.layers.dense({inputShape: [inputShape], units: l1, activation: 'relu'}),
      tf.layers.dense({units: l2, activation: 'relu'}),
      tf.layers.dense({units: outputShape, activation: 'softmax'}),
    ]
  });

  const makeCritic = (inputShape, actionShape, l1=96, l2=96) => tf.sequential({
    layers: [
      tf.layers.dense({inputShape: [inputShape+actionShape], 
        units: l1, activation: 'relu'}),
      tf.layers.dense({units: l2, activation: 'relu'}),
      tf.layers.dense({units: 1, activation: 'tanh'}),
    ]
  });

  class DDPG {
    constructor(stateSize, actionSize, fc1Units=96, fc2Units=96,
        epsilon=1.0, lrActor=1e-3, lrCritic=1e-3, weightDecay=0) {
      this.stateSize = stateSize;
      this.actionSize = actionSize;
      this.epsilon = epsilon;
      this.weightDecay = weightDecay;
      this.noise = new OUNoise(actionSize);
      this.actor = makeActor(stateSize, actionSize, fc1Units=fc1Units,
        fc2Units=fc2Units);
      this.actorTarget = makeActor(stateSize, actionSize, fc1Units=fc1Units,
        fc2Units=fc2Units);
      this.critic =makeCritic(stateSize, actionSize, fc1Units=fc1Units,
        fc2Units=fc2Units);
      this.criticTarget =makeCritic(stateSize, actionSize, fc1Units=fc1Units,
        fc2Units=fc2Units);
      this.actorOptimizer = tf.train.adam(lrActor);
      this.criticOptimizer = tf.train.adam(lrCritic);
      hardUpdate(this.actor, this.actorTarget);
      hardUpdate(this.critic, this.criticTarget);      
    }

    act (state, addNoise=true) {
      return tf.tidy(() => {
        const action = tf.squeeze(this.actor.predict(tf.tensor([state])));
        return addNoise ? action.add(this.noise.sample()) : action;
      });
    }

    reset () {
      this.noise.reset();
    }

    learn(experiences, gamma, tau=1e-3, epsilonDecay=1e-6) {
      const {states, actions, rewards, nextStates, dones} = experiences;
      tf.tidy(() => {
        // Get predicted next-state actions and Q values from target models
        const actionsNext = this.actorTarget.predict(nextStates)
        const qTargetsNext = this.criticTarget.predict(tf.concat([nextStates, actionsNext], 1));
        
        // Critic update
        this.criticOptimizer.minimize(() => {
          // Compute Q targets for current states (y-i)
          const qTargets = tf.add(rewards, tf.mul(tf.mul(gamma, qTargetsNext), tf.sub(1, dones)));
          const qExpected = this.critic.predict(tf.concat([states, actions], 1));
          const criticLoss = tf.losses.meanSquaredError(qExpected, qTargets);
          // torch.nn.utils.clip_grad_norm_(self.critic.parameters(), 1)
          return criticLoss;
        });
        // Actor update
        this.actorOptimizer.minimize(() => {
          const actionsPred = this.actor.predict(states);
          //const actorLoss = -this.critic(states, actionsPred).mean();
          const actorLoss = this.critic.predict(tf.concat([states, actionsPred], 1)).mean().mul(-1.);
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
  }
  
  const MIN_BUFFER_SIZE = 1e3;
  const UPDATE_EVERY = 10;
  const GAMMA = 0.99;
  const BUFFER_SIZE = 1e6;
  const BATCH_SIZE = 32;

  const learn = (agent, buffer, stepNo) => {
    if (buffer.length > MIN_BUFFER_SIZE && stepNo % UPDATE_EVERY == 0) {
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
    let maxReward = -Infinity;
    for (const epNo of N.til(maxEpisodes)) {
      let epReward = 0, observation, reward, done;
      observation = await API.environmentReset(instanceId);
      for (const stepNo of N.til(maxSteps)) {
        let action = await agent.act(observation).data();
        action = Array.from(action);
        const prevState = observation;
        ({observation, reward, done} =
          await Util.stepResponse(instanceId, action, render));
        reward = Math.max(reward, -1);
        done = done ? 1. : 0.;
        buffer.add(prevState, action, reward, observation, done);
        learn(agent, buffer, epNo, stepNo);
        epReward += reward;
        //console.log(`EpNo ${epNo} stepNo ${stepNo} reward ${reward}`); 
        if (done) break;
      }
      console.log(`EpNo ${epNo}  epReward ${epReward}`); 
      if (epReward > maxReward) {
        maxReward =  epReward;
      }
    }
    return {maxReward, bestParameters};
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