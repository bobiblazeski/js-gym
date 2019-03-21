# Based on https://github.com/openai/gym-http-api/blob/master/gym_http_server.py
from flask import Flask, current_app, request, jsonify

from flask_socketio import SocketIO, emit
from flask_cors import CORS
import numpy as np

from lib.envs import Envs
from lib.errorhandler import ( InvalidUsage,
                                get_required_param,
                                get_optional_param)

app=Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

########## Error handling ##########
@app.errorhandler(InvalidUsage)
def handle_invalid_usage(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response

########## API #########
@app.route('/v1/envs/', methods=['POST'])
def env_create():
    """
    Create an instance of the specified environment

    Parameters:
        - env_id: gym environment ID string, such as 'CartPole-v0'
        - seed: set the seed for this env's random number generator(s).
    Returns:
        - instance_id: a short identifier (such as '3c657dbc')
        for the created environment instance. The instance_id is
        used in future API calls to identify the environment to be
        manipulated
    """
    env_id = get_required_param(request.get_json(), 'env_id')
    seed = get_optional_param(request.get_json(), 'seed', None)
    instance_id = envs.create(env_id, seed)
    return jsonify(instance_id = instance_id)

@app.route('/v1/envs/<instance_id>/observation_space/', methods=['GET'])
def env_observation_space_info(instance_id):
    """
    Get information (name and dimensions/bounds) of the env's
    observation_space

    Parameters:
        - instance_id: a short identifier (such as '3c657dbc')
        for the environment instance
    Returns:
        - info: a dict containing 'name' (such as 'Discrete'),
        and additional dimensional info (such as 'n') which
        varies from space to space
    """
    info = envs.get_observation_space_info(instance_id)
    for key, val in info.items():
        if isinstance(val, list) and val and isinstance(val[0], np.float32):
            info[key] = np.array(val).tolist()
    return jsonify(info = info)

@app.route('/v1/envs/<instance_id>/action_space/', methods=['GET'])
def env_action_space_info(instance_id):
    """
    Get information (name and dimensions/bounds) of the env's
    action_space

    Parameters:
        - instance_id: a short identifier (such as '3c657dbc')
        for the environment instance
    Returns:
    - info: a dict containing 'name' (such as 'Discrete'), and
    additional dimensional info (such as 'n') which varies from
    space to space
    """
    info = envs.get_action_space_info(instance_id)
    for key, val in info.items():
        if isinstance(val, list) and val and isinstance(val[0], np.float32):
            info[key] = np.array(val).tolist()
    return jsonify(info = info)

@app.route('/v1/envs/<instance_id>/max_episode_steps/', methods=['GET'])
def env_max_episode_steps(instance_id):
    """
    Get max episode stepsof the environment

    Parameters:
        - instance_id: a short identifier (such as '3c657dbc')
        for the environment instance
    Returns:
        - info: a dict containing 'name' (such as 'Discrete'),
        and additional dimensional info (such as 'n') which
        varies from space to space
    """
    max_episode_steps = envs.get_max_episode_steps(instance_id)
    return jsonify(max_episode_steps)

@app.route('/v1/envs/<instance_id>/reset/', methods=['POST'])
def env_reset(instance_id):
    """
    Reset the state of the environment and return an initial
    observation.

    Parameters:
        - instance_id: a short identifier (such as '3c657dbc')
        for the environment instance
    Returns:
        - observation: the initial observation of the space
    """
    observation = envs.reset(instance_id)
    if np.isscalar(observation):
        observation = observation.item()
    return jsonify(observation = observation)

@app.route('/v1/envs/<instance_id>/close/', methods=['POST'])
def env_close(instance_id):
    """
    Manually close an environment

    Parameters:
        - instance_id: a short identifier (such as '3c657dbc')
          for the environment instance
    """
    envs.env_close(instance_id)
    return ('', 204)
    
@socketio.on('step')
def step(data):
    instance_id, action, render = data
    [obs_jsonable, reward, done, info] = envs.step(instance_id, action, render)
    emit('stepResponse', {
      'observation': obs_jsonable,
      'reward': reward,
      'done': done,
      'info': info} )


@app.route('/')
def index():
    return current_app.send_static_file('index.html')


envs = Envs()
# start the server with the 'run()' method
if __name__ == '__main__':
    print('Open your browser at http://localhost:5000')
    socketio.run(app)
    
