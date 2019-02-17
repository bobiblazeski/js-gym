const assert = require('assert');

const N  = require('../static/nial');
const add = N.add;

describe.only('add()', () => {

  describe('scalar', () => {
    it('should return 7', function() {
      const actual = add(2, 5);
      const expected = 7;
      assert.deepStrictEqual(actual, expected);
    });
  });

  describe('vector', () => {
    it('should return [7]', () => {
      const actual = add([2], 5);
      const expected = [7];
      assert.deepStrictEqual(actual, expected);
    });

    it('should return [7]', () => {
      const actual = add([2], [5]);
      const expected = [7];
      assert.deepStrictEqual(actual, expected);
    });

    it('should return [7, 4]', () => {
      const actual = add([2, -1], 5);
      const expected = [7, 4];
      assert.deepStrictEqual(actual, expected);
    });

    it('should return [7, 4]', () => {
      const actual = add([2, -1], [5]);
      const expected = [7, 4];
      assert.deepStrictEqual(actual, expected);
    });

    it('should return [7, 4]', () => {
      const actual = add([2, 1], [5, 3]);
      const expected = [7, 4];
      assert.deepStrictEqual(actual, expected);
    });

    it('should throw', () => {
      const actual = add([2, 1], [5, 3]);
      const expected = [7, 4];
      assert.throws(() => add([3,2,2], [2, 2]));
    });
  });

  describe('matrix', () => {
    it('should add matrix and scalar', () => {
      const actual = add([[2, 1], [5, 3]], 10);
      const expected = [[12, 11], [15, 13]];
      assert.deepStrictEqual(actual, expected);
    });

    it('should add matrix and 1 element vector', () => {
      const actual = add([[2, 1], [5, 3]], [10]);
      const expected = [[12, 11], [15, 13]];
      assert.deepStrictEqual(actual, expected);
    });

    it('should add matrix & vector', () => {
      const actual = add([[2, 1], [5, 3]], [10, 20]);
      const expected = [[12, 21], [15, 23]];
      assert.deepStrictEqual(actual, expected);
    });

    it('should add matrix[n, m] & matrix[n, m]', () => {
      const actual = add([[2, 1], [5, 3]], 
        [[10, 20], [30, 40]]);
      const expected = [[12, 21], [35, 43]];
      assert.deepStrictEqual(actual, expected);
    });

    it('should add matrix[m, n] & matrix[m, n]', () => {
      const actual = add([[2, 1], [5, 3]], 
        [[10, 20], [30, 40]]);
      const expected = [[12, 21], [35, 43]];
      assert.deepStrictEqual(actual, expected);
    });

    it('should add matrix[1, n] & matrix[m, n]', () => {
      const m = [[2, 1]];
      const n = [[10, 20], [30, 40]];
      const actual = add(m, n);
      const expected = [[12, 21], [32, 41]];
      assert.deepStrictEqual(actual, expected);
    });

    it('should add matrix[m, 1] & matrix[m, n]', () => {
      const m = [[2], [1]];
      const n = [[10, 20], [30, 40]];
      const actual = add(m, n);
      const expected = [[12, 22], [31, 41]];
      assert.deepStrictEqual(actual, expected);
    });

    it('should add matrix[m, 1] & matrix[1, n]', () => {
      const m = [[2], [1]];
      const n = [[10, 20, 30, 40]];
      const actual = add(m, n);
      const expected = [[12, 22, 32, 42],
                        [11, 21, 31, 41]];
      assert.deepStrictEqual(actual, expected);
    });
  });

  describe('tensor', () => {
    it('should add tensor and scalar', () => {
      const m = [
        [[1, 2],
         [3, 4],
         [5, 6]],
        [[11, 12],
         [13, 14],
         [15, 16]],
      ];
      const n = 10;
      const actual = add(m, n);
      const expected = [
        [[11, 12],
         [13, 14],
         [15, 16]],
        [[21, 22],
         [23, 24],
         [25, 26]],
      ];
      assert.deepStrictEqual(actual, expected);
    });

    it('should add tensor & single element vector', () => {
      const m = [
        [[1, 2],
         [3, 4],
         [5, 6]],
        [[11, 12],
         [13, 14],
         [15, 16]],
      ];
      const n = [10];
      const actual = add(m, n);
      const expected = [
        [[11, 12],
         [13, 14],
         [15, 16]],
        [[21, 22],
         [23, 24],
         [25, 26]],
      ];
      assert.deepStrictEqual(actual, expected);
    });

    it('should add tensor & vector', () => {
      const m = [
        [[1, 2],
         [3, 4],
         [5, 6]],
        [[11, 12],
         [13, 14],
         [15, 16]],
      ];
      const n = [10, 20];
      const actual = add(m, n);
      const expected = [
        [[11, 22],
         [13, 24],
         [15, 26]],
        [[21, 32],
         [23, 34],
         [25, 36]]
      ];
      assert.deepStrictEqual(actual, expected);
    });

    it('should add tensor & matrix', () => {
      const m = [
        [[1, 2],
         [3, 4],
         [5, 6]],
        [[11, 12],
         [13, 14],
         [15, 16]],
      ];
      const n = [
        [10, 20], 
        [30, 11],
        [21, 31]
      ];
      const actual = add(m, n);
      const expected = [
        [[11, 22],
        [33, 15],
        [26, 37]],
       [[21, 32],
        [43, 25],
        [36, 47]]
      ];
      assert.deepStrictEqual(actual, expected);
    });

    it('should add tensor & matrix', () => {
      const m = [
        [[1, 2],
         [3, 4],
         [5, 6]],
        [[11, 12],
         [13, 14],
         [15, 16]],
      ];
      const n = [
        [10, 20], 
        [30, 11],
        [21, 31]
      ];
      const actual = add(m, n);
      const expected = [
        [[11, 22],
        [33, 15],
        [26, 37]],
       [[21, 32],
        [43, 25],
        [36, 47]]
      ];
      assert.deepStrictEqual(actual, expected);
    });

    it('should add tensor[m, 1, n] & matrix[g,1]', () => {
      const m = [
        [[1, 2, 3]],
        [[11, 12, 13]],
      ];
      const n = [
        [10, 20, 30], 
        [30, 11, 22],
        [21, 31, 17]
      ];
      const actual = add(m, n);
      const expected = [
        [[11, 22, 33],
         [31, 13, 25],
         [22, 33, 20]],
        [[21, 32, 43],
         [41, 23, 35],
         [32, 43, 30]]
      ];
      assert.deepStrictEqual(actual, expected);
    });

    it('should throw when adding tensor & matrix', () => {
      const m = [
        [[1, 2],
         [3, 4],
         [5, 6]],
        [[11, 12],
         [13, 14],
         [15, 16]],
      ];
      const n = [
        [10, 20, 30],
        [11, 21, 31]
      ];
      assert.throws(() => add(m, n));
    });

    it('should add two tensors', () => {
      const m = [
        [[1, 2],
         [3, 4],
         [5, 6]],
        [[11, 12],
         [13, 14],
         [15, 16]],
      ];
      const n = [
        [[-1, -2],
         [-3, -4],
         [-5, -6]],
        [[-11, -12],
         [-13, -14],
         [-15, -16]],
      ];
      const actual = add(m, n);
      const expected = [
        [[0, 0],
         [0, 0],
         [0, 0]],
        [[0, 0],
         [0, 0],
         [0, 0]]
      ];
      assert.deepStrictEqual(actual, expected);
    });

    it('should add two tensors', () => {
      const m = [
        [[1, 2],
         [3, 4],
         [5, 6]],
        [[11, 12],
         [13, 14],
         [15, 16]],
      ];
      const n = [
        [[1, 2]],
        [[11, 12]],
      ];
      const actual = add(m, n);
      const expected = [
        [[ 2,  4],
         [ 4,  6],
         [ 6,  8]],
        [[22, 24],
         [24, 26],
         [26, 28]]
      ];
      assert.deepStrictEqual(actual, expected);
    });

    it('should throw when adding tensors (2,3,2) (2,1,3)', () => {
      const m = [
        [[1, 2],
         [3, 4],
         [5, 6]],
        [[11, 12],
         [13, 14],
         [15, 16]],
      ];
      const n = [
        [[1, 2, 3]],
        [[11, 12, 13]],
      ];
      assert.throws(() => add(m, n));
    });

  });
  
});