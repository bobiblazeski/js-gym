
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
  ARS,
  DDPG, 
  lib: {OUNoise},
} = require('../dist/agents.node');

const {actor, critic} = require('./mk/model')(tf);
const {
  ACTION_SIZE,
  STATE_SIZE,
  DDPG_HP,
} = require('./mk/constants');

const kanoDDPG = new DDPG(ACTION_SIZE, actor, critic, DDPG_HP);
const subzeroDDPG = new DDPG(ACTION_SIZE, actor, critic, DDPG_HP);
const kanoARS = new ARS(STATE_SIZE, ACTION_SIZE);

const arrSum = arr => arr.reduce((a,b) => a + b, 0);

const normalize = arr => {
  const sum = arrSum(arr);
  return arr.map(d => d / sum);
}

const prepare = arr => normalize(N.clip(arr, 0, 1));

const WEIGHTS_FOLDER = `${process.cwd()}/save/weights/`;

if (argv.subzero || argv.kano) {
  loadWeights([argv.subzero, argv.kano])
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
  const [trainSubzero, trainKano] = [ true, true];
  //   Math.random() < 0.5,
  //   Math.random() < 0.5
  // ];
  console.log('connection');
  socket.on('act', function (state, train) {
    
    Promise.all([
      subzeroDDPG.act(state, false),
      kanoDDPG.act(state, false),
    ]).then(actions => {
      const [subzero, kano] = actions;     
      const action = {subzero, kano};
      //console.log(N.sub(kano, subzero).map(d => d.toFixed(2)));
      if (true /*train && trainSubzero*/) {
        const subzeroEpsilon = subzeroDDPG.epsilon;
        const subzeroSample = prepare(subzeroNoise.sample());        
        // action.subzero = N.add(
        //   N.mul(action.subzero, 1- subzeroEpsilon),
        //   N.mul(subzeroSample, subzeroEpsilon));
        action.subzero = subzeroSample; 
      }
      if (false /*train && trainKano*/) {
        const kanoEpsilon = kanoDDPG.epsilon;        
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
      kanoDDPG.step(kanoEnvStep, other),
      subzeroDDPG.step(subzeroEnvStep, other),
    ]).then(() => {
      socket.emit('step', {});
    });
  });
});

setInterval(() => {
  const dt = 't' + moment().format('MMDDhhmm');
  const kanoPath = `${WEIGHTS_FOLDER}kano/${dt}`;
  const subzeroPath = `${WEIGHTS_FOLDER}subzero/${dt}`;
  kanoDDPG.save(kanoPath).then(() => console.log(`Saved`, kanoPath));
  subzeroDDPG.save(subzeroPath).then(() => console.log(`Saved`, subzeroPath));
}, 240000)

function loadWeights(argv) {
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
  }
  return kanoDDPG.load(kanoPath);
}
