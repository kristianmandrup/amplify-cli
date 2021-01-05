import * as path from 'path';
import * as fs from 'fs-extra';
import * as rimraf from 'rimraf';
import { config } from 'dotenv';

export * from './add-circleci-tags';
export * from './api';
export * from './appsync';
export * from './envVars';
export * from './getAppId';
export * from './headless';
export * from './nexpect';
export * from './pinpoint';
export * from './projectMeta';
export * from './readJsonFile';
export * from './request';
export * from './retrier';
export * from './sdk-calls';
export * from './selectors';
export * from './sleep';
export * from './transformConfig';

// run dotenv config to update env variable
config();

export class Utils {
  context: any
  root: string

  constructor(context, root: string = ".") {
    this.context = context
    this.root = root
  }

  deleteProjectDir(projRoot?) {
    const { root } = this
    rimraf.sync(projRoot || root);
  }

  deleteAmplifyDir() {
    const { context, root } = this
    const { getAmplifyDirPath } = context.pathManager
    rimraf.sync(path.join(root, getAmplifyDirPath()));
  }

  overrideFunctionSrc(name: string, code: string) {
    const { root, getPathToFunction } = this
    let indexPath = path.join(getPathToFunction(name), 'src', 'index.js');
    fs.writeFileSync(indexPath, code);
  }

  getFunctionSrc(name: string): Buffer {
    const { root, getPathToFunction } = this
    let indexPath = path.join(getPathToFunction(name), 'src', 'index.js');
    return fs.readFileSync(indexPath);
  }

  //overriding code for node
  overrideLayerCode(name: string, code: string, fileName: string) {
    const { root, getPathToFunction } = this
    const dirPath = path.join(getPathToFunction(name), 'lib', 'nodejs', 'node_modules', name);
    fs.ensureDirSync(dirPath);
    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, code);
  }

  // overriding code for python
  overrideFunctionSrcPython(name: string, source: string) {
    const { root, getPathToFunction } = this
    const destFilePath = path.join(getPathToFunction(name), 'src', 'index.py');
    fs.copyFileSync(source, destFilePath);
  }

  overrideLayerCodePython(name: string, source: string) {
    const { root, getPathToFunction } = this
    const dirPath = path.join(getPathToFunction(name), 'lib', 'python', 'lib', 'python3.8', 'site-packages');
    fs.ensureDirSync(dirPath);
    const destfilePath = path.join(dirPath, 'testfunc.py');
    fs.copyFileSync(source, destfilePath);
  }

  overridefunctionSrcJava(name: string, source: string) {
    const { root, getPathToFunction } = this
    const destFilePath = path.join(getPathToFunction(name), 'build.gradle');
    fs.copyFileSync(source, destFilePath);
  }

  overrideLayerCodeJava(layerName: string) {
    const { getPathToFunction } = this
    const destDir = path.join(getPathToFunction(layerName), 'lib', 'java', 'lib');
    const srcDir = path.join(getPathToFunction(layerName), 'build', 'java', 'lib');

    fs.copySync(srcDir, destDir);
  }

  getPathToFunction(funcName: string) {
    const { context, root } = this
    const { getBackendDirPathFor } = context.pathManager
    return path.join(root, getBackendDirPathFor('function', funcName));
  }
}


