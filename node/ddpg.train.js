const Util =  require('../static/lib/util');
const DDPG = require('../static/agents/ddpg');

const continuous = async (env, maxEpisodes, render) => {
  const {instanceId, observationSpace, actionSpace, maxSteps} = env;
  const inputSize = observationSpace.shape[0];
  const outputSize = actionSpace.shape[0];
  const agent = new DDPG(inputSize, outputSize);
  let maxReward = -Infinity;
  for (const epNo of N.til(maxEpisodes)) {      
    let epReward = 0, observation, reward, done;    
    observation = await API.environmentReset(instanceId);
    let stepNo = 0
    while (stepNo < maxSteps) {
      let action = await agent.act(observation);        
      const prevState = observation;
      ({observation, reward, done} =
        await Util.stepResponse(instanceId, action, render));        
      reward = Math.max(reward, -1);        
      done = done ? 1. : 0.;             
      epReward += reward;     
      agent.step(stepNo, prevState, action, reward, observation, done,
        epReward);
      ++stepNo;             
      if (done) break;
    }
    console.log(`Ep:${epNo}, Reward:${epReward.toFixed(2)}, Step: ${stepNo}`);
    if (epReward > maxReward) {
      maxReward =  epReward;
      await agent.save(epNo);
    } else if (epNo % 10 === 0) {
      await agent.save('last');        
    }
  }
  return {maxReward};
};

const start  = async () => {
  if (!Util.socket.connected) {
    return setTimeout(start, 100);
  }
  console.log('Training DDPG');
  await Util.run('LunarLanderContinuous-v2', continuous, 100000, false);
  process.exit();
}

start();  