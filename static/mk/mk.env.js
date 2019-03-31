const MkEnv = (() => {
  const argMax = arr => arr.map((x, i) => [x, i])
                           .reduce((r, a) => (a[0] > r[0] ? a : r))[1];
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const setLife = (container, life) => container.style.width = life + '%';
  document.onkeydown = (e)  => e.keyCode === 32 && window.location.reload();
 
  /*
  {
    "0": 233,
    "1": 418,
    "2": 305,
    "3": 902,
    "4": 242,
    "5": 512,
    "6": 345,
    "7": 281,
    "8": 284,  
  }
  */
  
  const KEY_CODES = {    
    UP   : 38, // UpArrow
    LEFT : 37, // LeftArrow        
    DOWN : 40, // DownArrow
    RIGHT: 39, // RightArrow    
    LP   : 83, // S    
    HP   : 65, // A
    LK   : 68, // D    
    HK   : 70, // F        
    BLOCK: 16, // Shift
    // NONE : 27, // Esc (No action)
  };
  const KEYS = Object.values(KEY_CODES);

  const randomInt = (min_, max_) => {
    let min = Math.ceil(min_), max = Math.floor(max_);
    return Math.floor(Math.random() * (max - min)) + min;
  };
  
  const getIndices = (action, threshold, topN) => {
    const indices = action.reduce((r, e, i) => 
        e > threshold ? r.concat(i) : r, []);
    const sorted = indices.sort((l,r) => action[r] - action[l]);
    return sorted.slice(0, topN);
  }
  const ARENAS = Object.values(mk.arenas.types);

  const randomArena = ()  => ARENAS[Math.floor(Math.random() * ARENAS.length)];

  const makeOptions = (attackCb, gameEndCb) => {
    return {
      arena: {
          container: document.getElementById('arena'),
          arena: randomArena(),
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
              //console.log(`f ${f.getLife()} o ${o.getLife()} l ${l}`);
          },
          'game-end': (fighter) => {
             if (fighter.getName() === 'kano') {
              console.log('Game End', fighter);
             }
             gameEndCb();
          },
      },
      gameType: 'basic',
    };
  };

  const until = async (fn, ms=0) => {
    while (!fn()) {
        await sleep(ms);
    }
  }

  const startNewGame = async (options) => {
    const game = await mk.start(options);
    game.ready(() => {
      document.getElementById('loading').style.visibility = 'hidden';
      document.getElementById('arena').style.visibility = 'visible';
      document.getElementById('utils').style.visibility = 'visible';
    });
    await until(() => document.getElementById('mk'), 1000);

    if (!document.getElementById('mk')) {
      throw 'Canvas is not initilized';
    } 
  }


  const STATE_SHAPE = [96, 96];

  const getState = async (model) => {
    const result = tf.tidy(() => {
      const gameCanvas = document.getElementById('mk');
      const iData = tf.browser.fromPixels(gameCanvas, 3);
      const resized = tf.image.resizeBilinear(iData, STATE_SHAPE).toFloat();
      // Normalize the image
      const offset = tf.scalar(255.0);
      const normalized = tf.scalar(1.0).sub(resized.div(offset));

      const features =model.predict(normalized.expandDims(0));
      // console.log(features.shape); //[1, 3, 3, 1280]
      return features.reshape([11520]); // 3*3*1280=11520
    });
    const data = await result.data();
    return Array.from(data);    
  };

  const MAX_STEPS = 200;

  const MODEL_PATH = 'http://localhost:3000/mobilenet/model.json';

  const THRESHOLD = 0.5;
  const TOP_N = 2;
  const STALLING = 20;

  class SinglePlayer {
    constructor() {
      this.done = true;
      this.fighter = 0;
      this.opponent = 0;
      this.reward = 0;
      this.options = makeOptions(
        (life) => this.__onAttack__(life),
        () => this.__gameEnd__()
      );
      this.inputSize = STATE_SHAPE;
      this.outputSize = KEYS.length;
      this.sleep = 80;//Movement.constants.FRAME_RATE;
    }

    async reset() {
      if (!this.model) {
        this.model = await tf.loadLayersModel(MODEL_PATH);
      }
      this.options.arena.arena = randomArena();
      await startNewGame(this.options);
      sleep(30);
      this.done = false;
      this.fighter = 100;
      this.opponent = 100;
      this.reward = 0;
      this.stepNo = 0;
      this.stalling = STALLING;
      const state = await getState(this.model);      
      return state;
    }

    async step(action) {
      if (this.done) {
        throw 'Trying to step into done environment';
      }
      const indices = getIndices(action, THRESHOLD, TOP_N);
      console.log(this.stepNo, action.map(i => i.toFixed(2)), indices);
      indices.forEach(index => {
        const keyCode = KEYS[index];
        document.dispatchEvent(new KeyboardEvent('keydown', {keyCode}));                
      });
      await sleep(80);
      indices.forEach(index => {
        const keyCode = KEYS[index];
        document.dispatchEvent(new KeyboardEvent('keyup', {keyCode}));                
      });      
      await sleep(80);
      --this.stalling;
      if ((++this.stepNo >= MAX_STEPS && !this.done)
          ||  this.stalling < 0) {
        this.done = true;
        this.reward = -1;  
      }
      const reward = this.reward;
      this.reward = 0;
      return {
        observation: await getState(this.model), 
        reward,
        done: this.done,
      };
    }

    actionSpaceSample() {
      return randomInt(0, KEYS.length);
    }

    __onAttack__(life) {
      if (this.done) return;
      const {fighter, opponent, loss} = life;
      this.done = [fighter, opponent].includes(0);
      if (this.done) {
        this.reward = fighter === 0 ? -1 : 1;
      } else {
        this.reward = (this.fighter > fighter ? -loss : loss)/100;  
      }
      console.log(`onAttack reward ${this.reward}`);
      this.stalling = STALLING;
      this.fighter = fighter;
      this.opponent = opponent;
    }

    __gameEnd__() {
      this.stalling = STALLING;
      this.done = true;
      this.reward = 1;
    }

  }

  return {SinglePlayer};
})();
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