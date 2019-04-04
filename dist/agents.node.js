'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var N = require('nial');
var tf = require('@tensorflow/tfjs-node');

class Normalizer {
    constructor(nbInputs) {
      this.n = N.zeros(nbInputs);
      this.mean = N.zeros(nbInputs);
      this.meanDiff = N.zeros(nbInputs);
      this.variance = N.zeros(nbInputs);
    }

    observe(x) {      
      this.n = N.add(this.n, 1.0);
      const lastMean = N.clone(this.mean);
      this.mean = N.add(this.mean, N.div(N.sub(x, this.mean), this.n));
      this.meanDiff = N.add(this.meanDiff,
        N.mul(N.sub(x, lastMean), N.sub(x, this.mean)));
      this.variance = N.clip(N.div(this.meanDiff, this.n), 1e-2);
    }

    normalize(inputs) {
      const obsMean = this.mean;
      const obsStd = N.sqrt(this.variance);
      return N.div(N.sub(inputs, obsMean), obsStd);
    }
  }

const HP = {    
  learningRate: 0.02,
  nbDeltas: 16,
  nbBestDeltas: 8,//16
  noise: 0.2,
};

const perturb = (params, delta, add, hpNoise) => {
  const noise = N.mul(delta, hpNoise);
  return add ? N.add(params, noise) : N.sub(params, noise);
};

const stdRewards = (positive, negative) => {
  const variance = N.variance(positive.concat(negative));        
  return Math.sqrt(variance);
};


// Sort the rollouts by max(rPos, rNeg) & select deltas with best rewards
const getRollouts = (positiveRewards, negativeRewards, deltas,
  nbDeltas, nbBestDeltas) => {
  const scores = N.til(nbDeltas).reduce((acc, i) => {
    acc[i] = Math.max(positiveRewards[i], negativeRewards[i]);
    return acc;
  }, {});
  const order = Object.keys(scores)
    .sort((a,b) => {
      return scores[b] - scores[a];
    }).slice(0, nbBestDeltas);
  return order.map((k) => {
    return [positiveRewards[k], negativeRewards[k], deltas[k]];
  });
};

const update = (params, rollouts, sigmaR, nbBestDeltas,
    learningRate) => {
  let step = N.zeros(N.shape(params));
  rollouts.forEach(([rPos, rNeg, delta]) => {
    step = N.add(step, N.mul(N.sub(rPos, rNeg), delta));
  });
  let d = learningRate / (nbBestDeltas * sigmaR);
  return N.add(params, N.mul(d, step));
};

class ARS {
  constructor(stateSize, actionSize, nbDeltas=HP.nbDeltas,
      nbBestDeltas=HP.nbBestDeltas, noise=HP.noise,
      learningRate=HP.learningRate) {
    this.learningRate = learningRate;
    this.nbDeltas = nbDeltas;
    this.nbBestDeltas = nbBestDeltas;
    this.noise = noise;
    this.normalizer = new Normalizer([stateSize]);
    this.shape = [actionSize, stateSize];
    this.parameters = N.randn(this.shape);      
    this.startCycle();
  }

  async act(state, train=true) {
    this.normalizer.observe(state);        
    const observation = this.normalizer.normalize(state);      
    const parameters = train 
      ? perturb(this.parameters, this.deltas[this.deltaNo],
            this.positive, this.noise)
      : this.parameters;      
    return N.clip(N.dot(parameters, observation), -1, 1);
  }

  async step(envStep, other) {
    const {done} = envStep;
    const {epReward} = other;
    if (done) {
      (this.positive ? this.posRewards : this.negRewards).push(epReward);
      this.positive = !this.positive;        
    }
    if (this.negRewards.length === this.nbDeltas) {
      const sigmaR = stdRewards(this.posRewards, this.negRewards);
      const rollouts = getRollouts(this.posRewards, this.negRewards, 
        this.deltas, this.nbDeltas, this.nbBestDeltas);
      this.parameters = update(this.parameters, rollouts, sigmaR, 
        this.nbBestDeltas, this.learningRate);
      this.startCycle();
      console.log('ARS learning cycle finished');
    }
  }

  startCycle() {
    this.deltas = N.til(this.nbDeltas).map(() => N.randn(this.shape));
    this.posRewards = [];
    this.negRewards = [];
    this.positive = true;
    this.deltaNo = 0;
  }

