
import * as N from 'nial';

class RandomSearch {
  constructor(stateSize, actionNo) {    
    this.shape = [actionNo, stateSize]
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
    if (done && epReward > this.maxReward) {
      this.maxReward = epReward;
      this.bestParameters = N.clone(this.parameters);
      this.parameters = this.createParameters();
    }
  }

  createParameters() {
    return N.sub(N.mul(N.randomUniform(this.shape), 2), 1);
  }
}

export default RandomSearch;