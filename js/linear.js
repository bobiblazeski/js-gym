const tf = require('@tensorflow/tfjs-node');

const api = require('../api');


const getAction = (parameters, observation) => {
  const p = tf.tensor([parameters]);
  const o = tf.tensor([observation]).transpose();
  return tf.matMul(p, o).dataSync()[0] < 0 ? 0 : 1 ;
}

const randomParams = (shape) => {
  return tf.randomUniform(shape).mul(2).add(-1).dataSync();
}

const addRandomNoise = (params, noiseScaling) => {
  let p = tf.tensor(params);
  let noise = tf.randomUniform(p.shape).mul(2).add(-1).mul(noiseScaling);
  return p.add(noise).dataSync();
}

const runEpisode = async (instanceId, parameters, render) => {
  let totalReward = 0;
  let observation, reward, done, info;
  observation = await api.environmentReset(instanceId);
  for (let i = 0; i < 200; ++i) {
    let action = getAction(parameters, observation);
    ({ observation, reward, done, info} = 
      await api.environmentStep(instanceId, action, render));
    totalReward += reward;
    if (done) break;
  }
  return totalReward;
}

const randomSearch = async (instanceId, render, actionShape) => {
  let bestParameters;
  let bestReward = 0;
  for (let i = 0; i < 10000; ++i) {
    let parameters = randomParams(actionShape);
    let reward = await runEpisode(instanceId, parameters, render);
    if (reward > bestReward) {
      bestReward = reward;
      bestParameters = parameters;
      if (reward == 200) {
        console.log(`Environment solved in ${i} episodes`, 
          bestParameters);
          break;
      }
    }
  }
  return {bestReward, bestParameters};
}

const hillClimbing = async (instanceId, render, actionShape) => {
  let bestReward = 0;
  let noiseScaling = 0.1;
  let bestParameters = randomParams(actionShape);
  for (let i =0; i < 10000; ++i) {
    let newParameters = addRandomNoise(bestParameters, noiseScaling);
    let reward = await runEpisode(instanceId, newParameters, render);
    if (reward > bestReward) {
      bestReward = reward;
      bestParameters = newParameters;
      if (reward == 200) {
        console.log(`Environment solved in ${i} episodes`, 
          bestParameters);
          break;
      }
    }
  }
  return {bestReward, bestParameters};
}

const envId = 'CartPole-v0';
const actionShape = [4];

const start = async(envId) => {
  const instanceId = await api.environmentCreate(envId);
  console.log('randomSearch');     
  await randomSearch(instanceId, false, actionShape);
  console.log('hillClimbing');     
  await randomSearch(instanceId, false, actionShape);

}

start(envId);