(function () {
  
  const modifiers = [
    0.8, // UP   : 38, // UpArrow
    0.5, // LEFT : 37, // LeftArrow      
    0.7, // DOWN : 40, // DownArrow
    1.0, // RIGHT: 39, // RightArrow
    0.8, // LP   : 83, // S 
    0.8, // HP   : 65, // A
    0.8, // LK   : 68, // D 
    0.8, // HK   : 70, // F
    0.5, // BLOCK: 16, // Shift
  ];
  const pseudoAgent = async (stepNo) => {
    const action = N.randomUniform([9]);
    //modifiers.forEach((m, i) => action[i] *= m);
    if (stepNo < 5) {
      for (let i = 0; i < 3; ++i) {
        if (N.max(action) > action[3]) {
          action[3] = Math.random();
        }
      }
    }
    return action;
  }
  window.observation = [];
  const play = async (env, maxEpisodes,maxSteps) => {
    const outputSize = env.outputSize;
    let maxReward = -Infinity;
    const uid = new ShortUniqueId();
    for (const epNo of N.til(maxEpisodes)) {
      const remoteAgent = true;// Math.random() < 0.5;
      console.log('remoteAgent',remoteAgent);
      let epId = uid.randomUUID(14);
      let epReward = 0, observation, reward, done;    
      observation = await env.reset();
      let stepNo = 0, startDate = new Date();
      while (stepNo < maxSteps && !done) {
        let action = await pseudoAgent(stepNo);
        if (remoteAgent) {
          action = await act(observation);
        }
        //let action = await pseudoAgent();
        //console.log(action);
        if (env.done) break;
        const prevState = observation;
        window.observation.push(observation);
        ({observation, reward, done} = await env.step(action));        
        //console.log(`${epNo} ${stepNo} ${sameArray(prevState, observation)}`);
        
        reward = Math.max(reward, -1);        
        done = done ? 1. : 0.;             
        epReward += reward;
        await step({prevState, action, reward, observation, done},
             {stepNo, epReward, epId});
        ++stepNo;
        if (done) break;
      }
      console.log(`Ep:${epNo}, Reward:${epReward.toFixed(2)}`, 
        `Step: ${stepNo} Time ${new Date() - startDate}`);   
    }
    location.reload();
    return {maxReward};
  };


  const deferred = {act:{}, step: {}};
  
  const act = async (state) => {
    return new Promise((resolve, reject) => {
      socket.emit('act', state);
      deferred.act.resolve = resolve;
      deferred.act.reject = reject;
    });
  };

  const step = async (envStep, other) => {
    return new Promise((resolve, reject) => {
      socket.emit('step', [envStep, other]);
      deferred.step.resolve = resolve;
      deferred.step.reject = reject;
    });
  };

  const socket = io.connect('http://' + document.domain + ':' + location.port);
  
  socket.on('connect', function () {
    console.log('Socket.IO Connected!');
    const mkBasicEnv = new MkEnv.SinglePlayer();
    play(mkBasicEnv, 1, 1000);
  });
  socket.on('action', action => deferred.act.resolve(action));
  socket.on('step', () => deferred.step.resolve());
  
    
}());
