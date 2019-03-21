const RandomPlay = (function() {
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    ({API, N, Util} = {
      API: require('../lib/api'),
      N: require('nial'),
      Util: require('../lib/util'),  
    }); 
  }

  const discrete = async (env, maxEpisodes, render) => {
    const {instanceId, actionSpace, maxSteps} = env;
    let maxReward = -Infinity;
    for (const epNo of N.til(maxEpisodes)) {
      let epReward = 0, observation, reward, done;
      observation = await API.environmentReset(instanceId);
      for (const stepNo of N.til(maxSteps)) {
        let action = Util.randomInt(0, actionSpace.n);
        ({observation, reward, done} =
          await Util.stepResponse(instanceId, action, render));
        epReward += reward;
        if (done) break;
      }
      if (epReward > maxReward) {
        maxReward =  epReward;
      }
    }
    return {maxReward};
  };

  return {discrete};

})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = RandomPlay;
}