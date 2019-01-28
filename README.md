# js-gym
Node.js bindings for AI gym.

This project provides a local REST API to the [gym](https://github.com/openai/gym) open-source library, allowing development in Node.js.

## Installation 

To download the code and install the requirements, you can run the following shell commands:
``` sh
$ git clone https://github.com/bobiblazeski/js-gym.git
$ cd js-gym
$ npm install
$ virtualenv  -p python3 ./py/venv # optional
$ source ./py/venv/bin/activate # optional
$ pip install -r ./py/requirements.txt

```

## Getting started

This code is intended to be run locally by a single user. 
The server runs in python.

To start the server from the command line, run this:
``` sh
$ python py/gym_http_server.py
```
In a separate terminal, you can then try running the example node.js agent and see what happens:
``` sh
$ node js/linear.js
```
