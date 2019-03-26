(function () {
  
  const {DDPG} = Agents;

  const stateCanvas = document.getElementById('state');
  const [WIDTH, HEIGHT] = [stateCanvas.width, stateCanvas.height];
  const STATE_SHAPE = WIDTH*HEIGHT;
  const ACTION_SHAPE = 18;

  const makeActorConv = () => tf.sequential({
    layers: [
      tf.layers.reshape({
        targetShape: [WIDTH, HEIGHT, 1], 
        inputShape:[STATE_SHAPE],
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
      tf.layers.dense({units: ACTION_SHAPE, activation: 'softmax'}),
    ],
  });

  const makeActor = () => tf.sequential({
    layers: [
      tf.layers.dense({inputShape: [STATE_SHAPE], units: 30, activation: 'relu'}),
      tf.layers.dense({inputShape: [STATE_SHAPE], units: 25, activation: 'relu'}),
      tf.layers.dense({units:  ACTION_SHAPE, activation: 'softmax'}),
    ]
  });
  
  // Can't use 'LeakyReLU' due to https://github.com/tensorflow/tfjs/issues/1093
  const makeCritic = () => {
    const stateInput = tf.input({shape: [STATE_SHAPE]});
    const actionInput = tf.input({shape: [ACTION_SHAPE]});
    const fc1 = tf.layers.dense({units: 30, activation: 'relu'}).apply(stateInput);   
    const fc2 = tf.layers.dense({units: 25, activation: 'relu'}).apply(fc1);
    const concat = tf.layers.concatenate().apply([fc2, actionInput]);
    const output = tf.layers.dense({units: 1}).apply(concat);
    const model = tf.model({inputs: [stateInput, actionInput], outputs: output});
    return model;
  }
  // Can't use 'LeakyReLU' due to https://github.com/tensorflow/tfjs/issues/1093
  const makeCriticConv = () => {
    const stateInput = tf.input({shape: [STATE_SHAPE]});
    const actionInput = tf.input({shape: [ACTION_SHAPE]});
    const r1 =  tf.layers.reshape({
      targetShape: [WIDTH, HEIGHT, 1], 
      inputShape:[STATE_SHAPE],
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
    //const d1 = tf.layers.dense({units: 20, activation: 'relu'}).apply(r2);
    const d2 = tf.layers.dense({units: 20, activation: 'softmax'}).apply(r2);  
    const concat = tf.layers.concatenate().apply([d2, actionInput]);
    const output = tf.layers.dense({units: 1}).apply(concat);
    const model = tf.model({inputs: [stateInput, actionInput], outputs: output});
    return model;
  }

  const play = async (env, maxEpisodes,maxSteps=100) => {
    const inputSize = env.inputSize[0] * env.inputSize[1];
    const outputSize = env.outputSize;
    const agent = new DDPG(outputSize, makeActorConv, makeCriticConv, {
      minBufferSize: 50, updateEvery:10, batchSize: 32});
    let maxReward = -Infinity;
    for (const epNo of N.til(maxEpisodes)) {      
      let epReward = 0, observation, reward, done;    
      observation = await env.reset();
      let stepNo = 0
      while (stepNo < maxSteps) {
        let action = await agent.act(observation);
        //console.log(action);
        const prevState = observation;
        ({observation, reward, done} = await env.step(action));        
        //console.log(`${epNo} ${stepNo} ${sameArray(prevState, observation)}`);
        
        reward = Math.max(reward, -1);        
        done = done ? 1. : 0.;             
        epReward += reward;
        agent.step({prevState, action, reward, observation, done},
          {stepNo, epReward});
        ++stepNo;
        if (done) break;
      }
      console.log(`Ep:${epNo}, Reward:${epReward.toFixed(2)}, Step: ${stepNo}`);      
    }
    return {maxReward};
  };



  const mkBasicEnv = new MkEnv();
  play(mkBasicEnv, 1000, 100);
    
}());
