const { getArgumentsTransformer } = require('./utils');

const events = [
  {
    event: 'connect',
    args: [],
  },
  {
    event: 'close',
    args: [],
  },
  {
    event: 'push connect',
    args: [],
  },
  {
    event: 'push close',
    args: [],
  },
  {
    event: 'push message',
    args: ['message'],
  },
  {
    event: 'station added',
    args: ['station'],
  },
  {
    event: 'station removed',
    args: ['station'],
  },
  {
    event: 'device added',
    args: ['device'],
  },
  {
    event: 'device removed',
    args: ['device'],
  },

  {
    event: 'device connect',
    args: ['station'],
  },
  {
    event: 'device close',
    args: ['station'],
  },
  {
    event: 'tfa request',
    args: [],
  },
  {
    event: 'cloud livestream start',
    args: ['station', 'camera', 'url'],
  },
  {
    event: 'cloud livestream stop',
    args: ['station', 'camera'],
  },
  {
    event: 'station livestream start',
    args: ['station', 'device', 'metadata', 'videostream', 'audiostream'],
  },
  {
    event: 'station livestream stop',
    args: ['station', 'device'],
  },
  {
    event: 'station download start',
    args: ['station', 'device', 'metadata', 'videoStream', 'audioStream'],
  },
  {
    event: 'station download finish',
    args: ['station', 'device'],
  },
  {
    event: 'station command result',
    args: ['station', 'result'],
  },
  {
    event: 'station rtsp url',
    args: ['station', 'device', 'value', 'modified'],
  },
  {
    event: 'station guard mode',
    args: ['station', 'guardMode'],
  },
  {
    event: 'station current mode',
    args: ['station', 'currentMode'],
  },
  {
    event: 'station property changed',
    args: ['station', 'name', 'value'],
  },
  {
    event: 'station raw property changed',
    args: ['station', 'type', 'value', 'modified'],
  },
  {
    event: 'station alarm event',
    args: ['station', 'alarmEvent'],
  },
  {
    event: 'device property changed',
    args: ['device', 'name', 'value'],
  },
  {
    event: 'device raw property changed',
    args: ['device', 'type', 'value', 'modified'],
  },
  {
    event: 'device crying detected',
    args: ['device', 'state'],
  },
  {
    event: 'device sound detected',
    args: ['device', 'state'],
  },
  {
    event: 'device pet detected',
    args: ['device', 'state'],
  },
  {
    event: 'device motion detected',
    args: ['device', 'state'],
  },
  {
    event: 'device person detected',
    args: ['device', 'state', 'person'],
  },
  {
    event: 'device rings',
    args: ['device', 'state'],
  },
  {
    event: 'device locked',
    args: ['device', 'state'],
  },
  {
    event: 'device open',
    args: ['device', 'state'],
  },
];

module.exports = events.map((item) => ({
  ...item,
  handler: getArgumentsTransformer(item.args),
}));
