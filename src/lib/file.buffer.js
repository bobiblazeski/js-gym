
const fs =  require('fs');
const fsp = fs.promises;
const zlib = require('zlib');
const moment = require('moment');

import {sample} from './util'; 
const SAVE_PATH = process.cwd() +'/save/episodes/';

const rewards = (ep) => ep.reduce((s, e) => s + Math.max(e.reward, 0), 0);

const sampleEpisode = async (file, steps=1) => {
  const compressed =  await fsp.readFile(SAVE_PATH + file);
  const episode = await new Promise((resolve) => {
    zlib.unzip(compressed, (_, buffer) => {
      const json = JSON.parse(buffer.toString());
      resolve(json);
    });
  });
  // console.log(Object.keys(epi))
  const episodeSteps =sample(episode, steps);
  return episodeSteps;
}

class FileBuffer {
  constructor(batchSize=12, savePath=SAVE_PATH) {
    this.batchSize= batchSize;
    this.memory = {};
    this.savePath = savePath;    
  }  
  async add (state, action, reward, nextState, done, other) {    
    const {epId} = other;
    if (!this.memory[epId]) this.memory[epId] = [];
    this.memory[epId].push({state, action, reward, nextState, done});    
    if (done) this.flush(epId);
  }
  async sample() {
    const files = await fsp.readdir(SAVE_PATH);
    const sampleFiles = sample(files, this.batchSize);
    let experiences = [];
    for (let file of sampleFiles) {
      const episodeExperiences = await sampleEpisode(file);
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
    if (reward > 0) {
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
    return fs.readdirSync(SAVE_PATH).length;
  }
}
  
export default FileBuffer;