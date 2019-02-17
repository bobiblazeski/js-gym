const assert = require('assert');

const N  = require('../static/nial');
const zeros = N.zeros;

describe('zeros()', function() {
  it('[] return 0', function() {
    const res = zeros([]);
    const expected = 0;
    assert.deepStrictEqual(res, expected);
  });

  it('[4] return [0, 0, 0, 0]', function() {
    const actual = zeros([4]);
    const expected = [0, 0, 0, 0];
    assert.deepStrictEqual(actual, expected);
  });

  it('[3, 2] return [[0, 0], [0, 0],[0, 0]]', function() {
    const actual = zeros([3, 2]);
    const expected = [[0, 0], [0, 0],[0, 0]];
    assert.deepStrictEqual(actual, expected);
  });

  it('[1, 3, 2] return [[[0, 0], [0, 0],[0, 0]]]', function() {
    const actual = zeros([1, 3, 2]);
    const expected = [[[0, 0], [0, 0],[0, 0]]];
    assert.deepStrictEqual(actual, expected);
  });

  it('[1, 3, 2, 4] should throw', function() {
    assert.throws(() => zeros([1, 3, 2, 4]));
  });
});
