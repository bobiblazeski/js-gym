const MkEnv = (() => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
  
  
  const KEYS = {
    subzero: Object.values(KEY_CODES.subzero),
    kano: Object.values(KEY_CODES.kano),
  };
  
  const getIndices = (action, threshold, topN) => {
    const indices = action.reduce((r, e, i) => 
        e > threshold ? r.concat(i) : r, []);
    const sorted = indices.sort((l,r) => action[r] - action[l]);
    return sorted.slice(0, topN);
  };

  const getKeyCodes = (action, threshold, topN) => {
    const kanoIndices = getIndices(action.kano, threshold, topN);
    const subzeroIndices = getIndices(action.subzero, threshold, topN);
    //console.log({kanoIndices, subzeroIndices});
    const kanoKeyCodes = kanoIndices.map(i => KEYS.kano[i]);
    const subzeroKeyCodes = subzeroIndices.map(i => KEYS.subzero[i]);
    return kanoKeyCodes.concat(subzeroKeyCodes);
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

  const getState = async (model) => {
    const result = tf.tidy(() => {
      const gameCanvas = document.getElementById('mk');
      const iData = tf.browser.fromPixels(gameCanvas, 3);
      const resized = tf.image.resizeBilinear(iData, STATE_SHAPE).toFloat();
      // Normalize the image
      const offset = tf.scalar(255.0);
      const normalized = tf.scalar(1.0).sub(resized.div(offset));

      const features =model.predict(normalized.expandDims(0));
      return features.reshape([11520]); // 3*3*1280=11520
    });
    const data = await result.data();
    return Array.from(data);    
  };

  const MAX_STEPS = 200;

  const MODEL_PATH = 'http://localhost:3000/mobilenet/model.json';

  const THRESHOLD = 0.5;
  const TOP_N = 2;
  const SLEEP_MS = 120;
  const FIGHTERS = [{ name: 'Subzero' }, { name: 'Kano' }];

  class MultiPlayer {
    constructor(fighters=FIGHTERS) {
      this.done = true;
      this.reward = {subzero: 0, kano: 0};
      this.options = makeOptions(
        (rewards) => this.__onAttack__(rewards),
        (rewards) => this.__gameEnd__(rewards),
        fighters,
      );
      this.inputSize = STATE_SHAPE;
      this.outputSize = KEYS.length;
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
      this.subzeroX = mk.game.fighters[0]._position.x;
      this.kanoX = mk.game.fighters[1]._position.x;
      const state = await getState(this.model);      
      return state;
    }

    async step(action) {
      if (this.done) {
        throw 'Trying to step into done environment';
      } else if (this.gameEnd) {
        console.log('Game End.');
        this.done = true;
        return {
          observation: await getState(this.model),
          reward: this.reward,
          done: this.done,
        };
      }
      const keyCodes = getKeyCodes(action, THRESHOLD, TOP_N);
      keyCodes.forEach(keyCode => dispatch('keydown', keyCode));
      await sleep(this.sleep);
      keyCodes.forEach(keyCode => dispatch('keyup', keyCode));
      if (++this.stepNo >= MAX_STEPS && !this.done) {
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
        }
      }
      //  else if (!this.reward.subzero && !this.reward.kano) {
      //   const subzeroX = mk.game.fighters[0]._position.x;
      //   const kanoX = mk.game.fighters[1]._position.x;
      //   // Closing distance reward

      //   if (Math.abs(subzeroX-this.subzeroX) > 10
      //       && Math.abs()) {
      //     this.reward.subzero = 0.005;
      //   }
        
        
      //   if (this.stalling < 0) {
      //     this.done =true;
      //     this.reward = {subzero: -1, kano: -1};
      //     console.log('Defeat by stalling: MUTUAL');
      //   }
      // }
      const reward = this.reward;
      this.reward = {subzero: 0, kano: 0};      
      return {
        observation: await getState(this.model),
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
        } else {
          console.log('Victory by KO: SUBZERO');
        }        
      }
      console.log(`onGameEnd ${JSON.stringify(this.reward, null, 2)}`);
    }
  }

  return {MultiPlayer};
})();
