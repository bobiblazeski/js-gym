(function () {  
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const play = async (env, maxEpisodes,maxSteps) => {
    const outputSize = env.outputSize;
    let maxReward = -Infinity;
    const uid = new ShortUniqueId();
    for (const epNo of N.til(maxEpisodes)) {
      const remoteAgent = false;// Math.random() < 0.5;
      console.log('remoteAgent',remoteAgent);
      let epId = uid.randomUUID(14);
      let epReward = {kano: 0, subzero:0}, observation, reward, done;    
      observation = await env.reset();
      let stepNo = 0, startDate = new Date();
      while (stepNo < maxSteps && !done) {
        let action = await act(observation);
        
        if (env.done) break;
        const prevState = observation;
        ({observation, reward, done} = await env.step(action));        
        //console.log(`${epNo} ${stepNo} ${sameArray(prevState, observation)}`);
        done = done ? 1. : 0.;             
        epReward.kano += reward.kano;
        epReward.subzero += reward.subzero;
        await step({prevState, action, reward, observation, done},
             {stepNo, epReward, epId});
        ++stepNo;
        if (done) break;
      }
      console.log(`Ep:${epNo}, Kano: ${epReward.kano.toFixed(2)}`,
        `Subzero:${epReward.subzero.toFixed(2)}`,
        `Step: ${stepNo} Time ${new Date() - startDate}`);   
    }
    sleep(5000);
    location.reload();
    return {maxReward};
  };

  const train = true;
  const deferred = {act:{}, step: {}};
  
  const act = async (state) => {
    return new Promise((resolve, reject) => {
      socket.emit('act', state, train);
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
    const mkBasicEnv = new MkEnv.MultiPlayer();
    play(mkBasicEnv, 1, 1000);
  });
  socket.on('action', action => deferred.act.resolve(action));
  socket.on('step', () => deferred.step.resolve());
  
    
}());
