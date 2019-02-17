const assert = require('assert');

const N  = require('../static/nial');
const dimensions = N.__internal__.dimensions;

describe('__internal__.dimensions()', function() {
  it('[4], [] return [4]', function() {
    const res = dimensions([4], []);
    assert.deepStrictEqual(res, [4]);
  });

  it('[4], [1] return [4]', function() {
    const res = dimensions([4], [1]);
    assert.deepStrictEqual(res, [4]);
  });

  it('[1], [4] return [4]', function() {
    const res = dimensions([1], [4]);
    assert.deepStrictEqual(res, [4]);
  });

  it('[5, 4], [4] return [5, 4]', function() {
    const res = dimensions([5, 4], [4]);
    assert.deepStrictEqual(res, [5, 4]);
  });

  it('[5, 1], [7] return [5, 7]', function() {
    const res = dimensions([5, 1], [7]);
    assert.deepStrictEqual(res, [5, 7]);
  });

  it('[1, 7], [7] return [1, 7]', function() {
    const res = dimensions([1, 7], [7]);
    assert.deepStrictEqual(res, [1, 7]);
  });

  it('[5, 4], [5, 4] return [5, 4]', function() {
    const res = dimensions([5, 4], [5, 4]);
    assert.deepStrictEqual(res, [5, 4]);
  });

  it('[5, 1], [5, 4] return [5, 4]', function() {
    const res = dimensions([5, 1], [5, 4]);
    assert.deepStrictEqual(res, [5, 4]);
  });

  it('[1, 6], [5, 6] return [5, 6]', function() {
    const res = dimensions([1, 6], [5, 6]);
    assert.deepStrictEqual(res, [5, 6]);
  });

  it('[5, 4, 6], [5, 1, 6] return [5, 4, 6]', function() {
    const res = dimensions([5, 4, 6], [5, 1, 6]);
    assert.deepStrictEqual(res, [5, 4, 6]);
  });

  it('[1, 4, 1], [5, 1, 6] return [5, 4, 6]', function() {
    const res = dimensions([1, 4, 1], [5, 1, 6]);
    assert.deepStrictEqual(res, [5, 4, 6]);
  });
});
