const api = require('./api');




const start = async () => {
  const envId = 'CartPole-v0';

  const instanceId = await api.environmentCreate(envId);
  console.log('instanceId: ', instanceId);
  
  const envList = await api.environmentList();
  console.log('envList', envList);
  
  const initialObservation = await api.environmentReset(instanceId);
  console.log('initialObservation', initialObservation);

  const { 
    observation, 
    reward, 
    done, 
    info 
  } = await api.environmentStep(instanceId, 1, false);
  console.log({observation, reward, done, info });

  const aInfo = await api.actionSpaceInfo(instanceId);
  console.log('aInfo', aInfo);

  const actionSample = await api.actionSpaceSample(instanceId);
  console.log('actionSample', actionSample);

  const aContains1 = await api.actionSpaceContains(instanceId, 1);
  const aContains2 = await api.actionSpaceContains(instanceId, 10);
  console.log({aContains1, aContains2});

  const obsSpaceInfo1 =  await api.observationSpaceInfo(instanceId);
  console.log('obsSpaceInfo1', obsSpaceInfo1);

  const envClosed = await api.environmentClose(instanceId);
  console.log('envClosed', envClosed);
}

start();

