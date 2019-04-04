
const path = require('path');
const moment = require('moment');
const express =  require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const argv = require('minimist')(process.argv.slice(2));
const N = require('nial');
app.use(express.static(path.join(__dirname, '../static/')));

const PORT = 3000;

const tf = require('@tensorflow/tfjs-node');
const {
  DDPG, 
  lib: {OUNoise},
} = require('../dist/agents.node');

const {actor, critic} = require('./mk/model')(tf);
const {
  ACTION_SIZE, 
  DDPG_HP,
} = require('./mk/constants');

const kanoAgent = new DDPG(ACTION_SIZE, actor, critic, DDPG_HP);
const subzeroAgent = new DDPG(ACTION_SIZE, actor, critic, DDPG_HP);

const arrSum = arr => arr.reduce((a,b) => a + b, 0);

const normalize = arr => {
  const sum = arrSum(arr) / 10;
  return arr.map(d => d / sum);
}

const prepare = arr => normalize(N.clip(arr, 0, 1));

const WEIGHTS_FOLDER = `${process.cwd()}/save/weights/`;

if (argv.subzero || argv.kano) {
  loadWeights(argv.subzero, argv.kano)
    .then(() => {
      console.log(`Weights loaded: subzero:${argv.subzero} kano:${argv.kano}`);
      server.listen(PORT, () => console.log(`Listening on ${PORT}`));
    }, (err) => {
      console.log('Unable to load DDPG weights.', err);
      process.exit(1);
    });
} else {
  console.log('Starting with random weights.');
  server.listen(PORT, () => console.log(`Listening on ${PORT}`));
}

io.on('connection', function (socket) {
  const subzeroNoise = new OUNoise(ACTION_SIZE);
  const kanoNoise = new OUNoise(ACTION_SIZE);  

  console.log('connection');
  socket.on('act', function (state, train) {
    const [trainSubzero, trainKano] = [
      Math.random() < 0.5,
      Math.random() < 0.5
    ];
    Promise.all([
      kanoAgent.act(state, false),
      subzeroAgent.act(state, false),
    ]).then(actions => {
      const [kano, subzero] = actions;     
      const action = {kano, subzero};
      //console.log(N.sub(kano, subzero).map(d => d.toFixed(2)));
      if (train && trainSubzero) {
        const subzeroEpsilon = subzeroAgent.epsilon;
        const subzeroSample = prepare(subzeroNoise.sample());
        action.subzero = N.add(
          N.mul(action.subzero, 1- subzeroEpsilon),
          N.mul(subzeroSample, subzeroEpsilon));
      }
      if (train && trainKano) {
        const kanoEpsilon = kanoAgent.epsilon;        
        const kanoSample = prepare(kanoNoise.sample());
        
        action.kano = N.add(
          N.mul(action.kano, 1- kanoEpsilon),
          N.mul(kanoSample, kanoEpsilon));
      }
      // console.log(kano.map(d =>  d.toFixed(2)));
      // console.log(subzero.map(d =>  d.toFixed(2)));
      // console.log(action.kano);
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
    // console.log(kanoEnvStep);
    // console.log(subzeroEnvStep);
    Promise.all([
      kanoAgent.step(kanoEnvStep, other),
      subzeroAgent.step(subzeroEnvStep, other),
    ]).then(() => {
      socket.emit('step', {});
    });
  });
});

setInterval(() => {
  const dt = 't' + moment().format('MMDDhhmm');
  const kanoPath = `${WEIGHTS_FOLDER}kano/${dt}`;
  const subzeroPath = `${WEIGHTS_FOLDER}subzero/${dt}`;
  kanoAgent.save(kanoPath).then(() => console.log(`Saved`, kanoPath));
  subzeroAgent.save(subzeroPath).then(() => console.log(`Saved`, subzeroPath));
}, 240000)

function loadWeights(subzeroWeights, kanoWeights) {
  const kanoPath = `${WEIGHTS_FOLDER}kano/${subzeroWeights}`;
  const subzeroPath = `${WEIGHTS_FOLDER}subzero/${kanoWeights}`;
  if (subzeroWeights && subzeroWeights) {
    return Promise.all([
      subzeroAgent.load(subzeroPath),
      kanoAgent.load(kanoPath),
    ]);
  } else if (subzeroWeights) {
    return subzeroAgent.load(subzeroPath);
  }
  return kanoAgent.load(kanoPath);
}
