import * as path from 'path';
import * as fs from 'fs';

export function getMockConfig(context) {
  const { projectPath } = context.amplify.getEnvInfo();
  const { amplifyPathDir } = context.pathManager
  const mockConfigPath = path.join(projectPath, amplifyPathDir('mock.json'));
  if (fs.existsSync(mockConfigPath)) {
    return JSON.parse(fs.readFileSync(mockConfigPath).toString('UTF-8'));
  }
  return {};
}
