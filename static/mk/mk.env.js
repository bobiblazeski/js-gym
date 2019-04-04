const MkEnv = (() => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const argMax = l => l.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
  const setLife = (container, life) => container.style.width = life + '%';
  document.onkeydown = (e)  => e.keyCode === 32 && window.location.reload();
 
  const KEY_CODES = {
    subzero: {
      RIGHT: 74, // J
      LEFT : 71, // G
      UP   : 89, // Y
      DOWN : 72, // H
      BLOCK: 16, // Shift
      HP   : 65, // A
      LP   : 83, // S
      LK   : 68, // D
      HK   : 70, // F 
    },
    kano: {
      RIGHT: 39, // RightArrow
      LEFT : 37, // LeftArrow
      UP   : 38, // UpArrow
      DOWN : 40, // DownArrow
      BLOCK: 17, // Ctrl 
      HP   : 80, // P
      LP   : 219,// [ Doesn't work
      LK   : 221,// ]
      HK   : 220,// \
    },
  };

  const MOVES_MAP= {
    'STAND': [],
    'WALK': ['RIGHT'],
    'WALK_BACKWARD': ['LEFT'],
    'JUMP': ['UP'],
    'SQUAT': ['DOWN'],
    'BLOCK': ['BLOCK'],
    'HIGH_PUNCH': ['HP'],
    'LOW_PUNCH': ['LP'],
    'HIGH_KICK': ['HK'],
    'LOW_KICK': ['LK'],
    'BACKWARD_JUMP': ['LEFT', 'UP'],
    'SPIN_KICK_LEFT': ['LEFT', 'HK'],
    'FORWARD_JUMP': ['RIGHT', 'UP'],
    'SPIN_KICK_RIGHT': ['RIGHT', 'HK'],
    'UPPERCUT': ['DOWN', 'HP'],
    'SQUAT_LOW_KICK': ['DOWN', 'LK'],
    'SQUAT_HIGH_KICK': ['DOWN', 'HK'],
    'SQUAT_LOW_PUNCH': ['DOWN', 'LP'],
  }

  const MOVES = [
    "STAND",
    "WALK",
    "WALK_BACKWARD",
    "JUMP",
    "SQUAT",
    "BLOCK",
    "HIGH_PUNCH",
    "LOW_PUNCH",
    "HIGH_KICK",
    "LOW_KICK",
    "BACKWARD_JUMP",
    "SPIN_KICK_LEFT",
    "FORWARD_JUMP",
    "SPIN_KICK_RIGHT",
    "UPPERCUT",
    "SQUAT_LOW_KICK",
    "SQUAT_HIGH_KICK",
    "SQUAT_LOW_PUNCH",
  ];
  
  const getRandom = () => {
    let random = Math.random();
    return function(move) {
      random -= move;
      return random <= 0;
    };
  }

  const arrSum = arr => arr.reduce((a,b) => a + b, 0);

  const weightedRandom = action => {    
    return action.findIndex(getRandom(arrSum(action)));
  }
  
  const getKeyCodes = action => {
    const subzeroChoice = MOVES[weightedRandom(action.subzero)];
    const kanoChoice = MOVES[weightedRandom(action.kano)];
    console.log(`subzero: ${subzeroChoice}, kano: ${kanoChoice}`);
    const subzeroKeyCodes = MOVES_MAP[subzeroChoice].map(k => KEY_CODES.subzero[k]);
    const kanoKeyCodes = MOVES_MAP[kanoChoice].map(k => KEY_CODES.kano[k]);
    return subzeroKeyCodes.concat(kanoKeyCodes);
  }
  
  const ARENAS = Object.values(mk.arenas.types);

  const randomArena = ()  => ARENAS[Math.floor(Math.random() * ARENAS.length)];

  const makeOptions = (attackCb, gameEndCb, fighters) => {
    return {
      arena: {
          container: document.getElementById('arena'),
          arena: randomArena(),
      },
      fighters: fighters,
      callbacks: {
          attack: function (f, o, l) {
            const loss = l / 100;
            if (o.getName() === 'kano') {
              setLife(document.getElementById('player2Life'), o.getLife());
              attackCb({
                subzero: +loss, 
                kano: -loss, 
                subzeroHealth: f.getLife(),
                kanoHealth: o.getLife(),
              });
            } else {
              setLife(document.getElementById('player1Life'), o.getLife());
              attackCb({
                subzero: -loss, 
                kano: +loss,
                subzeroHealth: o.getLife(),
                kanoHealth: f.getLife(),
              });
            }
          },
          'game-end': (fighter) => {
             if (fighter.getName() === 'kano') {
              gameEndCb({subzero: +1, kano: -1});
             } else {
              gameEndCb({subzero: -1, kano: +1}); 
             }
          },
      },
      gameType: 'multiplayer',
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

  const dispatch = (typeArg, keyCode) => {
    document.dispatchEvent(new KeyboardEvent(typeArg, {keyCode}));
  }

  const STATE_SHAPE = [96, 96];

  // const getState = async (model) => {
  //   const result = tf.tidy(() => {
  //     const gameCanvas = document.getElementById('mk');
  //     const iData = tf.browser.fromPixels(gameCanvas, 3);
  //     const resized = tf.image.resizeBilinear(iData, STATE_SHAPE).toFloat();
  //     // Normalize the image
  //     const offset = tf.scalar(255.0);
  //     const normalized = tf.scalar(1.0).sub(resized.div(offset));

  //     const features =model.predict(normalized.expandDims(0));
  //     return features.reshape([11520]); // 3*3*1280=11520
  //   });
  //   const data = await result.data();
  //   return Array.from(data);    
  // };

  const getFighter = (index) => {
    const fighter = mk.game.fighters[index];
    return [
      fighter._life / 100,
      fighter._position.x / 600,
      fighter._position.y / 400,
      fighter._height / 60,            
      fighter._width / 30, 
    ];
  }
  const getState = (stepNo) => {
    return [stepNo/MAX_STEPS].concat(getFighter(0), getFighter(1));
  }
  const MAX_STEPS = 400;

  const MODEL_PATH = 'http://localhost:3000/mobilenet/model.json';

  const SLEEP_MS = 80;
  const FIGHTERS = [{ name: 'Subzero' }, { name: 'Kano' }];
  const STALL_LEEWAY = 30;


  class MultiPlayer {
    constructor(fighters) {
      this.fighters = fighters || FIGHTERS;
      this.done = true;
      this.reward = {subzero: 0, kano: 0};
      this.options = makeOptions(
        (rewards) => this.__onAttack__(rewards),
        (rewards) => this.__gameEnd__(rewards),
        this.fighters,
      );
      this.inputSize = STATE_SHAPE;
      this.outputSize = MOVES.length;
      this.sleep = SLEEP_MS;
    }

    async reset() {
      if (!this.model) {
        this.model = await tf.loadLayersModel(MODEL_PATH);
      }
      this.options.arena.arena = randomArena();
      await startNewGame(this.options);
      sleep(this.sleep);
      this.done = false;
      this.reward = {subzero: 0, kano: 0};
      this.subzeroHealth = 100;
      this.kanoHealth = 100;
      this.stepNo = 0;
      this.gameEnd = false;            
      return getState(this.stepNo);
    }

    async step(action) {      
      if (this.done) {
        throw 'Trying to step into done environment';
      } else if (this.gameEnd) {
        console.log('Game End.');
        this.done = true;
        //console.log(frames);
        return {
          observation: getState(this.stepNo),
          reward: this.reward,
          done: this.done,
        };
      }
      const keyCodes = getKeyCodes(action);      
      keyCodes.forEach(keyCode => dispatch('keydown', keyCode));
      await sleep(this.sleep);
      keyCodes.forEach(keyCode => dispatch('keyup', keyCode));      
      if (this.stepNo >= MAX_STEPS && !this.done) {
        this.done = true;
        // Victory by points
        if (this.kanoHealth > this.subzeroHealth) {
          this.reward.kano = +1;
          this.reward.subzero += -1;
          console.log('Victory by points: KANO');
        } else if (this.kanoHealth < this.subzeroHealth) {
          this.reward.kano += -1;
          this.reward.subzero += +1; 
          console.log('Victory by points: SUBZERO');
        } else if (this.kanoHealth + this.subzeroHealth === 200) {
          this.reward.kano = -1;
          this.reward.subzero = -1;
          console.log('Defeat by stalling: BOTH');
        }
      }      
      const reward = this.reward;
      if (!this.reward.subzero && !this.reward.kano) {
        ++this.stepNo;
      }
      this.reward = {subzero: 0, kano: 0};      
      return {
        observation: getState(this.stepNo),
        reward,
        done: this.done,
      };
    }

    __onAttack__(reward) {
      if (!this.done) {
        this.reward.kano += reward.kano;
        this.reward.subzero += reward.subzero;        
        this.subzeroHealth = reward.subzeroHealth;
        this.kanoHealth = reward.kanoHealth;   
      }
      console.log(`onAttack ${JSON.stringify(this.reward, null, 2)}`);
    }

    __gameEnd__(reward) {
      if (!this.done) {
        this.reward.kano = reward.kano;
        this.reward.subzero = reward.subzero;        
        this.gameEnd = true;
        if (reward.kano > reward.subzero) {
          console.log('Victory by KO: KANO');
        } else if (reward.kano < reward.subzero){
          console.log('Victory by KO: SUBZERO');
        }        
      }
      console.log(`onGameEnd ${JSON.stringify(this.reward, null, 2)}`);
    }
  }

  return {MultiPlayer};
})();
