const path = require('path');

function getSDLSchemaLocation(context, apiName) {
  const { getBackendDirPath } = context.pathManager
  return path.join(getBackendDirPath('api', apiName, 'build', 'schema.graphql'));
}

module.exports = getSDLSchemaLocation;
