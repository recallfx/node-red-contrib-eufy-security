const { safeStringify, getArgumentsTransformer } = require("../utils");

describe("utils.js", () => {
  it("safely stringifies circular object", () => {
    const obj = { foo: "bar" };
    obj.obj = obj;

    expect(() => {
      return JSON.stringify(obj);
    }).toThrow();

    expect(() => {
      safeStringify(obj);
    }).not.toThrow();

    const string = safeStringify(obj);
    expect(string).toContain('"foo": "bar"');
  });

  it("transforms arguments into properties", () => {
    const argumentsTransformer = getArgumentsTransformer([
      "station",
      "device",
      "a",
      "b",
      "c",
    ]);

    expect(typeof argumentsTransformer === "function").toBeTruthy();

    const station = {
      properties: {
        someProperty: {
          timestamp: 123456,
          value: "station value",
        },
      },
    };
    const device = {
      properties: {
        someProperty: {
          timestamp: 123456,
          value: "device value",
        },
      },
    };
    const transformedObject = argumentsTransformer(station, device, "a", "b", "c", "d");

    expect(transformedObject).toMatchObject({
      station: {
        someProperty: 'station value',
      },
      device: {
        someProperty: 'device value',
      },
      a: "a",
      b: "b",
      c: "c",
      other: ["d"],
    });
  });
});