  serialize() {
    const normalizer = this.normalizer;
    const parameters = this.parameters;
    return JSON.stringify({
      normalizer: {
        n: normalizer.n,
        mean: normalizer.mean,
        meanDiff: normalizer.meanDiff,
        variance: normalizer.variance,
      },
      parameters,
    });
  }
}

const randomInt = (min_, max_) => {
  let min = Math.ceil(min_), max = Math.floor(max_);
  return Math.floor(Math.random() * (max - min)) + min;
};

class RandomPlay {
  constructor(stateSize, actionNo) {
    this.stateSize = stateSize;
    this.actionNo = actionNo;
  }

  act() {
    return randomInt(0, this.actionNo+1);
  }

  step() {}
}

class RandomSearch {
  constructor(stateSize, actionNo) {    
    this.shape = [actionNo, stateSize];
    this.parameters = this.createParameters();
    this.bestParameters = N.clone(this.parameters);
    this.maxReward = -Infinity;
  }

  act(state, train=true) {
    const params = train ? this.parameters : this.bestParameters;
    return N.dot(params, state) < 0 ? 0 : 1;
  }

  step(envStep, other) {
    const {done} = envStep;
    const {epReward} = other;
    if (done && epReward > this.maxReward) {
      this.maxReward = epReward;
      this.bestParameters = N.clone(this.parameters);
      this.parameters = this.createParameters();
    }
  }

  createParameters() {
    return N.sub(N.mul(N.randomUniform(this.shape), 2), 1);
  }
}

const HP_HillClimbing = {
  noiseScaling: 0.1,
};

class HillClimbing {
  constructor(inputSize, outputSize, hp=HP_HillClimbing) {
    this.hp = hp;
    this.shape = [outputSize, inputSize];
    this.parameters = this.createParameters();
    this.bestParameters = N.clone(this.parameters);
    this.maxReward = -Infinity;
  }

  act(state, train=true) {
    const params = train ? this.parameters : this.bestParameters;      
    return N.dot(params, state) < 0 ? 0 : 1;
  }

  step(envStep, other) {
    const {done} = envStep;
    const {epReward} = other;
    if (done) {
      if (epReward > this.maxReward) {
        this.maxReward = epReward;
        this.bestParameters = N.clone(this.parameters);          
      }
      const noise = N.mul(this.createParameters(), this.hp.noiseScaling);
      this.parameters = N.add(this.bestParameters, noise);
    }
  }

  createParameters() {
    return N.sub(N.mul(N.randomUniform(this.shape), 2), 1);
  }    
}

