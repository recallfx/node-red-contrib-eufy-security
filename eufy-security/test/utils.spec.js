const { safeStringify, getArgumentsTransformer } = require('../utils');

describe("utils.js", () => {
  it("safely stringifies circular object", () => {
    const obj = { foo: 'bar' };
    obj.obj = obj;

    expect(() => {
      JSON.stringify(obj);
    }).toThrow();

    expect(() => {
      safeStringify(obj);
    }).not.toThrow();

    const string = safeStringify(obj);
    expect(string).toContain('"foo": "bar"');
  });

  it("transforms arguments into properties", () => {
    const argumentsTransformer = getArgumentsTransformer(['a', 'b', 'c']);

    expect(typeof argumentsTransformer === 'function').toBeTruthy();

    const transformedObject = argumentsTransformer('a', 'b', 'c', 'd');

    expect(transformedObject).toMatchObject({
      a: 'a',
      b: 'b',
      c: 'c',
      other: ['d'],
    });
  });
});
