import * as N from 'nial';


const HP_HillClimbing = {
  noiseScaling: 0.1,
};

class HillClimbing {
  constructor(inputSize, outputSize, hp=HP_HillClimbing) {
    this.hp = hp;
    this.shape = [outputSize, inputSize]
    this.parameters = this.createParameters();
    this.bestParameters = N.clone(this.parameters);
    this.maxReward = -Infinity;
  }

  act(state, train=true) {
    const params = train ? this.parameters : this.bestParameters;      
    return N.dot(params, state) < 0 ? 0 : 1;
  }

  step(envStep, other) {
    const {done} = envStep;
    const {epReward} = other;
    if (done) {
      if (epReward > this.maxReward) {
        this.maxReward = epReward;
        this.bestParameters = N.clone(this.parameters);          
      }
      const noise = N.mul(this.createParameters(), this.hp.noiseScaling);
      this.parameters = N.add(this.bestParameters, noise);
    }
  }

  createParameters() {
    return N.sub(N.mul(N.randomUniform(this.shape), 2), 1);
  }    
}

export default HillClimbing;
