# js-gym
JavaScript environment for training reinforcement learning agents.


## Installation 

To download the code and install the requirements, you can run the following shell commands:
``` sh
$ git clone https://github.com/bobiblazeski/js-gym.git
$ cd js-gym
$ npm install

```

## Getting started

This code is intended to be run locally by a single user. 
The server runs in node.js.

To start the server from the command line, run this:
``` sh
$ node server/start.js
```
If you have pretrained weights you could pass them
``` sh
$ node server/start.js --kano=t04051134 --subzero=t04051134
```

You can open your browser at http://localhost:3000/

## Sample algorithms

1. Random Play
2. Random Search
3. HillClimbing
4. Augmented Random Search
5. Deep Deterministic Policy Gradient

## Environment
Currently only supports https://github.com/mgechev/mk.js

### Action space

Action is an object containing two keys, subzero & kano.
Each key contains an array of 18 probabilities which 
represent possible actions for the users.
The sum of all actions should be ~1. 

The environment is stochastic, and uses weighted random choice to select
a move for your agent. Unless you pass one hot action.

### State space

47 floating numbers between 0 & 1


