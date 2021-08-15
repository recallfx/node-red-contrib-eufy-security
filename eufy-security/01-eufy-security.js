module.exports = function (RED) {
  "use strict";
  // require any external libraries we may need....
  const { EufySecurity, PropertyName } = require("eufy-security-client");
  const eventsDefinition = require("./events");
  const commands = require("./commands");
  const { safeStringify, EVENT_COMMAND_RESULT } = require("./utils");

  class EufyConfigNode {
    constructor(config) {
      RED.nodes.createNode(this, config);

      this.connectionConfig = {
        country: config.country,
        language: config.language,
        trustedDeviceName: config.trustedDeviceName,
        eventDurationSeconds: Number(config.eventDurationSeconds),
        p2pConnectionSetup: Number(config.p2pConnectionSetup),
        pollingIntervalMinutes: Number(config.pollingIntervalMinutes),
        acceptInvitations: config.acceptInvitations === "true",
        username: this.credentials?.username,
        password: this.credentials?.password,
      };

      const missingCredentials = ["username", "password"].filter(
        (property) => !this.credentials || !this.credentials[property]
      );

      if (missingCredentials.length > 0) {
        this.warn("Missing credentials: " + missingCredentials.join(", "));
      }
    }

    getConfig() {
      return this.connectionConfig;
    }
  }

  RED.nodes.registerType("eufy-config", EufyConfigNode, {
    credentials: {
      username: { type: "text" },
      password: { type: "password" },
    },
  });

  class EufySecurityNode {
    constructor(config) {
      RED.nodes.createNode(this, config);

      // Store local copies of the node configuration (as defined in the .html)
      this.topic = config.topic;
      this.events = config.events || [];
      this.eufyConfigNodeId = config.eufyConfig
      this.initialised = false;
      this.status({});

      const eufyConfigNode = RED.nodes.getNode(this.eufyConfigNodeId);
      if (eufyConfigNode) {
        // respond to inputs....
        this.on("input", this.onNodeInput.bind(this));
        this.on("close", this.onNodeClose.bind(this));

        this.initialise();
      } else {
        this.status({ fill: "red", shape: "dot", text: "Not configured" });
        this.error("Eufy config missing");
      }
    }

    async initialise() {
      this.initialised = false;
      this.status({ fill: "grey", shape: "dot", text: "Initialising" });

      const eufyConfigNode = RED.nodes.getNode(this.eufyConfigNodeId);
      const driverConnectionConfig = eufyConfigNode.getConfig();

      /** @type {EufySecurity} */
      this.driver = new EufySecurity(driverConnectionConfig, RED.log);

      // driver events
      this.driver.on("connect", () => {
        this.status({ fill: "green", shape: "dot", text: "Connected" });
      });

      this.driver.on("close", () => {
        this.status({ fill: "red", shape: "dot", text: "Disconnected" });
      });

      // listen to events based on selection in node config
      eventsDefinition
        .filter((item) => this.events.includes(item.event))
        .forEach((item) => {
        this.driver.on(item.event, (...payload) => {
          this.sendPayload(item.event, item.handler(payload));
        });
      });

      this.status({ fill: "grey", shape: "dot", text: "Initialised" });

      this.initialised = true;

      await this.connect();
    }

    async connect() {
      if (this.initialised && !this.driver.isConnected()) {
        this.status({ fill: "yellow", shape: "dot", text: "Connecting" });
        await this.driver.connect();
      }
    }

    disconnect() {
      if (this.initialised) {
        this.driver.close();
      }
    }

    async onNodeInput(msg) {
      const { payload } = msg;
      const {
        command,
        stationSN,
        deviceSN,
        name,
        value,
        verifyCode,
        seconds,
        p2pConnectionType,
        channel,
      } = payload;

      if (this.initialised) {
        try {
          switch (command) {
            case commands.SET_STATION_PROPERTY:
              await this._setStationProperty(stationSN, name, value);
              break;
            case commands.SET_DEVICE_PROPERTY:
              await this._setDeviceProperty(deviceSN, name, value);
              break;
            case commands.GET_CONFIG:
              this.sendCommandResult(command, this._getConfig());
              break;
            case commands.GET_VERSION:
              this.sendCommandResult(command, this.driver.getVersion());
              break;
            case commands.IS_PUSH_CONNCETED:
              this.sendCommandResult(command, this.driver.isPushConnected());
              break;
            case commands.IS_CONNECTED:
              this.sendCommandResult(command, this.driver.isConnected());
              break;
            case commands.CONNECT:
              this.sendCommandResult(
                command,
                await this.driver.connect(verifyCode)
              );
              break;
            case commands.CLOSE:
              this.sendCommandResult(command, this.driver.close());
              break;
            case commands.SET_CAMERA_MAX_LIVESTREAM_DURATION:
              this.sendCommandResult(
                command,
                this.driver.setCameraMaxLivestreamDuration(seconds)
              );
              break;
            case commands.GET_CAMERA_MAX_LIVESTREAM_DURATION:
              this.sendCommandResult(
                command,
                this.driver.getCameraMaxLivestreamDuration()
              );
              break;
            case commands.REFRESH_DATA:
              this.sendCommandResult(command, await this.driver.refreshData());
              break;
            case commands.IS_STATION_CONNECTED:
              this.sendCommandResult(
                command,
                this.driver.isStationConnected(stationSN)
              );
              break;
            case commands.CONNCET_TO_STATION:
              this.sendCommandResult(
                command,
                await this.driver.connectToStation(stationSN, p2pConnectionType)
              );
              break;
            case commands.GET_STATION:
              this.sendCommandResult(
                command,
                this.driver.getStation(stationSN)
              );
              break;
            case commands.GET_STATIONS:
              this.sendCommandResult(command, this.driver.getStations());
              break;
            case commands.GET_STATION_DEVICE:
              this.sendCommandResult(
                command,
                this.driver.getStationDevice(stationSN, channel)
              );
              break;
            case commands.GET_DEVICE:
              this.sendCommandResult(command, this.driver.getDevice(deviceSN));
              break;
            case commands.GET_DEVICES:
              this.sendCommandResult(command, this.driver.getDevices());
              break;
            default:
              throw new Error("Unknown command");
          }
        } catch (error) {
          this.sendCommandErrorResult(command, error);
        }
      }
    }

    async _setStationProperty(stationSN, name, value) {
      if (!Object.values(PropertyName).includes(name)) {
        this.warn(`Cannot set unknown station property: "${name}"`);
        return;
      }

      await this.driver.setStationProperty(stationSN, name, value);
    }

    async _setDeviceProperty(deviceSN, name, value) {
      if (!Object.values(PropertyName).includes(name)) {
        this.warn(`Cannot set unknown device property: "${name}"`);
        return;
      }

      await this.driver.setDeviceProperty(deviceSN, name, value);
    }

    _getConfig() {
      const result = this.driver.getConfig();

      delete result.username;
      delete result.password;

      return result;
    }

    sendPayload(event, data) {
      this.send({
        topic: this.topic,
        payload: {
          event,
          data,
        },
      });
    }

    sendCommandResult(command, result) {
      this.send({
        topic: this.topic,
        payload: {
          event: EVENT_COMMAND_RESULT,
          command,
          result,
        },
      });
    }

    sendCommandErrorResult(command, error) {
      this.send({
        topic: this.topic,
        payload: {
          event: EVENT_COMMAND_RESULT,
          command,
          error,
        },
      });
    }

    onNodeClose() {
      this.disconnect();
    }
  }

  RED.nodes.registerType("eufy-security", EufySecurityNode);
};
