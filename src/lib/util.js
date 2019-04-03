const sample = (array, size) => {
  const results = [],
        sampled = {};
  while(results.length<size && results.length<array.length) {
    const index = Math.trunc(Math.random() * array.length);
    if(!sampled[index]) {
      results.push(array[index]);
      sampled[index] = true;
    }
  }
  return results;
}

const sigmoid = t =>  1/(1+Math.pow(Math.E, -t));

const softmax = arr => {
  const C = Math.max(...arr);
  const d = arr.map(y => Math.exp(y - C)).reduce((a, b) => a + b);
  return arr.map(value => Math.exp(value - C) / d);
}

export {sample, sigmoid, softmax};