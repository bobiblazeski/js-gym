const path = require('path');
const moment = require('moment');
const express =  require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, '../../static/')));

const PORT = 3000;

const tf = require('@tensorflow/tfjs-node');
const {DDPG, ARS, OUNoise} = require('../../dist/agents.node');
// const tf = require('@tensorflow/tfjs-node-gpu');
// const {DDPG} = require('../../dist/agents.gpu');

const N = require('nial');

const {makeActor, makeCritic} = require('./model')(tf);
const {ACTION_SIZE, STATE_SIZE, DDPG_HP} = require('./constants');
const ddpg = new DDPG(ACTION_SIZE, makeActor, makeCritic, DDPG_HP);


const WEIGHTS_FOLDER = `${process.cwd()}/save/`;
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

const argMax = arr => arr.map((x, i) => [x, i])
                           .reduce((r, a) => (a[0] > r[0] ? a : r))[1];
const actions = {
  '0': 0,
  '1': 0,
  '2': 0,
  '3': 0,
  '4': 0,
  '5': 0,
  '6': 0,
  '7': 0,
  '8': 0,
  '9': 0,
}
io.on('connection', function (socket) {
  console.log('connection');
  const noise = new OUNoise(ACTION_SIZE);
  //const ars = new ARS(STATE_SIZE, ACTION_SIZE);
  const r = 0.2;
  socket.on('act', function (state) {
    // // if (ddpg.buffer.length < ddpg.minBufferSize 
    // //     || Math.random() < 0.1) {      
    //   //socket.emit('action', N.randomUniform([ACTION_SIZE]));
    //   ars.act(state).then((action) => {
    //     const p = N.add(N.mul(action, 1-r), N.mul(noise.sample(), r));
    //     socket.emit('action', p);
    //   });
    // } else {
      ddpg.act(state, false).then((action) => {
        const uNoise = N.randn([ACTION_SIZE]);
        const p = N.add(N.mul(action, 1-r), N.mul(uNoise, r));
        const num = argMax(p);        
        ++actions[num.toString()];
        socket.emit('action', p);
      });
    // }    
  });

  socket.on('step', function (stepInfo) {
    const [envStep, other] = stepInfo;
    if (envStep.done) {
      noise.reset();
    }
    // ars.step(envStep, other);
    ddpg.step(envStep, other);    
    // console.log(Object.keys(envStep), Object.keys(other));
  });
});


setInterval(() => {
  console.log(JSON.stringify(actions, null, 2));
  const path = `${WEIGHTS_FOLDER}${moment().format('MMDDhhmm')}`; 
  ddpg.save(path).then(() => console.log(`Weights saved `, path));
}, 180000)



