const Util =  require('./static/lib/util');

const RandomPlay = require('./static/agents/random.play');
const RandomSearch = require('./static/agents/random.search');
const HillClimbing = require('./static/agents/hill.climbing');
const ARS = require('./static/agents/ars');
const DDPG = require('./static/agents/ddpg');

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
  // await Util.run('BipedalWalker-v2', ARS.continuous, 32 * 2000, false);

  console.log('DDPG');
  await Util.run('BipedalWalker-v2', DDPG.continuous, 1000, false);
  process.exit();
}

start();


