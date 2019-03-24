
const Util =  (function () {
   if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    ({API, socket} = {      
      API: require('./api'),
      socket: require('socket.io-client')
        .connect('http://127.0.0.1:5000', {
          reconnect: true,
          transports: ['websocket'],
        }),
    });
   } else {
    socket = io.connect('http://' + document.domain + ':' + location.port);
   };

  socket.on('connect', function () {
    console.log('Socket.IO Connected!');
  });
  
  const deferred = {};

  const envInfo = async (envName) => {
    const instanceId = await API.environmentCreate(envName);
    const observationSpace = await API.observationSpaceInfo(instanceId);
    const actionSpace = await API.actionSpaceInfo(instanceId);
    const maxSteps =  await API.maxEpisodeSteps(instanceId);    
    return {instanceId, observationSpace, actionSpace, maxSteps};
  };

  const run = async (envName, agent, maxEpisodes, render) => {
    if (!socket.connected) {
      return setTimeout(run, 100, envName, agent, maxEpisodes, render);
    }
    const env = await envInfo(envName);
    const {maxReward, bestParameters} = await agent(env, maxEpisodes, render);
    await API.environmentClose(env.instanceId);
    console.log({envName, env, maxEpisodes, maxReward, bestParameters});
  };

  const play = async (envName, agent, maxEpisodes, render, saved) => {
    if (!socket.connected) {
      return setTimeout(play, 100, envName, agent, maxEpisodes, render, saved);
    }
    const env = await envInfo(envName);    
    await agent(env, maxEpisodes, render, saved);
    await API.environmentClose(env.instanceId);    
  };

  const stepResponse = async (instanceId, action, render) => {
    return new Promise((resolve, reject) => {
      socket.emit('step', [instanceId, action, render]);
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
  };

  socket.on('stepResponse', data => deferred.resolve(data));
  socket.on('error', err => console.log(err) ||  deferred.reject(err));
  socket.on('connect', () => console.log('Connnected'));

  return {    
    play,    
    run,
    socket,
    stepResponse,    
  }
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = Util;
}
