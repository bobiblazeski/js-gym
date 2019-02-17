const assert = require('assert');

const N  = require('../static/nial');

describe('#__internal__.accessor()', function() {
  const accessor = N.__internal__.accessor;
  
  describe('0-D array', () => {
    describe('i', () => {
      it('For [] should return empty string', () => {
        const res = accessor([], ['i']);
        assert.deepStrictEqual(res, '');
      });
    });

    describe('i, j', () => {
      it('For [] should return empty string', () => {
        const res = accessor([], ['i', 'j']);
        assert.deepStrictEqual(res, '');
      });
    });
    
    describe('i, j, k', () => {
      it('For [] should return empty string', () => {
        const res = accessor([], ['i', 'j', 'k']);
        assert.deepStrictEqual(res, '');
      });  
    });
  });
  
  describe('1-d array', () => {
    describe('i', () => {
      it('For [3] should return [i]', () => {
        const res = accessor([3], ['i']);
        assert.deepStrictEqual(res, '[i]');
      });

      it('For [1] should return [0]', () => {
        const res = accessor([1], ['i']);
        assert.deepStrictEqual(res, '[0]');
      });
    });

    describe('i, j', () => {
      it('For [3] should return [j]', () => {
        const res = accessor([3], ['i', 'j']);
        assert.deepStrictEqual(res, '[j]');
      });

      it('For [1] should return [0]', () => {
        const res = accessor([1], ['i', 'j']);
        assert.deepStrictEqual(res, '[0]');
      });
    });
    
    describe('i, j, k', () => {
      it('should return [k]', () => {
        const res = accessor([3], ['i', 'j', 'k']);
        assert.deepStrictEqual(res, '[k]');
      });

      it('should return [0]', () => {
        const res = accessor([1], ['i', 'j']);
        assert.deepStrictEqual(res, '[0]');
      });
    });
  });
  
  describe('2-d array', () => {
    describe('i, j', () => {
      it('For [4, 5] should return [i][j]', () => {
        const res = accessor([4, 5], ['i', 'j']);
        assert.deepStrictEqual(res, '[i][j]');
      });

      it('For [4, 1] should return [i][j]', () => {
        const res = accessor([4, 1], ['i', 'j']);
        assert.deepStrictEqual(res, '[i][0]');
      });

      it('For [1, 4] should return [0][j]', () => {
        const res = accessor([1, 4], ['i', 'j']);
        assert.deepStrictEqual(res, '[0][j]');
      });
    });
    
    describe('i, j, k', () => {
      it('For [4, 5] should return [j][k]', () => {
        const res = accessor([4, 5], ['i', 'j', 'k']);
        assert.deepStrictEqual(res, '[j][k]');
      });

      it('For [4, 1] should return [j][0]', () => {
        const res = accessor([4, 1], ['i', 'j', 'k']);
        assert.deepStrictEqual(res, '[j][0]');
      });

      it('For [1, 4] should return [0][k]', () => {
        const res = accessor([1, 4], ['i', 'j', 'k']);
        assert.deepStrictEqual(res, '[0][k]');
      });
    });
  });

  describe('3-d array', () => {
    
    describe('i, j, k', () => {
      it('For [4, 5, 7] should return [i][j][k]', () => {
        const res = accessor([4, 5, 7], ['i', 'j', 'k']);
        assert.deepStrictEqual(res, '[i][j][k]');
      });

      it('For [4, 5, 1] should return [i][j][0]', () => {
        const res = accessor([4, 5, 1], ['i', 'j', 'k']);
        assert.deepStrictEqual(res, '[i][j][0]');
      });

      it('For [4, 1, 7] should return [i][0][k]', () => {
        const res = accessor([4, 1, 7], ['i', 'j', 'k']);
        assert.deepStrictEqual(res, '[i][0][k]');
      });

      it('For [4, 1, 1] should return [i][0][0]', () => {
        const res = accessor([4, 1, 1], ['i', 'j', 'k']);
        assert.deepStrictEqual(res, '[i][0][0]');
      });

      it('For [1, 5, 7] should return [0][j][k]', () => {
        const res = accessor([1, 5, 7], ['i', 'j', 'k']);
        assert.deepStrictEqual(res, '[0][j][k]');
      });

      it('For [1, 5, 1] should return [0][j][0]', () => {
        const res = accessor([1, 5, 1], ['i', 'j', 'k']);
        assert.deepStrictEqual(res, '[0][j][0]');
      });

      it('For [1, 1, 7] should return [0][0][k]', () => {
        const res = accessor([1, 1, 7], ['i', 'j', 'k']);
        assert.deepStrictEqual(res, '[0][0][k]');
      });

      it('For [1, 1, 1] should return [0][0][0]', () => {
        const res = accessor([1, 1, 1], ['i', 'j', 'k']);
        assert.deepStrictEqual(res, '[0][0][0]');
      });
    });
  });
});