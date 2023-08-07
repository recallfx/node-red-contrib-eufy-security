module.exports = function (RED) {
  "use strict";
  /** @type {import('eufy-security-client')}  */
  const { EufySecurity, PropertyName } = require("eufy-security-client");
  const eventsDefinition = require("./events");
  const { transformProperties } = require("./utils");
  const {
    EVENT_COMMAND_RESULT,
    EUFY_SECURITY_COMMANDS,
  } = require("./constants");

  /**
   * @typedef {import('eufy-security-client').EufySecurity} EufySecurity
   * @typedef {import('eufy-security-client').PropertyName} PropertyName
   * @typedef {import('eufy-security-client').EufySecurityConfig} EufySecurityConfig
   * @typedef {import('eufy-security-client').LoginOptions} LoginOptions
   */

  class EufyConfigNode {
    constructor(config) {
      RED.nodes.createNode(this, config);
      /** @type {EufySecurityConfig} */
      this.connectionConfig = {
        username: this.credentials?.username,
        password: this.credentials?.password,
        country: config.country,
        language: config.language,
        trustedDeviceName: config.trustedDeviceName,
        persistentDir: undefined,
        p2pConnectionSetup: Number(config.p2pConnectionSetup),
        pollingIntervalMinutes: Number(config.pollingIntervalMinutes),
        eventDurationSeconds: Number(config.eventDurationSeconds),
        acceptInvitations: config.acceptInvitations === "true",
        stationIPAddresses: undefined,
      };

      const missingCredentials = ["username", "password"].filter(
        (property) => !this.credentials?.[property]
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
      this.eufyConfigNodeId = config.eufyConfig;
      this.initialized = false;
      this.status({});

      const eufyConfigNode = RED.nodes.getNode(this.eufyConfigNodeId);
      if (eufyConfigNode) {
        // respond to inputs....
        this.on("input", this.onNodeInput.bind(this));
        this.on("close", this.onNodeClose.bind(this));

        this.initialize();
      } else {
        this.status({ fill: "red", shape: "dot", text: "Not configured" });
        this.error("Eufy config missing");
      }
    }

    async initialize() {
      this.initialized = false;
      this.status({ fill: "grey", shape: "dot", text: "Initializing" });

      const eufyConfigNode = RED.nodes.getNode(this.eufyConfigNodeId);
      /** @type {EufySecurityConfig} */
      const driverConnectionConfig = eufyConfigNode.getConfig();
      /** @type {EufySecurity} */
      this.driver = await EufySecurity.initialize(driverConnectionConfig, RED.log);

      // driver events
      this.driver.on("connect", () => {
        this.status({ fill: "green", shape: "dot", text: "Connected" });
      });

      this.driver.on("connection error", (error) => {
        this.status({ fill: "red", shape: "dot", text: "Connection error" });
      });

      this.driver.on("tfa request", () => {
        if (!this.events.includes("tfa request")) {
          RED.log.warn("TFA request received, enter TFA code");
        }

        this.status({ fill: "yellow", shape: "dot", text: "Awaiting TFA" });
      });

      this.driver.on("captcha request", (id, captcha) => {
        if (!this.events.includes("captcha request")) {
          RED.log.warn(`Captcha request received, enter captcha (id: ${id}, captcha: ${captcha})`);
        }

        this.status({ fill: "yellow", shape: "dot", text: "Awaiting captcha" });
      });

      this.driver.on("close", () => {
        this.status({ fill: "red", shape: "dot", text: "Disconnected" });
      });

      // listen to events based on selection in node config
      eventsDefinition
        .filter((item) => this.events.includes(item.event))
        .forEach((item) => {
          this.driver.on(item.event, (...payload) => {
            // very important to pass payload as spread to handler
            this.sendPayload(item.event, item.handler(...payload));
          });
        });

      this.status({ fill: "grey", shape: "dot", text: "Initialized" });

      this.initialized = true;

      await this.connect();
    }

    async connect() {
      if (this.initialized && !this.driver.isConnected()) {
        this.status({ fill: "yellow", shape: "dot", text: "Connecting" });
        await this.driver.connect();
      }
    }

    disconnect() {
      if (this.initialized) {
        this.driver.close();
      }
    }

    async onNodeInput(msg) {
      const { payload } = msg;
      /** @type {LoginOptions} loginOptions */
      const loginOptions = payload.loginOptions;
      const {
        command,
        stationSN,
        deviceSN,
        name,
        value,
        seconds,
        p2pConnectionType,
        channel,
      } = payload;

      if (this.initialized) {
        try {
          switch (command) {
            case EUFY_SECURITY_COMMANDS.SET_STATION_PROPERTY:
              await this._setStationProperty(stationSN, name, value);
              break;
            case EUFY_SECURITY_COMMANDS.SET_DEVICE_PROPERTY:
              await this._setDeviceProperty(deviceSN, name, value);
              break;
            case EUFY_SECURITY_COMMANDS.GET_CONFIG:
              this.sendCommandResult(command, this._getConfig());
              break;
            case EUFY_SECURITY_COMMANDS.GET_VERSION:
              this.sendCommandResult(command, this.driver.getVersion());
              break;
            case EUFY_SECURITY_COMMANDS.IS_PUSH_CONNECTED:
              this.sendCommandResult(command, this.driver.isPushConnected());
              break;
            case EUFY_SECURITY_COMMANDS.IS_CONNECTED:
              this.sendCommandResult(command, this.driver.isConnected());
              break;
            case EUFY_SECURITY_COMMANDS.CONNECT:
              this.sendCommandResult(
                command,
                await this.driver.connect(loginOptions)
              );
              break;
            case EUFY_SECURITY_COMMANDS.CLOSE:
              this.sendCommandResult(command, this.driver.close());
              break;
            case EUFY_SECURITY_COMMANDS.SET_CAMERA_MAX_LIVESTREAM_DURATION:
              this.sendCommandResult(
                command,
                this.driver.setCameraMaxLivestreamDuration(seconds)
              );
              break;
            case EUFY_SECURITY_COMMANDS.GET_CAMERA_MAX_LIVESTREAM_DURATION:
              this.sendCommandResult(
                command,
                this.driver.getCameraMaxLivestreamDuration()
              );
              break;
            case EUFY_SECURITY_COMMANDS.REFRESH_DATA:
            case EUFY_SECURITY_COMMANDS.REFRESH_CLOUD_DATA:
              this.sendCommandResult(command, await this.driver.refreshCloudData());
              break;
            case EUFY_SECURITY_COMMANDS.IS_STATION_CONNECTED:
              this.sendCommandResult(
                command,
                await this.driver.isStationConnected(stationSN)
              );
              break;
            case EUFY_SECURITY_COMMANDS.CONNECT_TO_STATION:
              this.sendCommandResult(
                command,
                await this.driver.connectToStation(stationSN, p2pConnectionType)
              );
              break;
            case EUFY_SECURITY_COMMANDS.GET_STATION:
              this.sendCommandResult(
                command,
                this.driver.getStation(stationSN)
              );
              break;
            case EUFY_SECURITY_COMMANDS.GET_STATIONS:
              this.sendCommandResult(command, await this.driver.getStations());
              break;
            case EUFY_SECURITY_COMMANDS.GET_STATION_DEVICE:
              this.sendCommandResult(
                command,
                await this.driver.getStationDevice(stationSN, channel)
              );
              break;
            case EUFY_SECURITY_COMMANDS.GET_DEVICE:
              this.sendCommandResult(command, await this.driver.getDevice(deviceSN));
              break;
            case EUFY_SECURITY_COMMANDS.GET_DEVICES:
              this.sendCommandResult(command, await this.driver.getDevices());
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
          ...data,
        },
      });
    }

    sendCommandResult(command, result) {
      let transformedResult = result;

      if (result && result.properties) {
        transformedResult = transformProperties(result.properties);
      } else if (Array.isArray(result)) {
        transformedResult = result.map((item) => {
          if (item.properties) {
            return transformProperties(item.properties);
          }

          return item;
        });
      }

      // send only meaningful command result
      if (transformedResult !== undefined) {
        this.send({
          topic: this.topic,
          payload: {
            event: EVENT_COMMAND_RESULT,
            command,
            result: transformedResult,
          },
        });
      }
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