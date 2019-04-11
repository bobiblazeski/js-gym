const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const render = true;

const play = async () => {
  const env  = new TetnetEnv('output', 'score');
  env.reset();
  while (true) {
    const action = env.randomAction();
    const {observation, reward, done} = env.step(action, render);
    console.log({observation, reward, done});
    await sleep(500);
    if (done) break;
  }
}

play();
