import * as path from 'path';

export function getMockDataDirectory(context) {
  const { projectPath } = context.amplify.getEnvInfo();
  return path.join(projectPath, amplifyPathFor('mock-data'));
}
