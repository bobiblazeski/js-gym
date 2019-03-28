const replace = require('replace-in-file');
const pkg = require('../package.json');

const change = (file, pattern, replacement) => {
  console.log(file, pattern, replacement);
  try {
    const options = {
      files: file,
      from: pattern,
      to: replacement,
    };
    const changes = replace.sync(options);
    console.log('Modified files:', changes.join(', '));
  }
  catch (error) {
    console.error('Error occurred:', error);
  } 
}

change(pkg.main, '@tensorflow/tfjs', '@tensorflow/tfjs-node');
change(pkg.gpu, '@tensorflow/tfjs', '@tensorflow/tfjs-node-gpu')

