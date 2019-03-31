const path = require('path');
const moment = require('moment');
const express =  require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const fs = require('fs');

app.use(express.static(path.join(__dirname, '../../static/')));

const PORT = 3000;

const tf = require('@tensorflow/tfjs-node');
const {
  DDPG, 
  ARS, 
  lib: {OUNoise, FileBuffer},
} = require('../../dist/agents.node');
// const tf = require('@tensorflow/tfjs-node-gpu');
// const {DDPG} = require('../../dist/agents.gpu');

const N = require('nial');

const {makeActor, makeCritic} = require('./model')(tf);
const {ACTION_SIZE, STATE_SIZE, DDPG_HP} = require('./constants');
const buffer = new FileBuffer(DDPG_HP.f)
const ddpg = new DDPG(ACTION_SIZE, makeActor, makeCritic, DDPG_HP,buffer);
const ars = new ARS(STATE_SIZE, ACTION_SIZE);

const WEIGHTS_FOLDER = `${process.cwd()}/save/weights/`;
const START_WEIGHTS = process.argv[2]; // '03291258'
                       
if (START_WEIGHTS) {
  ddpg.load(WEIGHTS_FOLDER+START_WEIGHTS)
    .then(() => {
      console.log('Weights loaded: ', WEIGHTS_FOLDER+START_WEIGHTS);
      server.listen(PORT, () => console.log(`Listening on ${PORT}`));
    }, () => {
      console.log('Unable to load DDPG weights.');
      process.exit(1);
    });
} else {
  console.log('Starting with random weights.');
  server.listen(PORT, () => console.log(`Listening on ${PORT}`));
}

//server.listen(PORT, () => console.log(`App listening on port ${PORT}`));

const sigmoid = t =>  1/(1+Math.pow(Math.E, -t));

io.on('connection', function (socket) {  
  console.log('connection');
  const r = 0.05;
  socket.on('act', function (state) {
    //ars.act(state).then((action) => {
    ddpg.act(state, false).then((action) => {
      const uNoise = N.randn([ACTION_SIZE]);
      const withNoise = N.add(N.mul(action, 1-r), N.mul(uNoise, r));
      //socket.emit('action', p);
      // console.log(action);
      const p = action.map(sigmoid);
      //console.log(p.map(p => p.toFixed(2)));
      socket.emit('action', p);
      //socket.emit('action', action);
    });  
  });

  socket.on('step', function (stepInfo) {
    const [envStep, other] = stepInfo;
    //ars.step(envStep, other).then(() => {
    ddpg.step(envStep, other).then(() => {
      socket.emit('step', {});
    });
  });
});

const saveArs = (serialized, infix) => {
  const fileName = process.cwd() +`/save/ars/${infix}.json`;
  fs.writeFile(fileName, serialized, (err) => err && console.log(err));
}


setInterval(() => {
  const path = `${WEIGHTS_FOLDER}${moment().format('MMDDhhmm')}`; 
  ddpg.save(path).then(() => console.log(`Weights saved `, path));
  //saveArs(ars.serialize(), moment().format('MMDDhhmm'));
}, 120000)


