const { promisify } = require("util");

const helper = require("node-red-node-test-helper");
const eufySecurityNode = require("../01-eufy-security.js");
const commands = require("../commands");
const { EVENT_COMMAND_RESULT } = require("../utils");

const mockSecurityClient = {
  // sync
  on: jest.fn(),
  isConnected: jest.fn().mockReturnValue(false),
  close: jest.fn(),
  getVersion: jest.fn().mockReturnValue("someVersion"),
  isPushConnected: jest.fn().mockReturnValue(true),
  setCameraMaxLivestreamDuration: jest.fn(),
  getCameraMaxLivestreamDuration: jest.fn().mockReturnValue(999),
  isStationConnected: jest.fn().mockReturnValue(true),
  getStation: jest.fn(),
  getStations: jest.fn(),
  getStationDevice: jest.fn(),
  getDevice: jest.fn(),
  getDevices: jest.fn(),
  getConfig: jest.fn().mockReturnValue({ someConfig: "value" }),

  // async
  connect: jest.fn().mockResolvedValue(true),
  refreshData: jest.fn().mockResolvedValue(),
  connectToStation: jest.fn().mockResolvedValue(),
  setStationProperty: jest.fn().mockResolvedValue(),
  setDeviceProperty: jest.fn().mockResolvedValue(),
};

jest.mock("eufy-security-client", () => {
  return {
    PropertyName: {},
    EufySecurity: jest.fn().mockImplementation(() => {
      return mockSecurityClient;
    }),
  };
});

helper.init(require.resolve("node-red"));

const helperStartServer = promisify(helper.startServer.bind(helper));
const helperStopServer = promisify(helper.stopServer.bind(helper));
const helperLoad = promisify(helper.load.bind(helper));

const configNode = {
  id: "c1",
  type: "eufy-config",
  trustedDeviceName: "eufyclient",
  country: "US",
  language: "en",
  eventDurationSeconds: 10,
  p2pConnectionSetup: "0",
  pollingIntervalMinutes: 10,
  acceptInvitations: "false",
};
const credentials = { username: "john", password: "pass" };

describe("01-eufy-security.js", () => {
  beforeEach(async () => {
    await helperStartServer();
  });

  afterEach(async () => {
    await helper.unload();
    await helperStopServer();
  });

  describe("eufy-config", () => {
    it("can load default config node", async () => {
      const flow = [{ id: "c1", type: "eufy-config" }];

      await helperLoad(eufySecurityNode, flow);

      const c1 = helper.getNode("c1");

      expect(
        c1.warn.calledWithExactly("Missing credentials: username, password")
      ).toBeTruthy();
    });

    it("can load config node with proper data", async () => {
      const flow = [configNode];

      await helperLoad(eufySecurityNode, flow, { c1: credentials });

      const c1 = helper.getNode("c1");

      expect(c1.warn.calledOnce).toBe(false);
      expect(c1.connectionConfig).toMatchObject({
        trustedDeviceName: configNode.trustedDeviceName,
        country: configNode.country,
        language: configNode.language,
        eventDurationSeconds: configNode.eventDurationSeconds,
        p2pConnectionSetup: Number(configNode.p2pConnectionSetup),
        pollingIntervalMinutes: configNode.pollingIntervalMinutes,
        acceptInvitations: configNode.acceptInvitations !== "false",

        username: credentials.username,
        password: credentials.password,
      });
    });
  });

  describe("eufy-security", () => {
    describe("non configured", () => {
      it("can load node", async () => {
        const node = {
          id: "n1",
          type: "eufy-security",
        };
        const flow = [node];

        await helperLoad(eufySecurityNode, flow);
        const n1 = helper.getNode("n1");

        expect(n1).toMatchObject({
          initialised: false,
        });

        expect(n1.error.calledWithExactly("Eufy config missing")).toBeTruthy();
        expect(
          n1.status.calledWithExactly({
            fill: "red",
            shape: "dot",
            text: "Not configured",
          })
        ).toBeTruthy();
      });
    });

    describe("fully configured", () => {
      const node = {
        id: "n1",
        type: "eufy-security",
        name: "test name",
        eufyConfig: "c1",
        topic: "some topic",
        events: ["push message"],
        wires: [["n2"]],
      };
      const flow = [configNode, node, { id: "n2", type: "helper" }];

      it("can load node", async () => {
        await helperLoad(eufySecurityNode, flow, { c1: credentials });
        const n1 = helper.getNode("n1");

        expect(n1).toMatchObject({
          name: node.name,
          topic: node.topic,
          events: node.events,
          eufyConfigNodeId: "c1",
          initialised: true,
        });

        expect(mockSecurityClient.on).toHaveBeenCalledWith(
          "connect",
          expect.anything()
        );
        expect(mockSecurityClient.on).toHaveBeenCalledWith(
          "close",
          expect.anything()
        );
        expect(mockSecurityClient.on).toHaveBeenCalledWith(
          "push message",
          expect.anything()
        );

        expect(
          n1.status.calledWithExactly({
            fill: "grey",
            shape: "dot",
            text: "Initialised",
          })
        ).toBeTruthy();

        expect(mockSecurityClient.isConnected).toHaveBeenCalled();

        expect(
          n1.status.calledWithExactly({
            fill: "yellow",
            shape: "dot",
            text: "Connecting",
          })
        ).toBeTruthy();

        expect(mockSecurityClient.connect).toHaveBeenCalled();
      });

      describe("commands", () => {
        it("ignores unknown command", async () => {
          await helperLoad(eufySecurityNode, flow, { c1: credentials });

          const n1 = helper.getNode("n1");
          const n2 = helper.getNode("n2");
          const inputPromise = (() =>
            new Promise((resolve) => n2.on("input", resolve)))();

          const command = "foo";
          n1.receive({ payload: { command } });

          const msg = await inputPromise;
          expect(msg).toMatchObject({
            payload: {
              command,
              error: new Error("Unknown command"),
              event: EVENT_COMMAND_RESULT,
            },
            topic: node.topic,
          });
        });

        it("calls command", async () => {
          await helperLoad(eufySecurityNode, flow, { c1: credentials });

          const n1 = helper.getNode("n1");
          const n2 = helper.getNode("n2");
          const inputPromise = (() =>
            new Promise((resolve) => n2.on("input", resolve)))();

          n1.receive({
            payload: {
              command: commands.CLOSE,
            },
          });

          const msg = await inputPromise;
          expect(msg).toMatchObject({
            payload: {
              command: commands.CLOSE,
              event: EVENT_COMMAND_RESULT,
              result: undefined,
            },
            topic: node.topic,
          });

          expect(mockSecurityClient.close).toHaveBeenCalled();
        });
      });
    });
  });
});
