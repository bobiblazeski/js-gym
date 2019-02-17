const assert = require('assert');

const N  = require('../static/nial');
const shape = N.shape;

describe('shape()', function() {
  it('should return []', function() {
    assert.deepStrictEqual(shape(4), []);
  });

  it('should return [2]', function() {
    assert.deepStrictEqual(shape([1 , 2]), [2]);
  });

  it('should return [2, 3]', function() {
    const x = [
      [1 , 2, 3],
      [4 , 5, 5],
    ];
    const res = [2, 3];
    assert.deepStrictEqual(shape(x), res);
  });

  it('should return [2 , 3, 4]', function() {
    const x = [
      [[1 , 2, 3, 4],
       [4 , 5, 6, 7],
       [8 , 9, 0, 1]],
      [[1 , 2, 3, 4],
       [4 , 5, 6, 7],
       [8 , 9, 0, 1]],
    ];
    const res = [2, 3, 4];
    assert.deepStrictEqual(shape(x), res);
  });

  it('should throw for jagged arrays', function() {
    const x = [
      [1 , 2, 3],
      [4 , 5],
    ];
    assert.throws(() => shape(input));
  });
});
