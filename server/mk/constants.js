module.exports = {
  WIDTH: 70,
  HEIGHT: 70,
  STATE_SIZE: 11520,// 3*3*1280=11520
  ACTION_SIZE: 9,
  DDPG_HP: {
    minBufferSize: 32,
    updateEvery: 200,
    batchSize: 32,
    epsilon: 0.95,
    epsilonDecay: 1e-3,
    minEpsilon: 0.05,
  },
  KANO: {
    batchSize: 32,
    bufferPath: process.cwd() +'/save/episodes/kano/',
  },
  SUBZERO: {
    batchSize: 32,
    bufferPath: process.cwd() +'/save/episodes/subzero/',
  }
};