const randomInt = (min_, max_) => {
  let min = Math.ceil(min_), max = Math.floor(max_);
  return Math.floor(Math.random() * (max - min)) + min;
};

class RandomPlay {
  constructor(stateSize, actionNo) {
    this.stateSize = stateSize;
    this.actionNo = actionNo;
  }

  act() {
    return randomInt(0, this.actionNo+1);
  }

  step() {}
}

export default RandomPlay;