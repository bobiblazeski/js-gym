const {STATE_SIZE, ACTION_SIZE} = require('./constants');

const model = (tf) => {
  // const actor = () => tf.sequential({
  //   layers: [
  //     tf.layers.inputLayer({inputShape: STATE_SIZE}),
  //     tf.layers.batchNormalization(),
  //     tf.layers.dense({units: 32, activation:'relu'}),
  //     tf.layers.dense({units: ACTION_SIZE, activation:'sigmoid'}),
  //   ],
  // });

  const actor = () => {
    const stateInput = tf.input({shape: [STATE_SIZE]});
    const bn = tf.layers.batchNormalization().apply(stateInput);
    const d1 = tf.layers.dense({units: 32, activation: 'relu'}).apply(bn);
    const mv = tf.layers.dense({units: 4, activation: 'softmax'}).apply(d1);
    const at = tf.layers.dense({units: 5, activation: 'softmax'}).apply(d1);
    const concat = tf.layers.concatenate().apply([mv, at]);
    return tf.model({inputs: stateInput, outputs: concat});
  }
  
  const critic = () => {
    const stateInput = tf.input({shape: [STATE_SIZE]});
    const actionInput = tf.input({shape: [ACTION_SIZE]});
    const bn = tf.layers.batchNormalization().apply(stateInput);
    const d1 = tf.layers.dense({units: 32, activation: 'relu'}).apply(bn);
    const d2 = tf.layers.dense({units: ACTION_SIZE, 
      activation: 'sigmoid'}).apply(d1);
    const concat = tf.layers.concatenate().apply([d2, actionInput]);
    const d3 = tf.layers.dense({units: ACTION_SIZE, 
      activation: 'sigmoid'}).apply(concat);
    const output = tf.layers.dense({units: 1}).apply(d3);
    return tf.model({inputs: [stateInput, actionInput], outputs: output});
  }

  return {actor, critic};
}


module.exports = model;