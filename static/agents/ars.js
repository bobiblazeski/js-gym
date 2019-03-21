const ARS = (function () {
  var fs;
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    ({API, N, Util} = {
      API: require('../lib/api'),
      N: require('nial'),
      Util: require('../lib/util'),  
    });
    fs = require('fs');
  }

  const HP = {
    nbSteps: 1000,
    learningRate: 0.02,
    nbDeltas: 8,//16,
    nbBestDeltas: 8,//16
    noise: 0.2,
  };

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

  const perturb = (params, delta, add) => {
    const noise = N.mul(delta, HP.noise);
    return add ? N.add(params, noise) : N.sub(params, noise);
  };

  const stdRewards = (positive, negative) => {
    const variance = N.variance(positive.concat(negative));        
    return Math.sqrt(variance);
  };


  // Sort the rollouts by max(rPos, rNeg) & select deltas with best rewards
  const getRollouts = (positiveRewards, negativeRewards, deltas) => {
    const scores = N.til(HP.nbDeltas).reduce((acc, i) => {
      acc[i] = Math.max(positiveRewards[i], negativeRewards[i]);
      return acc;
    }, {});
    const order = Object.keys(scores)
      .sort((a,b) => {
        return scores[b] - scores[a];
      }).slice(0, HP.nbBestDeltas);
    return order.map((k) => {
      return [positiveRewards[k], negativeRewards[k], deltas[k]];
    });
  };

  const update = (params, rollouts, sigmaR) => {
    let step = N.zeros(N.shape(params));
    rollouts.forEach(([rPos, rNeg, delta]) => {
      step = N.add(step, N.mul(N.sub(rPos, rNeg), delta));
    });
    let d = HP.learningRate / (HP.nbBestDeltas * sigmaR);
    return N.add(params, N.mul(d, step));
  }

  const act = (observation, parameters) => N.dot(parameters, observation);  

  const episode = async (instanceId, maxSteps, render, normalizer,
    parameters) => {
    let epReward = 0, reward, done;
    let observation = await API.environmentReset(instanceId);
    for (const stepNo of N.til(maxSteps)) {
      normalizer.observe(observation);
      observation = normalizer.normalize(observation);
      let action = act(observation, parameters);
      ({observation, reward, done} =
        await Util.stepResponse(instanceId, action, render));
      reward = Math.max(Math.min(reward, 1), -1);
      epReward += reward;
      if (done) break;
    }     
    return epReward;
  };

  const cycle = async (instanceId, maxSteps, render, normalizer, parameters,
    deltas) => {
    epNo = 0;
    const positiveRewards = [];
    const negativeRewards = [];
    for (const k of N.til(deltas.length)) {      
      positiveRewards.push(await episode(instanceId, maxSteps, render,
        normalizer, perturb(parameters, deltas[k], true)));
      negativeRewards.push(await episode(instanceId, maxSteps, render,
        normalizer, perturb(parameters, deltas[k], false)));
    }
    const epReward = await episode(instanceId, maxSteps, render,
      normalizer, parameters);
    return {epReward, positiveRewards, negativeRewards};
  };

  const sampleDeltas = (shape) => {    
    return N.til(HP.nbDeltas).map(() => N.randn(shape));
  };
  
  const save = (normalizer, parameters,cycleNo, maxReward) => {
    if (fs) {
      const fileName = `./saves/ars/${cycleNo} - ${Math.round(maxReward)}.json`;
      fs.writeFile(fileName, JSON.stringify({
        normalizer: {
          n: normalizer.n,
          mean: normalizer.mean,
          meanDiff: normalizer.meanDiff,
          variance: normalizer.variance,
        },
        parameters,
      }, null, 2), (err) => err && console.log(err));
    }
  }

  const continuous = async (env, maxEpisodes, render) => {
    const {instanceId, observationSpace, actionSpace, maxSteps} = env;
    const inputSize = observationSpace.shape[0];
    const outputSize = actionSpace.shape[0];
    const normalizer = new Normalizer([inputSize]);
    let maxReward = -Infinity;
    let parameters = N.zeros([outputSize, inputSize]);
    const cycleLimit = Math.floor(maxEpisodes / HP.nbDeltas / 2);
    for (const cycleNo of N.til(cycleLimit)) {
      const deltas = sampleDeltas(N.shape(parameters));
      const {epReward, positiveRewards, negativeRewards} = await cycle(instanceId,
        maxSteps, render, normalizer, parameters, deltas);
      const sigmaR = stdRewards(positiveRewards, negativeRewards);
      const rollouts = getRollouts(positiveRewards, negativeRewards, deltas);
      parameters = update(parameters, rollouts, sigmaR);
      if (epReward > maxReward) {
        maxReward = epReward;
        save(normalizer, parameters, cycleNo, maxReward);
      }      
      console.log(`Cycle: ${cycleNo} Reward: ${epReward}`);
    }
    return {maxReward, bestParameters: parameters};
  };

  const play = async (env, maxEpisodes, render, saved) => {        
    const {instanceId, observationSpace, actionSpace, maxSteps} = env;
    const inputSize = observationSpace.shape[0];    
    
    const normalizer = new Normalizer([inputSize]);        
    normalizer.n = saved.normalizer.n;
    normalizer.mean = saved.normalizer.mean;
    normalizer.meanDiff = saved.normalizer.meanDiff;
    normalizer.variance = saved.normalizer.variance;

    let parameters = saved.parameters;    
    for (const epNo of N.til(maxEpisodes)) {
      const epReward = await episode(instanceId, maxSteps, render,
        normalizer, parameters);
      console.log(`epNo: ${epNo} Reward: ${epReward}`);
    }
    return {maxReward, bestParameters: parameters};
  };

  return {
    continuous,
    play,
    __internal__: {
      update,
    }
  };
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = ARS;
}