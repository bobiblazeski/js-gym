const Util = require('../static/lib/util');
const ARS = require('../static/agents/ars');

const continuous = async (env, maxEpisodes, render) => {
  const {instanceId, observationSpace, actionSpace, maxSteps} = env;
  const stateSize = observationSpace.shape[0];
  const actionSize = actionSpace.shape[0];
  const ars = new ARS(stateSize, actionSize);
  let maxReward = -Infinity;
  for (const epNo of N.til(maxEpisodes)) {      
    let epReward = 0, observation, reward, done;    
    observation = await API.environmentReset(instanceId);
    let stepNo = 0
    while (stepNo < maxSteps) {
      let action = await ars.act(observation);        
      const prevState = observation;
      ({observation, reward, done} =
        await Util.stepResponse(instanceId, action, render));        
      reward = Math.max(reward, -1);        
      done = done ? 1. : 0.;             
      epReward += reward;     
      ars.step(done, epReward);
      ++stepNo;             
      if (done) break;
    }
    console.log(`Ep:${epNo}, Reward:${epReward.toFixed(2)}, Step: ${stepNo}`);
    if (epReward > maxReward) {
      maxReward =  epReward;
      await ars.save(epNo);
    } else if (epNo % 10 === 0) {
      await ars.save('last');        
    }
  }
  return {maxReward};
};

const start  = async () => {
  if (!Util.socket.connected) {
    return setTimeout(start, 100);
  }
  console.log('Training DDPG');
  await Util.run('BipedalWalker-v2', continuous, 100000, false);
  process.exit();
}

start();  