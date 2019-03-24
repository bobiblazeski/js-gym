import * as N from 'nial';
import Normalizer from '../lib/normalizer';

const HP = {    
  learningRate: 0.02,
  nbDeltas: 8,//16,
  nbBestDeltas: 8,//16
  noise: 0.2,
};

const perturb = (params, delta, add, hpNoise) => {
  const noise = N.mul(delta, hpNoise);
  return add ? N.add(params, noise) : N.sub(params, noise);
};

const stdRewards = (positive, negative) => {
  const variance = N.variance(positive.concat(negative));        
  return Math.sqrt(variance);
};


// Sort the rollouts by max(rPos, rNeg) & select deltas with best rewards
const getRollouts = (positiveRewards, negativeRewards, deltas,
  nbDeltas, nbBestDeltas) => {
  const scores = N.til(nbDeltas).reduce((acc, i) => {
    acc[i] = Math.max(positiveRewards[i], negativeRewards[i]);
    return acc;
  }, {});
  const order = Object.keys(scores)
    .sort((a,b) => {
      return scores[b] - scores[a];
    }).slice(0, nbBestDeltas);
  return order.map((k) => {
    return [positiveRewards[k], negativeRewards[k], deltas[k]];
  });
};

const update = (params, rollouts, sigmaR, nbBestDeltas,
    learningRate) => {
  let step = N.zeros(N.shape(params));
  rollouts.forEach(([rPos, rNeg, delta]) => {
    step = N.add(step, N.mul(N.sub(rPos, rNeg), delta));
  });
  let d = learningRate / (nbBestDeltas * sigmaR);
  return N.add(params, N.mul(d, step));
}

class ARS {
  constructor(stateSize, actionSize, nbDeltas=HP.nbDeltas,
      nbBestDeltas=HP.nbBestDeltas, noise=HP.noise,
      learningRate=HP.learningRate) {
    this.learningRate = learningRate;
    this.nbDeltas = nbDeltas;
    this.nbBestDeltas = nbBestDeltas;
    this.noise = noise;
    this.normalizer = new Normalizer([stateSize]);
    this.shape = [actionSize, stateSize];
    this.parameters = N.zeros(this.shape);      
    this.startCycle();
  }

  act(state, train=true) {
    this.normalizer.observe(state);        
    const observation = this.normalizer.normalize(state);      
    const parameters = train 
      ? perturb(this.parameters, this.deltas[this.deltaNo],
            this.positive, this.noise)
      : this.parameters;      
    return N.clip(N.dot(parameters, observation), -1, 1);
  }

  step(envStep, other) {
    const {done} = envStep;
    const {epReward} = other;
    if (done) {
      (this.positive ? this.posRewards : this.negRewards).push(epReward);
      this.positive = !this.positive;        
    }
    if (this.negRewards.length === this.nbDeltas) {
      const sigmaR = stdRewards(this.posRewards, this.negRewards);
      const rollouts = getRollouts(this.posRewards, this.negRewards, 
        this.deltas, this.nbDeltas, this.nbBestDeltas);
      this.parameters = update(this.parameters, rollouts, sigmaR, 
        this.nbBestDeltas, this.learningRate);
      this.startCycle();
      console.log('ARS learning cycle finished');
    }
  }

  startCycle() {
    this.deltas = N.til(this.nbDeltas).map(() => N.randn(this.shape));
    this.posRewards = [];
    this.negRewards = [];
    this.positive = true;
    this.deltaNo = 0;
  }

  save(infix) {
    const normalizer = this.normalizer;
    const parameters = this.parameters;
    if (fs) {
      const fileName = `./saves/ars/${infix}.json`;
      fs.writeFile(fileName, JSON.stringify({
        normalizer: {
          n: normalizer.n,
          mean: normalizer.mean,
          meanDiff: normalizer.meanDiff,
          variance: normalizer.variance,
        },
        parameters,
      }, null, 2), (err) => err && console.log(err));
    }
  }
}

export default ARS;

