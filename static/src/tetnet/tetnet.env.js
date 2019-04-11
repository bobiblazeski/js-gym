const TetnetEnv = (() => {
  const emptyGrid = [
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0],
  ];

  const shapes = {
    I: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    J: [[2,0,0], [2,2,2], [0,0,0]],
    L: [[0,0,3], [3,3,3], [0,0,0]],
    O: [[4,4], [4,4]],
    S: [[0,5,5], [5,5,0], [0,0,0]],
    T: [[0,6,0], [6,6,6], [0,0,0]],
    Z: [[7,7,0], [0,7,7], [0,0,0]]
  };

  const params = {
    done: false,
    grid: emptyGrid,
    currentShape: {x: 0, y: 0, shape: undefined},
    upcomingShape: null,
    score: 0,
    rndSeed: 1,
    bag: [],
    bagIndex: 0,
    draw: true,
    movesTaken: 0,
    moveLimit: 500,
    grid: emptyGrid,
    result:  {lose: false, moved: true, rowsCleared: 0},
  };

  var done,
      grid,
      currentShape,
      upcomingShape,
      score,
      rndSeed,
      bag,
      bagIndex,
      draw,
      movesTaken,
      moveLimit;

  const colors = ["F92338", "C973FF", "1C76BC", "FEE356", "53D504", "36E0FF", "F8931D"];

  function applyShape() {
    for (var row = 0; row < currentShape.shape.length; row++) {
      for (var col = 0; col < currentShape.shape[row].length; col++) {
        if (currentShape.shape[row][col] !== 0) {
          grid[currentShape.y + row][currentShape.x + col] = currentShape.shape[row][col];
        }
      }
    }
  }

  function removeShape() {
    for (var row = 0; row < currentShape.shape.length; row++) {
      for (var col = 0; col < currentShape.shape[row].length; col++) {
        if (currentShape.shape[row][col] !== 0) {
          grid[currentShape.y + row][currentShape.x + col] = 0;
        }
      }
    }
  }

  function nextShape() {
    bagIndex += 1;
    if (bag.length === 0 || bagIndex == bag.length) {
      generateBag();
    }
    if (bagIndex == bag.length - 1) {
      var prevSeed = rndSeed;
      upcomingShape = randomProperty(shapes);
      rndSeed = prevSeed;
    } else {
      upcomingShape = shapes[bag[bagIndex + 1]];
    }
    currentShape.shape = shapes[bag[bagIndex]];
    currentShape.x = Math.floor(grid[0].length / 2) - Math.ceil(currentShape.shape[0].length / 2);
    currentShape.y = 0;
  }

  const update = (render, stateId, scoreId) => {
    moveDown();
    if (render) {
      output(stateId);
      updateScore(scoreId);
    }
    ++movesTaken;
    if (movesTaken > moveLimit) {
      done = true;
    }
  }

  /**
   * Moves the current shape down if possible.
   * @return {Object} The results of the movement of the piece.
   */
  function moveDown() {
      removeShape();
      currentShape.y++;
      if (collides(grid, currentShape)) {
        currentShape.y--;
        applyShape();
        nextShape();
        clearRows();
        if (collides(grid, currentShape)) {
          done = true;
        }
      }
      if (done) return;
      applyShape();
      score++;
    }

  // Moves the current shape to the left if possible.
  function moveLeft() {
      removeShape();
      currentShape.x--;
      if (collides(grid, currentShape)) {
        currentShape.x++;
      }
      applyShape();
    }

  // Moves the current shape to the right if possible.
  function moveRight() {
    removeShape();
    currentShape.x++;
    if (collides(grid, currentShape)) {
      currentShape.x--;
    }
    applyShape();
  }

  // Rotates the current shape clockwise if possible.
  function rotateShape() {
    removeShape();
    currentShape.shape = rotate(currentShape.shape, 1);
    if (collides(grid, currentShape)) {
      currentShape.shape = rotate(currentShape.shape, 3);
    }
    applyShape();
  }

  const swapShape = characterPressed =>  () => {
    removeShape();
		currentShape.shape = shapes[characterPressed.toUpperCase()];
		applyShape();
  }

  const ACTIONS = [
    rotateShape,
    moveDown,
    moveLeft,
    moveRight,
    swapShape('I'),
    swapShape('J'),
    swapShape('L'),
    swapShape('O'),
    swapShape('S'),
    swapShape('T'),
    swapShape('Z'),
  ];

  // Clears any rows that are completely filled.
  function clearRows() {
    var rowsToClear = [];
    for (var row = 0; row < grid.length; row++) {
      var containsEmptySpace = false;
      for (var col = 0; col < grid[row].length; col++) {
        if (grid[row][col] === 0) {
          containsEmptySpace = true;
        }
      }
      if (!containsEmptySpace) {
        rowsToClear.push(row);
      }
    }
    if (rowsToClear.length == 1) {
      score += 400;
    } else if (rowsToClear.length == 2) {
      score += 1000;
    } else if (rowsToClear.length == 3) {
      score += 3000;
    } else if (rowsToClear.length >= 4) {
      score += 12000;
    }
    var rowsCleared = clone(rowsToClear.length);
    for (var toClear = rowsToClear.length - 1; toClear >= 0; toClear--) {
      grid.splice(rowsToClear[toClear], 1);
    }
    while (grid.length < 20) {
      grid.unshift([0,0,0,0,0,0,0,0,0,0]);
    }
    return rowsCleared;
  }

  // Applies the current shape to the grid.
  function applyShape() {
    for (var row = 0; row < currentShape.shape.length; row++) {
      for (var col = 0; col < currentShape.shape[row].length; col++) {
        if (currentShape.shape[row][col] !== 0) {
          grid[currentShape.y + row][currentShape.x + col] = currentShape.shape[row][col];
        }
      }
    }
  }

  // Removes the current shape from the grid.
  function removeShape() {
    for (var row = 0; row < currentShape.shape.length; row++) {
      for (var col = 0; col < currentShape.shape[row].length; col++) {
        if (currentShape.shape[row][col] !== 0) {
          grid[currentShape.y + row][currentShape.x + col] = 0;
        }
      }
    }
  }

  // Cycles to the next shape in the bag.
  function nextShape() {
    bagIndex += 1;
    if (bag.length === 0 || bagIndex == bag.length) {
      generateBag();
    }
    if (bagIndex == bag.length - 1) {
      var prevSeed = rndSeed;
      upcomingShape = randomProperty(shapes);
      rndSeed = prevSeed;
    } else {
      upcomingShape = shapes[bag[bagIndex + 1]];
    }
    currentShape.shape = shapes[bag[bagIndex]];
    currentShape.x = Math.floor(grid[0].length / 2) - Math.ceil(currentShape.shape[0].length / 2);
    currentShape.y = 0;
  }

  // Generates the bag of shapes.
  function generateBag() {
    bag = [];
    var contents = "";
    for (var i = 0; i < 7; i++) {
      var shape = randomKey(shapes);
      while(contents.indexOf(shape) != -1) {
        shape = randomKey(shapes);
      }
      bag[i] = shape;
      contents += shape;
    }
    bagIndex = 0;
  }
  
  const reset = () => {
    ({
      done,
      grid,
      currentShape,
      upcomingShape,
      score,
      rndSeed,
      bag,
      bagIndex,
      draw,
      movesTaken,
      moveLimit
    } = params);
    generateBag();
 	  nextShape();
  }

  /**
   * Determines if the given grid and shape collide with one another.
   * @param  {Grid} scene  The grid to check.
   * @param  {Shape} object The shape to check.
   * @return {Boolean} Whether the shape and grid collide.
   */
  function collides(scene, object) {
    for (var row = 0; row < object.shape.length; row++) {
      for (var col = 0; col < object.shape[row].length; col++) {
        if (object.shape[row][col] !== 0) {
          if (scene[object.y + row] === undefined || scene[object.y + row][object.x + col] === undefined || scene[object.y + row][object.x + col] !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function rotate(matrix, times) {
    for (var t = 0; t < times; t++) {
      matrix = transpose(matrix);
      for (var i = 0; i < matrix.length; i++) {
        matrix[i].reverse();
      }
    }
    return matrix;
  }

  function transpose(array) {
    return array[0].map(function(col, i) {
      return array.map(function(row) {
        return row[i];
      });
    });
  }

  function output(outputId) {
    if (draw) {
      var output = document.getElementById(outputId);
      var html = "<h1>TetNet</h1><h5>Evolutionary approach to Tetris AI</h5>var grid = [";
      var space = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
      for (var i = 0; i < grid.length; i++) {
        if (i === 0) {
          html += "[" + grid[i] + "]";
        } else {
          html += "<br />" + space + "[" + grid[i] + "]";
        }
      }
      html += "];";
      for (var c = 0; c < colors.length; c++) {
        html = replaceAll(html, "," + (c + 1), ",<font color=\"" + colors[c] + "\">" + (c + 1) + "</font>");
        html = replaceAll(html, (c + 1) + ",", "<font color=\"" + colors[c] + "\">" + (c + 1) + "</font>,");
      }
      output.innerHTML = html;
    }
  }

  function updateScore(scoreId) {
    if (draw) {
      var scoreDetails = document.getElementById(scoreId);
      var html = "<br /><br /><h2>&nbsp;</h2><h2>Score: " + score + "</h2>";
      html += "<br /><b>--Upcoming--</b>";
      for (var i = 0; i < upcomingShape.length; i++) {
        var next =replaceAll((upcomingShape[i] + ""), "0", "&nbsp;");
        html += "<br />&nbsp;&nbsp;&nbsp;&nbsp;" + next;
      }
      for (var l = 0; l < 4 - upcomingShape.length; l++) {
        html += "<br />";
      }
      for (var c = 0; c < colors.length; c++) {
        html = replaceAll(html, "," + (c + 1), ",<font color=\"" + colors[c] + "\">" + (c + 1) + "</font>");
        html = replaceAll(html, (c + 1) + ",", "<font color=\"" + colors[c] + "\">" + (c + 1) + "</font>,");
      }
     html += "<br />Moves: " + movesTaken + "/" + moveLimit; 
      html = replaceAll(replaceAll(replaceAll(html, "&nbsp;,", "&nbsp;&nbsp;"), ",&nbsp;", "&nbsp;&nbsp;"), ",", "&nbsp;");
      scoreDetails.innerHTML = html;
    }
  }

  /**
   * Returns the current game state in an object.
   * @return {State} The current game state.
   */
  function getState() {
    var state = {
      grid: clone(grid),
      currentShape: clone(currentShape),
      upcomingShape: clone(upcomingShape),
      bag: clone(bag),
      bagIndex: clone(bagIndex),
      rndSeed: clone(rndSeed),
      score: clone(score)
    };
    return state;
  }

  /**
  * Clones an object.
  * @param  {Object} obj The object to clone.
  * @return {Object}     The cloned object.
  */
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
  * Returns a random property from the given object.
  * @param  {Object} obj The object to select a property from.
  * @return {Property}     A random property.
  */
  function randomProperty(obj) {
    return(obj[randomKey(obj)]);
  }

  /**
  * Returns a random property key from the given object.
  * @param  {Object} obj The object to select a property key from.
  * @return {Property}     A random property key.
  */
  function randomKey(obj) {
    var keys = Object.keys(obj);
    var i = seededRandom(0, keys.length);
    return keys[i];
  }

  function replaceAll(target, search, replacement) {
    return target.replace(new RegExp(search, 'g'), replacement);
  }

  /**
  * Returns a random number that is determined from a seeded random number generator.
  * @param  {Number} min The minimum number, inclusive.
  * @param  {Number} max The maximum number, exclusive.
  * @return {Number}     The generated random number.
  */
  function seededRandom(min, max) {
    max = max || 1;
    min = min || 0;

    rndSeed = (rndSeed * 9301 + 49297) % 233280;
    var rnd = rndSeed / 233280;

    return Math.floor(min + rnd * (max - min));
  }

  const randomInt = (min_, max_) => {
    let min = Math.ceil(min_), max = Math.floor(max_);
    return Math.floor(Math.random() * (max - min)) + min;
  };

  const isValidAction = action => {
    if (!Number.isInteger(action) || action < 0 || action >= ACTIONS.length) {
      throw `Action must be int between 0 & ${ACTIONS.length}: ${action}`;
    }
  }

  const canStep = (done, action) => {
    if (done) throw `Can't step into done environment`;
    isValidAction(action);
  }

  const getObservation = state => {
    return {
      grid: clone(grid),
      currentShape: clone(currentShape),
      upcomingShape: clone(upcomingShape),
    };
  }

  class TetnetEnv {
    constructor(stateId, scoreId) {
      this.stateId = stateId;
      this.scoreId =  scoreId;
    }

    reset () {
      reset();
      return getObservation(getState());
    }

    step (action, render) {
      canStep(done, action);

      const oldScore = score;
      draw = render;
      ACTIONS[action]();
      update(render, this.stateId, this.scoreId);
      const observation = getObservation(getState());
      const reward = score - oldScore;
      return {
        observation,
        reward,
        done,
      };
    }

    randomAction () {
      return randomInt(0, ACTIONS.length);
    }

  } 
  return TetnetEnv;
})();
