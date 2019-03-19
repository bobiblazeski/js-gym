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
      const experiences = sample(self.memory, this.batchSize);
      return {
        states: experiences.map(x => s.state), 
        actions: experiences.map(x => s.action), 
        rewards: experiences.map(x => s.reward), 
        nextStates: experiences.map(x => s.nextState), 
        dones: experiences.map(x => s.done),
      };
    }
  }

  

  const hardUpdate = (source, target) => {
    N.til(MIN_BUFFER_SIZE).forEach(i => 
      target.weights[i].assign(source.weights[i]));
  }

  const softUpdate = (source, target, tau) => {
    N.til(MIN_BUFFER_SIZE).forEach(i => 
      target.weights[i].assign(source.weights[i].mul(tau)
        + target.weights[i].mul(1-tau)));
  }

  const makeActor = (inputShape, outputShape, l1=96, l2=96) => tf.sequential({
    layers: [
      tf.layers.dense({inputShape: [inputShape], units: l1, activation: 'relu'}),
      tf.layers.dense({units: l2, activation: 'relu'}),
      tf.layers.dense({units: outputShape, activation: 'softmax'}),
    ]
  });

  const makeCritic = (inputShape, actionShape, l1=96, l2=96) => {
    const stateInput = tf.input({shape: [inputShape]});
    const actionInput = tf.input({shape: [actionShape]});
    const fc1 = tf.layers.dense({units: l1, activation: 'relu'}).apply(stateInput);
    const concat = tf.layers.concatenate().apply([fc1, actionInput]);
    const fc2 = tf.layers.dense({units: l2, activation: 'relu'}).apply(concat);
    const output = tf.layers.dense({units: 1}).apply(fc2);
    const model = tf.LayersModel({inputs: [stateInput, actionInput], outputs: output});
    return model;
  }

  class DDPG {
    constructor(stateSize, actionSize, fc1Units=96, fc2Units=96,
        epsilon=1.0, lrActor=1e-3, lrCritic=1e-3, weightDecay=0) {
      this.stateSize = stateSize;
      this.actionSize = actionSize;
      this.epsilon = epsilon;
      this.weightDecay = weightDecay;
      this.noise = OUNoise(actionSize);
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
      hardUpdate(actor, actorTarget);
      hardUpdate(critic, criticTarget);      
    }

    act (state, adNoise=true) {
      return adNoise ? actor(state).add(this.noise.sample) : actor(state);
    }

    reset () {
      this.noise.reset();
    }

    learn(experiences, gamma, tau=1e-3, epsilonDecay=1e-6) {
      const {states, actions, rewards, nextStates, dones} = experiences;
      // Get predicted next-state actions and Q values from target models
      const actionsNext = this.actorTarget(nextStates)
      const qTargetsNext = self.criticTarget(nextStates, actionsNext);
      // Compute Q targets for current states (y-i)
      const qTargets = tf.add(rewards, tf.mul(tf.mul(gamma, qTargetsNext), tf.sub(1, dones)));
      const qExpected = this.critic(states, actions);
      // Critic update
      this.criticOptimizer.minimize(() => {
        const criticLoss = tf.losses.meanSquaredError(qExpected, qTargets);
        // torch.nn.utils.clip_grad_norm_(self.critic.parameters(), 1)
        return criticLoss;
      });
      // Actor update
      this.actorOptimizer.minimize(() => {
        actionsPred = this.actor(states);
        actorLoss = -this.critic(states, actionsPred).mean();
        return actorLoss;
      });
      // Targets update
      softUpdate(this.critic, this.criticTarget, tau);
      softUpdate(this.actor, this.actorTarget, tau);
      // Noise update
      this.epsilon -= epsilonDecay;
      this.noise.reset();
    }
  }
  
  const MIN_BUFFER_SIZE = 1e5;
  const UPDATE_EVERY = 10;
  const GAMMA = 0.99;

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
    const buffer = new ReplayBuffer()
    const agent = new DDPG(inputSize, outputSize);
    for (const epNo of N.til(maxEpisodes)) {
      let epReward = 0, observation, reward, done;
      observation = await API.environmentReset(instanceId);
      for (const stepNo of N.til(maxSteps)) {
        let action = await agent.act(observation).data();
        const prevState = observation;
        ({observation, reward, done} =
          await Util.stepResponse(instanceId, action, render));
        
        buffer.add(state, action, reward, nextState, done);
        learn(agent, buffers, epNo, stepNo);
        epReward += reward; 
        if (done) break;
      }
      
      if (epReward > maxReward) {
        maxReward =  epReward;
      }
    }
    return {maxReward, bestParameters};
  };

  return {
    continuous, 
  };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = OUNoise;
}