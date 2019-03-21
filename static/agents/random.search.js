const RandomSearch = (function() {
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    ({API, N, Util} = {
      API: require('../lib/api'),
      N: require('nial'),
      Util: require('../lib/util'),  
    }); 
  }

  const actDiscrete = (observation, parameters) => {
    return N.max(N.dot(parameters, observation)) < 0 ? 0 : 1;
  };

  const discrete = async (env, maxEpisodes, render) => {
    const {instanceId, observationSpace, actionSpace, maxSteps} = env;
    const inputSize = observationSpace.shape[0];
    const outputSize = 1;
    let maxReward = -Infinity;
    let bestParameters = Util.createParameters([outputSize, inputSize]);

    for (const epNo of N.til(maxEpisodes)) {
      let parameters = Util.createParameters([outputSize, inputSize]);
      let epReward = 0, observation, reward, done;
      observation = await API.environmentReset(instanceId);
      for (const stepNo of N.til(maxSteps)) {
        let action = actDiscrete(observation, parameters);
        ({observation, reward, done} =
          await Util.stepResponse(instanceId, action, render));
         epReward += reward;
         if (done) break;
      }
      if (epReward > maxReward) {
        maxReward =  epReward;
        bestParameters = N.clone(parameters);
      }
    }
    return {maxReward, bestParameters};
  };

  return {discrete};
})();


if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = RandomSearch;
}