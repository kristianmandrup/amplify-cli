import * as path from 'path';

export function getMockDataDirectory(context) {
  const { projectPath } = context.amplify.getEnvInfo();
  const { amplifyPathDir } = context.pathManager
  return path.join(projectPath, amplifyPathDir('mock-data'));
}
