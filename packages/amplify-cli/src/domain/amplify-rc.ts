import * as path from 'path';
import * as fs from 'fs-extra';

export const getAmplifyRc = (opts: any = {}): any => {
  const localAmplifyRcPath = path.join('.amplifyrc.json');
  const existingApp = fs.existsSync(localAmplifyRcPath);
  const amplifyRcFilePath = opts.amplifyrcPath || localAmplifyRcPath;
  if (existingApp === true) {
    const fileContent: string = fs.readFileSync(amplifyRcFilePath, 'utf8');
    const amplifyRc = JSON.parse(fileContent);
    return amplifyRc;
  }
  if (!fs.existsSync(amplifyRcFilePath)) {
    fs.writeFileSync(amplifyRcFilePath, JSON.stringify(opts, null, 4));
  }
  return opts;
};
