(function () {
  
  const {ARS, DDPG} = Agents;

  const maxSteps = 100;

  const arrSum = arr => arr.reduce((a,b) => a + b, 0)

  const play = async (env, maxEpisodes) => {
    const inputSize = env.inputSize;
    const outputSize = env.outputSize;
    const agent = new DDPG(inputSize, outputSize);
    let maxReward = -Infinity;
    for (const epNo of N.til(maxEpisodes)) {      
      let epReward = 0, observation, reward, done;    
      observation = await env.reset();
      let stepNo = 0
      while (stepNo < maxSteps) {
        let action = await agent.act(observation);
        //console.log(action);
        const prevState = observation;
        console.log('state sum', arrSum(observation));
        ({observation, reward, done} = await env.step(action));        
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

  

  const mkBasicEnv = new MkEnv();
  play(mkBasicEnv, 1000);
    
}());
