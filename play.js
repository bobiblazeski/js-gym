const Util =  require('./static/util');

const RandomPlay = require('./static/agents/random.play');
const RandomSearch = require('./static/agents/random.search');
const HillClimbing = require('./static/agents/hill.climbing');
const ARS = require('./static/agents/ars');

const saved = require('./saves/ars/234');

Util.play('BipedalWalker-v2', ARS.play, 10, true, saved);