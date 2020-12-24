const path = require('path');
const fs = require('fs-extra');

const defaults = {
  amplifyPath: 'amplify',
  backendPath: 'backend',
};

const $paths = {
  ...defaults,
};

export const amplifyPathFor = (...paths: any[]) => {
  return path.join('.', $paths.amplifyPath, ...paths);
};

export const backendPathFor = (...paths: any[]) => {
  return amplifyPathFor($paths.backendPath, ...paths);
};

export const getAmplifyRc = (opts: any = {}) => {
  const localAmplifyRcPath = path.join('.amplifyrc');
  const existingApp = fs.existsSync(localAmplifyRcPath);
  const amplifyRcFilePath = opts.amplifyrcPath || localAmplifyRcPath;
  if (existingApp === true) {
    const amplifyRc = JSON.parse(fs.readFileSync(amplifyRcFilePath));
    return amplifyRc;
  }
  if (!fs.existsSync(amplifyRcFilePath)) {
    fs.writeFileSync(amplifyRcFilePath, JSON.stringify(opts, null, 4));
  }
  return opts;
};
