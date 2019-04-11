
const moment = require('moment');
const N = require('nial');
const tf = require('@tensorflow/tfjs-node');
const {
  DDPG, 
  lib: {OUNoise},
} = require('../../dist/agents.node');



const {actor, critic} = require('./model')(tf);
const {
  ACTION_SIZE,
  //STATE_SIZE,
  DDPG_HP,
} = require('./constants');

const SAVE_WEIGHTS_IN_MS = 240000; // 4 minutes
const WEIGHTS_FOLDER = `${process.cwd()}/save/weights/`;

const kanoDDPG = new DDPG(ACTION_SIZE, actor, critic, DDPG_HP);
const subzeroDDPG = new DDPG(ACTION_SIZE, actor, critic, DDPG_HP);

const arrSum = arr => arr.reduce((a,b) => a + b, 0);

const normalize = arr => {
  const sum = arrSum(arr);
  return arr.map(d => d / sum);
}

const prepare = arr => normalize(N.clip(arr, 0, 1));

async function loadWeights(argv) {
  const [subzeroWeights, kanoWeights] = argv;
  const subzeroPath = subzeroWeights && `${WEIGHTS_FOLDER}kano/${subzeroWeights}`;
  const kanoPath = kanoWeights && `${WEIGHTS_FOLDER}subzero/${kanoWeights}`;
  if (subzeroWeights && kanoWeights) {
    return Promise.all([
      subzeroDDPG.load(subzeroPath),
      kanoDDPG.load(kanoPath),
    ]);
  } else if (subzeroWeights) {
    return subzeroDDPG.load(subzeroPath);
  } else if (kanoWeights) {
    return kanoDDPG.load(kanoPath);
  }
  console.log('Starting MK agents with random weights.');
}



const setup = (io, saveWeights) => {
  io.on('connection', function (socket) {
    const subzeroNoise = new OUNoise(ACTION_SIZE);
    const kanoNoise = new OUNoise(ACTION_SIZE);
    const subzeroEpsilon = subzeroDDPG.epsilon;
    const kanoEpsilon = kanoDDPG.epsilon;        
    
    console.log('connection');
    socket.on('act', function (state, train) {
  
      Promise.all([
        subzeroDDPG.act(state, false),
        kanoDDPG.act(state, false),
      ]).then(actions => {
        const [subzero, kano] = actions;     
        const action = {subzero, kano};
        if (train.subzero) {        
          const subzeroSample = prepare(subzeroNoise.sample());        
          action.subzero = N.add(
            N.mul(action.subzero, 1- subzeroEpsilon),
            N.mul(subzeroSample, subzeroEpsilon));
        }
        if (train.kano) {  
          const kanoSample = prepare(kanoNoise.sample());        
          action.kano = N.add(
            N.mul(action.kano, 1- kanoEpsilon),
            N.mul(kanoSample, kanoEpsilon));
        }
        socket.emit('action', action);
      });
    });
  
    socket.on('step', function (stepInfo) {
      const [envStep, other] = stepInfo;
      const kanoEnvStep = {
        ...envStep, 
        reward: envStep.reward.kano,
        action: envStep.action.kano,      
      };
      const subzeroEnvStep = {
        ...envStep, 
        reward: envStep.reward.subzero,
        action: envStep.action.subzero,      
      };
      Promise.all([
        kanoDDPG.step(kanoEnvStep, other),
        subzeroDDPG.step(subzeroEnvStep, other),
      ]).then(() => {
        socket.emit('step', {});
      });
    });
  });

  if (saveWeights) {
    setInterval(() => {
      const dt = 't' + moment().format('MMDDhhmm');
      const kanoPath = `${WEIGHTS_FOLDER}kano/${dt}`;
      const subzeroPath = `${WEIGHTS_FOLDER}subzero/${dt}`;
      kanoDDPG.save(kanoPath).then(() => console.log(`Saved`, kanoPath));
      subzeroDDPG.save(subzeroPath).then(() => console.log(`Saved`, subzeroPath));
    }, SAVE_WEIGHTS_IN_MS);
  }
}

const start = async (argv, io, saveWeights) => {
  try {
    await loadWeights([argv.subzero, argv.kano]);
    if (argv.subzero || argv.kano) {
      console.log(`Weights loaded: subzero:${argv.subzero} kano:${argv.kano}`);
    }
  } catch (err) {
    console.log(`Failed to load weights`, err);
  }
  setup(io, saveWeights);
}
exports.start = start;