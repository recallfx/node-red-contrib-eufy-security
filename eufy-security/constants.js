const EVENT_COMMAND_RESULT = 'command result';
const EUFY_SECURITY_COMMANDS = {
  SET_STATION_PROPERTY: 'set station property',
  SET_DEVICE_PROPERTY: 'set device property',
  GET_CONFIG: 'get config',
  GET_VERSION: 'get version',
  IS_PUSH_CONNECTED: 'is push connected',
  IS_CONNECTED: 'is connected',
  CONNECT: 'connect',
  CLOSE: 'close',
  SET_CAMERA_MAX_LIVESTREAM_DURATION: 'set camera max livestream duration',
  GET_CAMERA_MAX_LIVESTREAM_DURATION: 'get camera max livestream duration',
  REFRESH_CLOUD_DATA: 'refresh cloud data',
  REFRESH_DATA: 'refresh data',
  IS_STATION_CONNECTED: 'is station connected',
  CONNECT_TO_STATION: 'connect to station',
  GET_STATION: 'get station',
  GET_STATIONS: 'get stations',
  GET_STATION_DEVICE: 'get station device',
  GET_DEVICE: 'get device',
  GET_DEVICES: 'get devices',
  GET_IMAGE: 'get image',
};

module.exports = {
  EVENT_COMMAND_RESULT,
  EUFY_SECURITY_COMMANDS,
};