const Deque = (function () {

  // Taken from https://github.com/petkaantonov/deque
  function Deque(capacity) {
    this._capacity = getCapacity(capacity);
    this._length = 0;
    this._front = 0;
    if (isArray(capacity)) {
        var len = capacity.length;
        for (var i = 0; i < len; ++i) {
            this[i] = capacity[i];
        }
        this._length = len;
    }
}

Deque.prototype.toArray = function Deque$toArray() {
    var len = this._length;
    var ret = new Array(len);
    var front = this._front;
    var capacity = this._capacity;
    for (var j = 0; j < len; ++j) {
        ret[j] = this[(front + j) & (capacity - 1)];
    }
    return ret;
};

Deque.prototype.push = function Deque$push(item) {
    var argsLength = arguments.length;
    var length = this._length;
    if (argsLength > 1) {
        var capacity = this._capacity;
        if (length + argsLength > capacity) {
            for (var i = 0; i < argsLength; ++i) {
                this._checkCapacity(length + 1);
                var j = (this._front + length) & (this._capacity - 1);
                this[j] = arguments[i];
                length++;
                this._length = length;
            }
            return length;
        }
        else {
            var j = this._front;
            for (var i = 0; i < argsLength; ++i) {
                this[(j + length) & (capacity - 1)] = arguments[i];
                j++;
            }
            this._length = length + argsLength;
            return length + argsLength;
        }

    }

    if (argsLength === 0) return length;

    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = item;
    this._length = length + 1;
    return length + 1;
};

Deque.prototype.pop = function Deque$pop() {
    var length = this._length;
    if (length === 0) {
        return void 0;
    }
    var i = (this._front + length - 1) & (this._capacity - 1);
    var ret = this[i];
    this[i] = void 0;
    this._length = length - 1;
    return ret;
};

Deque.prototype.shift = function Deque$shift() {
    var length = this._length;
    if (length === 0) {
        return void 0;
    }
    var front = this._front;
    var ret = this[front];
    this[front] = void 0;
    this._front = (front + 1) & (this._capacity - 1);
    this._length = length - 1;
    return ret;
};

Deque.prototype.unshift = function Deque$unshift(item) {
    var length = this._length;
    var argsLength = arguments.length;


    if (argsLength > 1) {
        var capacity = this._capacity;
        if (length + argsLength > capacity) {
            for (var i = argsLength - 1; i >= 0; i--) {
                this._checkCapacity(length + 1);
                var capacity = this._capacity;
                var j = (((( this._front - 1 ) &
                    ( capacity - 1) ) ^ capacity ) - capacity );
                this[j] = arguments[i];
                length++;
                this._length = length;
                this._front = j;
            }
            return length;
        }
        else {
            var front = this._front;
            for (var i = argsLength - 1; i >= 0; i--) {
                var j = (((( front - 1 ) &
                    ( capacity - 1) ) ^ capacity ) - capacity );
                this[j] = arguments[i];
                front = j;
            }
            this._front = front;
            this._length = length + argsLength;
            return length + argsLength;
        }
    }

    if (argsLength === 0) return length;

    this._checkCapacity(length + 1);
    var capacity = this._capacity;
    var i = (((( this._front - 1 ) &
        ( capacity - 1) ) ^ capacity ) - capacity );
    this[i] = item;
    this._length = length + 1;
    this._front = i;
    return length + 1;
};

Deque.prototype.peekBack = function Deque$peekBack() {
    var length = this._length;
    if (length === 0) {
        return void 0;
    }
    var index = (this._front + length - 1) & (this._capacity - 1);
    return this[index];
};

Deque.prototype.peekFront = function Deque$peekFront() {
    if (this._length === 0) {
        return void 0;
    }
    return this[this._front];
};

Deque.prototype.get = function Deque$get(index) {
    var i = index;
    if ((i !== (i | 0))) {
        return void 0;
    }
    var len = this._length;
    if (i < 0) {
        i = i + len;
    }
    if (i < 0 || i >= len) {
        return void 0;
    }
    return this[(this._front + i) & (this._capacity - 1)];
};

Deque.prototype.isEmpty = function Deque$isEmpty() {
    return this._length === 0;
};

Deque.prototype.clear = function Deque$clear() {
    var len = this._length;
    var front = this._front;
    var capacity = this._capacity;
    for (var j = 0; j < len; ++j) {
        this[(front + j) & (capacity - 1)] = void 0;
    }
    this._length = 0;
    this._front = 0;
};

Deque.prototype.toString = function Deque$toString() {
    return this.toArray().toString();
};

Deque.prototype.valueOf = Deque.prototype.toString;
Deque.prototype.removeFront = Deque.prototype.shift;
Deque.prototype.removeBack = Deque.prototype.pop;
Deque.prototype.insertFront = Deque.prototype.unshift;
Deque.prototype.insertBack = Deque.prototype.push;
Deque.prototype.enqueue = Deque.prototype.push;
Deque.prototype.dequeue = Deque.prototype.shift;
Deque.prototype.toJSON = Deque.prototype.toArray;

Object.defineProperty(Deque.prototype, "length", {
    get: function() {
        return this._length;
    },
    set: function() {
        throw new RangeError("");
    }
});

Deque.prototype._checkCapacity = function Deque$_checkCapacity(size) {
    if (this._capacity < size) {
        this._resizeTo(getCapacity(this._capacity * 1.5 + 16));
    }
};

Deque.prototype._resizeTo = function Deque$_resizeTo(capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    if (front + length > oldCapacity) {
        var moveItemsCount = (front + length) & (oldCapacity - 1);
        arrayMove(this, 0, this, oldCapacity, moveItemsCount);
    }
};


var isArray = Array.isArray;

function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function pow2AtLeast(n) {
    n = n >>> 0;
    n = n - 1;
    n = n | (n >> 1);
    n = n | (n >> 2);
    n = n | (n >> 4);
    n = n | (n >> 8);
    n = n | (n >> 16);
    return n + 1;
}

function getCapacity(capacity) {
    if (typeof capacity !== "number") {
        if (isArray(capacity)) {
            capacity = capacity.length;
        }
        else {
            return 16;
        }
    }
    return pow2AtLeast(
        Math.min(
            Math.max(16, capacity), 1073741824)
    );
}

  return Deque;
})();

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
};

