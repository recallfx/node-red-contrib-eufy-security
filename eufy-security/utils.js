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

function transformProperties(properties) {
  const result = {};
  Object.entries(properties).forEach(([key, value]) => {
    result[key] = value?.value;
  });

  return result;
}

function transformPropValue(propName, value) {
  if (value && value.properties) {
    return transformProperties(value.properties);
  }

  return value;
}

function getArgumentsTransformer(propNames) {
  return (...args) => {
    const result = propNames.reduce((acc, propName, index) => {
      acc[propName] = transformPropValue(propName, args[index]);

      return acc;
    }, {});

    // if for some reason we missed some props add those to `other` property
    if (propNames.length < args.length) {
      result.other = args.slice(propNames.length);
    }

    return result;
  };
}

module.exports = {
  safeStringify,
  transformProperties,
  getArgumentsTransformer,
};
