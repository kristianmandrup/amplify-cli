import * as path from 'path';
import * as fs from 'fs-extra';

export const getAmplifyRc = (opts: any = {}): any => {
  const projectPath = opts.projectPath || process.cwd()
  const localAmplifyRcPath = '.amplifyrc.json';
  const amplifyRcFilePath = opts.amplifyrcPath || localAmplifyRcPath;
  const amplifyRcFullPath = path.join(projectPath, amplifyRcFilePath)
  const existingApp = fs.existsSync(amplifyRcFullPath);
  if (existingApp) {
    const fileContent: string = fs.readFileSync(amplifyRcFullPath, 'utf8');
    const amplifyRc = JSON.parse(fileContent);
    return amplifyRc;
  }
  if (!fs.existsSync(amplifyRcFilePath)) {
    fs.writeFileSync(amplifyRcFilePath, JSON.stringify(opts, null, 4));
  }
  return opts;
};
