# node-red-contrib-eufy-security

## Description

[Node-RED][1] contribution package for [Eufy security devices][2], based on [eufy-security-client][3]

Node RED plugin wrapper around [eufy-security-client][2] library to access and control by connecting to the Eufy cloud servers and local/remote stations over P2P.

### Note

Not all events and commands have been added/tested, check list below. Full list can be found [here][4].

Tested events:
* connect
* captcha request
* close
* push connect
* push close
* push message
* device added
* station added
* station command result
* station guard mode
* station current mode
* station property changed
* station raw property changed
* device property changed
* device raw property changed

Tested commands:
* connect
* close
* get config
* get version
* is push connected
* is connected
* refresh cloud data
* get stations
* get devices
* get camera max livestream duration

Tested commands with props:
* is station connected (stationSN)
* get station (stationSN)
* get device (deviceSN)
* connect to station (stationSN)
* set camera max livestream duration (seconds)

Not tested commands:
* get station device (stationSN, channel)

## Install

Run the following command in the root directory of your Node-RED install

    npm install node-red-contrib-eufy-security

## How to use

1. Find `eufy-security` node in `network` group and add it to the flow, connect with inject node as input and debug node as output;
2. Configure `eufy-config` by providing your cloud credentials;
3. (optional) Select events to track;
4. Deploy flow;
5. If all configured correctly you should see `Connected` under the node;
6. This node will send events as objects to output:

```
{
  pyload: {
    event,
    station,
    device,
    result,
    currentMode,
    command,
    error,
  }
}
```

Suported events:
* connect
* close
* push connect
* push close
* push message
* station added
* station removed
* device added
* device removed
* device connect
* device close
* tfa request
* captcha request
* connection error
* cloud livestream start
* cloud livestream stop
* station livestream start
* station livestream stop
* station download start
* station download finish
* station command result
* station rtsp url
* station guard mode
* station current mode
* station property changed
* station raw property changed
* station alarm event
* device property changed
* device raw property changed
* device crying detected
* device sound detected
* device pet detected
* device motion detected
* device person detected
* device rings
* device locked
* device open

Also you can send commands to this node in this form:

```
{
  pyload: {
    command,
    stationSN,
    deviceSN,
    name,
    value,
    verifyCode,
    seconds,
    p2pConnectionType,
    channel,
  }
}
```

 Supported commands with arguments (? means optional):
* `set station property` (stationSN, name, value)
* `set device property` (deviceSN, name, value)
* `get config`
* `get version`
* `is push connected`
* `is connected`
* `connect` (?loginOptions)
* `close`
* `set camera max livestream duration` (seconds)
* `get camera max livestream duration`
* `refresh cloud data`
* `is station connected` (stationSN)
* `connect to station` (stationSN, p2pConnectionType)
* `get station` (stationSN)
* `get stations`
* `get station device` (stationSN, channel)
* `get device` (deviceSN)
* `get devices`
* `get image` (deviceSN, value) //value is a pic_url

[1]:https://nodered.org
[2]:https://us.eufylife.com/collections/security
[3]:https://github.com/bropat/eufy-security-client
[4]:https://github.com/bropat/eufy-security-client/blob/8f2f8b352fd4bcd0ffd5b1f754c85a1df69c376c/src/interfaces.ts#L45C31-L45C31