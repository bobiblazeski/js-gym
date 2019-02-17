const assert = require('assert');

const N  = require('../static/nial');
const ints = N.ints;

describe('#ints()', function() {
  it('should return [0, 1, 2, 3]', function() {
    assert.deepStrictEqual(ints(4), [0, 1, 2, 3]);
  });

  it('should return []', function() {
    assert.deepStrictEqual(ints(0), []);
  });

  it('should throw for negatives, rational & infinity', function() {
    assert.throws(() => ints(-1));
    assert.throws(() => ints(11.3));
    assert.throws(() => ints(Infinity));
  });
});

