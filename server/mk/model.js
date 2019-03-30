const {STATE_SIZE, ACTION_SIZE} = require('./constants');

const model = (tf) => {
  const makeActor = () => tf.sequential({
    layers: [
      tf.layers.dense({units: 32, activation: 'relu', inputShape: STATE_SIZE}),
      tf.layers.dense({units: 16, activation: 'relu'}),
      tf.layers.dense({units: ACTION_SIZE, activation: 'softmax'}),
    ],
  });
  
  // Can't use 'LeakyReLU' due to https://github.com/tensorflow/tfjs/issues/1093
  const makeCritic = () => {
    const stateInput = tf.input({shape: [STATE_SIZE]});
    const actionInput = tf.input({shape: [ACTION_SIZE]});
  
    const d1 = tf.layers.dense({units: 32, activation: 'relu'})
                 .apply(stateInput);
    const d2 = tf.layers.dense({units: 16, activation: 'relu'}).apply(d1);
    const concat = tf.layers.concatenate().apply([d2, actionInput]);
    const d3 = tf.layers.dense({units: 16, activation: 'relu'}).apply(concat);
    const output = tf.layers.dense({units: 1}).apply(d3);
    const model = tf.model({inputs: [stateInput, actionInput], outputs: output});
    return model;
  }

  return {makeActor, makeCritic};
}


module.exports = model;