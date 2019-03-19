
const start  = async () => {
  if (!Util.socket.connected) {
    return setTimeout(start, 100);
  }
  console.log('RandomPlay.discrete');
  await Util.run('CartPole-v0', RandomPlay.discrete, 100, false);
  console.log('RandomSearch.discrete');
  await Util.run('CartPole-v0', RandomSearch.discrete, 100, false);
  console.log('HillClimbing.discrete');
  await Util.run('CartPole-v0', HillClimbing.discrete, 100, false);

  console.log('ARS.continuous');
  await Util.run('BipedalWalker-v2', ARS.continuous, 3200, false)
}

//start();
