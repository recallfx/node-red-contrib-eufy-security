// safely handles circular references
function safeStringify(obj, indent = 2) {
  let cache = [];
  const retVal = JSON.stringify(
    obj,
    (key, value) =>
      typeof value === "object" && value !== null
        ? cache.includes(value)
          ? undefined // Duplicate reference found, discard key
          : cache.push(value) && value // Store value in our collection
        : value,
    indent
  );
  cache = null;
  return retVal;
}

function getArgumentsTransformer(propNames) {
  return (...args) => {
    const result = propNames.reduce((acc, propName, index) => {
      acc[propName] = args[index];
      return acc;
    }, {});

    return result;
  };
}

const EVENT_COMMAND_RESULT = "command result";

module.exports = {
  safeStringify,
  getArgumentsTransformer,
  EVENT_COMMAND_RESULT,
};
