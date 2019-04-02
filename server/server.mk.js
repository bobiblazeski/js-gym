
const path = require('path');
const moment = require('moment');
const express =  require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const argv = require('minimist')(process.argv.slice(2));

app.use(express.static(path.join(__dirname, '../static/')));

const PORT = 3000;

const tf = require('@tensorflow/tfjs-node');
const {
  DDPG, 
  lib: {FileBuffer},
} = require('../dist/agents.node');

const {actor, critic} = require('./mk/model')(tf);
const {
  ACTION_SIZE, 
  DDPG_HP, 
  KANO, 
  SUBZERO,
} = require('./mk/constants');
const kanoBuffer = new FileBuffer(KANO.batchSize, KANO.bufferPath);

const kanoAgent = new DDPG(ACTION_SIZE, actor, critic, DDPG_HP, kanoBuffer);
const subzeroBuffer = new FileBuffer(SUBZERO.batchSize, SUBZERO.bufferPath);
const subzeroAgent = new DDPG(ACTION_SIZE, actor, critic, DDPG_HP, subzeroBuffer);


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
  console.log('connection');
  socket.on('act', function (state) {
    const train = false;
    Promise.all([
      kanoAgent.act(state, train),
      subzeroAgent.act(state, train),
    ]).then(actions => {
      const [kano, subzero] = actions;      
      const action = {kano, subzero};
      // console.log(kano.map(d =>  d.toFixed(2)));
      // console.log(subzero.map(d =>  d.toFixed(2)));
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
