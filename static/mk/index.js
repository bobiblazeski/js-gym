(function () {
  const setLife = (container, life) => container.style.width = life + '%';
  document.onkeydown = (e)  => e.keyCode === 32 && window.location.reload();


  const keyCodes = {
    RIGHT: 39, // RightArrow
    LEFT : 37, // LeftArrow
    UP   : 38, // UpArrow
    DOWN : 40, // DownArrow
    BLOCK: 16, // Shift
    HP   : 65, // A
    LP   : 83, // S
    LK   : 68, // D
    HK   : 70, // F 
  };
  const keys = Object.values(keyCodes);
  // [39, 37, 38, 40, 16, 65, 83, 68, 70]
  const randomInt = (min_, max_) => {
    let min = Math.ceil(min_), max = Math.floor(max_);
    return Math.floor(Math.random() * (max - min)) + min;
  };
  const randomKey = () =>  keys[randomInt(0, keys.length)];

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  //const press = keyCode => 
  
  const makeOptions = (attackCb) => {
    return {
      arena: {
        width: 150,
        height: 100,
      },
      arena: {
          container: document.getElementById('arena'),
          arena: mk.arenas.types.THRONE_ROOM
      },
      fighters: [{ name: 'Subzero' }, { name: 'Kano' }],
      callbacks: {
          attack: function (f, o, l) {
              if (o.getName() === 'kano') {
                  setLife(document.getElementById('player2Life'), o.getLife());
              } else {
                  setLife(document.getElementById('player1Life'), o.getLife());
              }
              attackCb({
                fighter: f.getLife(),
                opponent: o.getLife(),
                loss: l,
              });
              console.log(`f ${f.getLife()} o ${o.getLife()} l ${l}`);
          },
          // 'game-end': function (fighter) {
          //   console.log('Game End', fighter);
          // },
      },
      gameType: 'basic',
    };
  };

  const startNewGame = async (options) => {
    const game = await mk.start(options);
    game.ready(() => {
      document.getElementById('loading').style.visibility = 'hidden';
      document.getElementById('arena').style.visibility = 'visible';
      document.getElementById('utils').style.visibility = 'visible';
    });
  }
  // startNewGame();
  
  class MK {
    constructor() {
      this.done = true;
      this.fighter = 0;
      this.opponent = 0;
      this.reward = 0;
      this.options = makeOptions(this.onAttack);
    }

    async reset() {
      await startNewGame(this.options);
      this.done = false;
      this.fighter = 100;
      this.opponent = 100;
      this.reward = 0;
      return [Math.random()];
    }

    async step(action) {
      if (this.done) throw 'Trying to step into done environment';

      document.dispatchEvent(new KeyboardEvent('keydown', {keyCode: action}));
      await sleep(100);
      const reward = this.reward;
      this.reward = 0;
      return {
        observation: [Math.random()], 
        reward, 
        done: this.done,
      };
    }

    onAttack(life) {
      if (this.done) return;
      const {fighter, opponent, loss} = life;
      this.done = [fighter, opponent].includes(0);
      if (this.done) {
        this.reward = fighter === 0 ? -1 : 1;
      } else {
        this.reward = (this.fighter > fighter ? -loss : loss)/100;  
      }
      this.fighter = fighter;
      this.opponent = opponent;
      console.log(this.done, this.fighter, this.opponent, this.reward);
    }
  }

  const {ARS} = Agents;

  const argMax = arr => arr.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];

  const maxSteps = 10;

  const play = async (env, maxEpisodes) => {
    const inputSize = 1;
    const outputSize = keys.length;
    const agent = new ARS(inputSize, outputSize);
    let maxReward = -Infinity;
    for (const epNo of N.til(maxEpisodes)) {      
      let epReward = 0, observation, reward, done;    
      observation = await env.reset();
      let stepNo = 0
      while (stepNo < maxSteps) {
        let action = await agent.act(observation);
        action = keys[argMax(action)];
        console.log(action);
        const prevState = observation;
        ({observation, reward, done} = await env.step(action));        
        reward = Math.max(reward, -1);        
        done = done ? 1. : 0.;             
        epReward += reward;
        agent.step({prevState, action, reward, observation, done},
          {stepNo, epReward});
        ++stepNo;             
        if (done) break;
      }
      console.log(`Ep:${epNo}, Reward:${epReward.toFixed(2)}, Step: ${stepNo}`);      
    }
    return {maxReward};
  };

  const grayscale = (pixels) => {
    let res = new Array(pixels.length/4);
    const norm = 3 * 255;
		for (var i = 0; i < pixels.length; i += 4) {
      res[parseInt(i/4)] = (pixels[i] + pixels[i + 1] + pixels[i + 2])/norm;
    }
    return res;
  }

  function resize(imageData, height, width) {
    const oc = document.createElement('canvas');
    const octx = oc.getContext('2d');
    oc.width  = width;
    oc.height = height;

    octx.drawImage(img, 0, 0, oc.width, oc.height);

  }
  const mkBasicEnv = new MK();
  play(mkBasicEnv, 1);
  

  function  getImg(scale) {
    const canvas = document.getElementsByTagName("canvas")[0]
    var ctx = canvas.getContext("2d");
    const origImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    var canvas2 = document.createElement('canvas');
    canvas2.width = parseInt(canvas.width/scale);
    canvas2.height = parseInt(canvas.height/scale);
    var ctx2 = canvas2.getContext('2d');
    ctx2.putImageData(origImageData, 0, 0);
    document.body.appendChild(canvas2);
    return ctx2.getImageData(0,0,  canvas2.width, canvas2.height);
  }
  

  
}());
/*
  const p1 = {
    RIGHT: 74, // J
    LEFT : 71, // G
    UP   : 89, // Y
    DOWN : 72, // H
    BLOCK: 16, // Shift
    HP   : 65, // A
    LP   : 83, // S
    LK   : 68, // D
    HK   : 70, // F 
  };

  const p2 = {
    RIGHT: 39, // RightArrow
    LEFT : 37, // LeftArrow
    UP   : 38, // UpArrow
    DOWN : 40, // DownArrow
    BLOCK: 17, // Ctrl 
    HP   : 80, // P
    LP   : 219,// [ Doesn't work
    LK   : 221,// ]
    HK   : 220,// \
  };
*/