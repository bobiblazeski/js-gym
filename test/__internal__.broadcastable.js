const assert = require('assert');

const N  = require('../static/nial');
const broadcastable = N.__internal__.broadcastable;

describe('__internal__.broadcastable()', function() {
  it('should return true', function() {
    assert(broadcastable([2], []));
    assert(broadcastable([3], [3]));

    assert(broadcastable([2, 3], []));
    assert(broadcastable([2, 3], [3]));

    assert(broadcastable([2, 1], [1, 2]));
    assert(broadcastable([2, 3], [1, 3]));

    assert(broadcastable([2, 1, 3], [2, 3, 1]));
    assert(broadcastable([2, 1, 3], [2, 3]));
  });

  it('should return false', function() {
    assert(!broadcastable([2], [3]));
    assert(!broadcastable([2, 3], [3, 2]));
    assert(!broadcastable([2, 2, 3], [2, 3, 1]));
    assert(!broadcastable([2, 4, 3], [2, 3]));
  });
});