const sigmoid = t =>  1/(1+Math.pow(Math.E, -t));

const softmax = arr => {
  const C = Math.max(...arr);
  const d = arr.map(y => Math.exp(y - C)).reduce((a, b) => a + b);
  return arr.map(value => Math.exp(value - C) / d);
};

var Util = /*#__PURE__*/Object.freeze({
  sample: sample,
  sigmoid: sigmoid,
  softmax: softmax
});

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
    return {
      states: experiences.map(x => x.state), 
      actions: experiences.map(x => x.action), 
      rewards: experiences.map(x => [x.reward]), 
      nextStates: experiences.map(x => x.nextState), 
      dones: experiences.map(x => [x.done]),
    };        
  }

  get length() {
    return this.memory.length;
  }
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
    this.state = N.add(x, dx);
    return this.state
  }
}

const NODEJS = typeof window === 'undefined';
const SAVE_METHOD = NODEJS ? `file://` : 'indexeddb://';

const hardUpdate = (source, target) => {
  tf.tidy(() => {
    target.layers.forEach((layer, i) => 
    layer.setWeights(source.layers[i].getWeights()));
  });
};

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
};

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
      console.log('Epsilon', this.epsilon.toFixed(3));
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
      const actionsNext = this.actorTarget.predict(nextStates);
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

const fs =  require('fs');
const fsp = fs.promises;
const zlib = require('zlib');
const moment = require('moment');
const BATCH_SIZE$1 = 32;
const EPISODE_STEPS = 3;

const rewards = (ep) => ep.reduce((s, e) => s + Math.abs(e.reward), 0);

const sampleEpisode = async (epPath, steps) => {
  const compressed =  await fsp.readFile(epPath);
  const episode = await new Promise((resolve) => {
    zlib.unzip(compressed, (_, buffer) => {
      const json = JSON.parse(buffer.toString());
      resolve(json);
    });
  });  
  const episodeSteps =sample(episode, steps);
  return episodeSteps;
};

class FileBuffer {
  constructor(batchSize=BATCH_SIZE$1, savePath, steps=EPISODE_STEPS) {
    this.batchSize= batchSize;
    this.memory = {};
    this.savePath = savePath;    
    this.steps = steps;
  }  
  async add (state, action, reward, nextState, done, other) {    
    const {epId} = other;
    if (!this.memory[epId]) this.memory[epId] = [];
    this.memory[epId].push({state, action, reward, nextState, done});    
    if (done) this.flush(epId);
  }
  async sample() {
    const files = await fsp.readdir(this.savePath);
    const filesNum = Math.round(this.batchSize/this.steps);
    const sampleFiles = sample(files, filesNum);
    let experiences = [];
    for (let file of sampleFiles) {
      const episodeExperiences = await sampleEpisode(this.savePath+file, this.steps);
      experiences = experiences.concat(episodeExperiences);
    }
    return {
      states: experiences.map(x => x.state), 
      actions: experiences.map(x => x.action), 
      rewards: experiences.map(x => [x.reward]), 
      nextStates: experiences.map(x => x.nextState), 
      dones: experiences.map(x => [x.done]),
    };        
  }
  flush(epId) {
    const reward = rewards(this.memory[epId]);
    if (reward !== 0) {
      const text = JSON.stringify(this.memory[epId]);
      const path = this.makePath(reward);
      zlib.gzip(text, (_, gz) => {
        fs.writeFileSync(path, gz);
      });      
    }   
    delete this.memory[epId];
  }
  makePath(reward) {
    const timestamp = moment().format('YYYY.MM.DD-hh.mm.ss');
    return `${this.savePath}${reward.toFixed(2)}-${timestamp}.gz`;
  }
  get length() {
    return fs.readdirSync(this.savePath).length;
  }
}

const lib = {
  OUNoise,
  FileBuffer,
  Util,
};

exports.ARS = ARS;
exports.DDPG = DDPG;
exports.HillClimbing = HillClimbing;
exports.RandomPlay = RandomPlay;
exports.RandomSearch = RandomSearch;
exports.lib = lib;
