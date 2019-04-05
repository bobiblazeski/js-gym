module.exports = {
  STATE_SIZE: 47, // 1 + 2*5+ 2*18
  ACTION_SIZE: 18,
  DDPG_HP: {
    minBufferSize: 64,
    updateEvery: 200,
    batchSize: 64,
    epsilon: 0.90,
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