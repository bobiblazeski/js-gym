const Util = require('./static/lib/util');
const N = require('nial');
const {
  ARS, 
  DDPG, 
  RandomPlay, 
  RandomSearch, 
  HillClimbing
} = require('./dist/agents.node');

const start  = async () => {
  if (!Util.socket.connected) {
    return setTimeout(start, 100);
  }
  

  const cartpole = Algo => async (env, maxEpisodes, render) => {
    const {instanceId, observationSpace, actionSpace, maxSteps} = env;
    const inputSize = observationSpace.shape[0];
    const outputSize = 1;
    const agent = new Algo(inputSize, outputSize);
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
        agent.step({prevState, action, reward, observation, done},
          {stepNo, epReward});
        ++stepNo;             
        if (done) break;
      }
      console.log(`Ep:${epNo}, Reward:${epReward.toFixed(2)}, Step: ${stepNo}`);      
    }
    return {maxReward};
  };

  const bipedal = Algo => async (env, maxEpisodes, render) => {
    const {instanceId, observationSpace, actionSpace, maxSteps} = env;
    const inputSize = observationSpace.shape[0];
    const outputSize = actionSpace.shape[0];
    const agent = new Algo(inputSize, outputSize);
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
        agent.step({prevState, action, reward, observation, done},
          {stepNo, epReward});
        ++stepNo;             
        if (done) break;
      }
      console.log(`Ep:${epNo}, Reward:${epReward.toFixed(2)}, Step: ${stepNo}`);      
    }
    return {maxReward};
  };

  console.log('RandomPlay');
  await Util.run('CartPole-v0', cartpole(RandomPlay), 100, false);
  console.log('RandomSearch');
  await Util.run('CartPole-v0', cartpole(RandomSearch), 100, false);
  console.log('HillClimbing');
  await Util.run('CartPole-v0', cartpole(HillClimbing), 100, false);
  


  console.log('ARS Training');
  await Util.run('BipedalWalker-v2', bipedal(ARS), 100, false);
  console.log('DDPG Training');
  await Util.run('BipedalWalker-v2', bipedal(DDPG), 100, false);
}

start();

