
const start  = async () => {
  if (!Util.socket.connected) {
    return setTimeout(start, 100);
  }
  // console.log('RandomPlay.discrete');
  // await Util.run('CartPole-v0', RandomPlay.discrete, 100, false);
  // console.log('RandomSearch.discrete');
  // await Util.run('CartPole-v0', RandomSearch.discrete, 100, false);
  // console.log('HillClimbing.discrete');
  // await Util.run('CartPole-v0', HillClimbing.discrete, 100, false);

  // console.log('ARS.continuous');
  // await Util.run('BipedalWalker-v2', ARS.continuous, 3200, false);
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
    }
    return {maxReward};
  };
  console.log('DDPG Training');
  await Util.run('LunarLanderContinuous-v2', continuous, 3200, false);
}

start();
