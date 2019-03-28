const {WIDTH, HEIGHT, STATE_SIZE, ACTION_SIZE} = require('./constants');

const model = (tf) => {
  const makeActor = () => tf.sequential({
    layers: [
      tf.layers.reshape({
        targetShape: [WIDTH, HEIGHT, 1], 
        inputShape:[STATE_SIZE],
      }),
      tf.layers.conv2d({
        filters: 32, 
        kernelSize: [3, 3],
        activation: 'relu',
      }),
      tf.layers.maxPooling2d([2, 2]),
      tf.layers.conv2d({
        filters: 32, 
        kernelSize: [3, 3],
        activation: 'relu',
      }),
      tf.layers.maxPooling2d([2, 2]),
      tf.layers.conv2d({
        filters: 32, 
        kernelSize: [3, 3],
        activation: 'relu',
      }),
      tf.layers.maxPooling2d([2, 2]), // [1, 7, 7, 32] 1568
      tf.layers.reshape({targetShape: [1568]}),
      tf.layers.dense({units: 32, activation: 'relu'}),
      tf.layers.dense({units: ACTION_SIZE, activation: 'softmax'}),
    ],
  });
  
  // Can't use 'LeakyReLU' due to https://github.com/tensorflow/tfjs/issues/1093
  const makeCritic = () => {
    const stateInput = tf.input({shape: [STATE_SIZE]});
    const actionInput = tf.input({shape: [ACTION_SIZE]});
  
    const r1 =  tf.layers.reshape({
      targetShape: [WIDTH, HEIGHT, 1],
    }).apply(stateInput);
    const c1 = tf.layers.conv2d({
      filters: 32, 
      kernelSize: [3, 3],
      activation: 'relu',
    }).apply(r1);
    const m1 = tf.layers.maxPooling2d([2, 2]).apply(c1);
    const c2 = tf.layers.conv2d({
      filters: 32, 
      kernelSize: [3, 3],
      activation: 'relu',
    }).apply(m1);
    const m2 = tf.layers.maxPooling2d([2, 2]).apply(c2);
    const c3 = tf.layers.conv2d({
      filters: 32, 
      kernelSize: [3, 3],
      activation: 'relu',
    }).apply(m2);
    const m3 = tf.layers.maxPooling2d([2, 2]).apply(c3);
    const r2 = tf.layers.reshape({targetShape: [1568]}).apply(m3);
    const d2 = tf.layers.dense({units: 20, activation: 'softmax'}).apply(r2);  
    const concat = tf.layers.concatenate().apply([d2, actionInput]);
    const output = tf.layers.dense({units: 1}).apply(concat);
    const model = tf.model({inputs: [stateInput, actionInput], outputs: output});
    return model;
  }

  return {makeActor, makeCritic};
}


module.exports = model;