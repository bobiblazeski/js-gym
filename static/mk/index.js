(function () {

  const play = async (env, maxEpisodes,maxSteps) => {
    const outputSize = env.outputSize;
    let maxReward = -Infinity;
    for (const epNo of N.til(maxEpisodes)) {      
      let epReward = 0, observation, reward, done;    
      observation = await env.reset();
      let stepNo = 0, startDate = new Date();
      while (stepNo < maxSteps && !done) {
        //let action = await agent.act(observation);
        let action = await act(observation);
        //console.log(action);
        if (env.done) break;
        const prevState = observation;
        ({observation, reward, done} = await env.step(action));        
        //console.log(`${epNo} ${stepNo} ${sameArray(prevState, observation)}`);
        
        reward = Math.max(reward, -1);        
        done = done ? 1. : 0.;             
        epReward += reward;
        step({prevState, action, reward, observation, done},
             {stepNo, epReward});
        ++stepNo;
        if (done) break;
      }
      console.log(`Ep:${epNo}, Reward:${epReward.toFixed(2)}`, 
        `Step: ${stepNo} Time ${new Date() - startDate}`);   
    }
    location.reload();
    return {maxReward};
  };


  const deferred = {};
  
  const act = async (state) => {
    return new Promise((resolve, reject) => {
      socket.emit('act', state);
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
  };

  const step = (envStep, other) => {
    socket.emit('step', [envStep, other]);
  };

  const socket = io.connect('http://' + document.domain + ':' + location.port);
  
  socket.on('connect', function () {
    console.log('Socket.IO Connected!');
    const mkBasicEnv = new MkEnv.SinglePlayer();
    play(mkBasicEnv, 1, 1000);
  });
  socket.on('action', action => deferred.resolve(action));
  
    
}());
