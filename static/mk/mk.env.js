const MkEnv = (() => {
  const argMax = arr => arr.map((x, i) => [x, i])
                           .reduce((r, a) => (a[0] > r[0] ? a : r))[1];
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const setLife = (container, life) => container.style.width = life + '%';
  document.onkeydown = (e)  => e.keyCode === 32 && window.location.reload();

  const KEY_CODES = {
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
  const KEYS = Object.values(KEY_CODES);// [39, 37, 38, 40, 16, 65, 83, 68, 70]

  const randomInt = (min_, max_) => {
    let min = Math.ceil(min_), max = Math.floor(max_);
    return Math.floor(Math.random() * (max - min)) + min;
  };
  
  const makeOptions = (attackCb) => {
    return {
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
          // 'game-end': (fighter) => console.log('Game End', fighter),
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

    const gameCanvas = document.getElementById('mk');
    if (!gameCanvas) {
      console.log('Canvas is not initilized');
    } 
  }

  const SCALE = 0.1;

  const getImageData = () => {
    const gameCanvas = document.getElementById('mk');
    const stateCanvas = document.getElementById('state');
    const stateContext = stateCanvas.getContext('2d');
    stateContext.scale(SCALE, SCALE);
    stateContext.drawImage(gameCanvas, 0, 0);
    const imageData = stateContext.getImageData(0, 0, stateCanvas.width,
      stateCanvas.height);
    return imageData;
  }

  const getStateShape = () => {
    const stateCanvas = document.getElementById('state');
    return stateCanvas.width * stateCanvas.height;
  }

  const toGrayScale = (pixels) => {
    let res = new Array(pixels.length/4);
    const norm = 3 * 255;
		for (let i = 0; i < pixels.length; i += 4) {
      res[parseInt(i/4)] = (pixels[i] + pixels[i + 1] + pixels[i + 2])/norm;
    }
    return res;
  }

  const getState = () => {
    const imageData = getImageData();
    const pixels = toGrayScale(imageData.data);
    return pixels;
  }

  class MkEnv {
    constructor() {
      this.done = true;
      this.fighter = 0;
      this.opponent = 0;
      this.reward = 0;
      this.options = makeOptions(this.__onAttack__);
      this.inputSize = getStateShape();
      this.outputSize = KEYS.length;
    }

    async reset() {
      await startNewGame(this.options);
      sleep(1000);
      this.done = false;
      this.fighter = 100;
      this.opponent = 100;
      this.reward = 0;
      return getState();
    }

    async step(action) {
      if (this.done) throw 'Trying to step into done environment';

      const keyCode = KEYS[argMax(action)];
      document.dispatchEvent(new KeyboardEvent('keydown', {keyCode}));
      await sleep(100);
      const reward = this.reward;
      this.reward = 0;
      const observation = getState();
      return {
        observation, 
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
      this.fighter = fighter;
      this.opponent = opponent;
      console.log(this.done, this.fighter, this.opponent, this.reward);
    }

  }

  return MkEnv;
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