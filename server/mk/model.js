const {STATE_SIZE, ACTION_SIZE} = require('./constants');

const model = (tf) => {
  const actor = () => tf.sequential({
    layers: [
      tf.layers.inputLayer({inputShape: STATE_SIZE}),
      tf.layers.batchNormalization(),
      tf.layers.dense({units: 36, activation:'relu'}),
      tf.layers.dense({units: 27, activation:'relu'}),
      tf.layers.dense({units: ACTION_SIZE, activation:'softmax'}),
    ],
  });

  const critic = () => {
    const stateInput = tf.input({shape: [STATE_SIZE]});
    const actionInput = tf.input({shape: [ACTION_SIZE]});
    const bn = tf.layers.batchNormalization().apply(stateInput);
    const d1 = tf.layers.dense({units: 36, activation: 'relu'})
      .apply(bn);
    const d2 = tf.layers.dense({units: 27, activation: 'relu'})
      .apply(d1);
    const d3 = tf.layers.dense({units: ACTION_SIZE,
      activation: 'softmax'}).apply(d2);
    const concat = tf.layers.concatenate().apply([d3, actionInput]);
    const d4 = tf.layers.dense({units: ACTION_SIZE, 
      activation: 'relu'}).apply(concat);
    const output = tf.layers.dense({units: 1}).apply(d4);
    return tf.model({inputs: [stateInput, actionInput], outputs: output});
  }

  return {actor, critic};
}


module.exports = model;