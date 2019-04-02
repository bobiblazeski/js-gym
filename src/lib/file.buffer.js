const fs =  require('fs');
const fsp = fs.promises;
const zlib = require('zlib');
const moment = require('moment');

import {sample} from './util'; 
const BATCH_SIZE = 32;
const EPISODE_STEPS = 3;

const rewards = (ep) => ep.reduce((s, e) => s + Math.abs(e.reward), 0);

const sampleEpisode = async (epPath, steps) => {
  const compressed =  await fsp.readFile(epPath);
  const episode = await new Promise((resolve) => {
    zlib.unzip(compressed, (_, buffer) => {
      const json = JSON.parse(buffer.toString());
      resolve(json);
    });
  });  
  const episodeSteps =sample(episode, steps);
  return episodeSteps;
}

class FileBuffer {
  constructor(batchSize=BATCH_SIZE, savePath, steps=EPISODE_STEPS) {
    this.batchSize= batchSize;
    this.memory = {};
    this.savePath = savePath;    
    this.steps = steps;
  }  
  async add (state, action, reward, nextState, done, other) {    
    const {epId} = other;
    if (!this.memory[epId]) this.memory[epId] = [];
    this.memory[epId].push({state, action, reward, nextState, done});    
    if (done) this.flush(epId);
  }
  async sample() {
    const files = await fsp.readdir(this.savePath);
    const filesNum = Math.round(this.batchSize/this.steps);
    const sampleFiles = sample(files, filesNum);
    let experiences = [];
    for (let file of sampleFiles) {
      const episodeExperiences = await sampleEpisode(this.savePath+file, this.steps);
      experiences = experiences.concat(episodeExperiences);
    }
    return {
      states: experiences.map(x => x.state), 
      actions: experiences.map(x => x.action), 
      rewards: experiences.map(x => [x.reward]), 
      nextStates: experiences.map(x => x.nextState), 
      dones: experiences.map(x => [x.done]),
    };        
  }
  flush(epId) {
    const reward = rewards(this.memory[epId]);
    if (reward !== 0) {
      const text = JSON.stringify(this.memory[epId]);
      const path = this.makePath(reward);
      zlib.gzip(text, (_, gz) => {
        fs.writeFileSync(path, gz);
      });      
    }   
    delete this.memory[epId];
  }
  makePath(reward) {
    const timestamp = moment().format('YYYY.MM.DD-hh.mm.ss');
    return `${this.savePath}${reward.toFixed(2)}-${timestamp}.gz`;
  }
  get length() {
    return fs.readdirSync(this.savePath).length;
  }
}
  
export default FileBuffer;