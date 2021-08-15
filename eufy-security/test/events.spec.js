const events = require("../events");

describe("events.js", () => {
  it("creates an array with defined transformation hanlers", () => {
    expect(events).toBeTruthy();
    expect(events.length).toBe(35);


    const messageEvent = events.find(item => item.event === 'push message');
    expect(messageEvent).toBeTruthy();

    const { event, args, handler } = messageEvent;

    expect(args).toMatchObject(['message']);
    expect(typeof handler === 'function').toBeTruthy();

    const transformedEvent = handler('a', 'b')

    expect(transformedEvent).toMatchObject({
      message: 'a',
      other: ['b'],
    })
  });
});
