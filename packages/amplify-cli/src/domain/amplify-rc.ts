export const getAmplifyRc = (opts = {}) => {
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