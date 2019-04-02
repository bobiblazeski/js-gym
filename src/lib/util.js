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

function softmax(arr) {
  return arr.map(function(value,index) { 
    return Math.exp(value) / arr.map( function(y /*value*/){ return Math.exp(y) } ).reduce( function(a,b){ return a+b })
  })
}

export {sample, sigmoid, softmax};