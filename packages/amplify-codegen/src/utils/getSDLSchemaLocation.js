const path = require('path');
const { backendPathFor } = require('./path-utils');

function getSDLSchemaLocation(apiName) {
  return path.join(backendPathFor('api', apiName, 'build', 'schema.graphql'));
}

module.exports = getSDLSchemaLocation;
