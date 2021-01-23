import { nspawn as spawn, retry, getCLIPath, describeCloudFormationStack, getProjectMeta } from '..';
import * as fs from 'fs-extra';

export function deleteProjectDir(projectDirpath: string) {
  return fs.removeSync(projectDirpath);
}

export const deleteProject = async (context, cwd: string, profileConfig?: any) => {
  const { StackName: stackName, Region: region } = getProjectMeta(context, cwd).providers.awscloudformation;
  await retry(
    () => describeCloudFormationStack(stackName, region, profileConfig),
    stack => stack.StackStatus.endsWith('_COMPLETE'),
  );
  return new Promise((resolve, reject) => {
    const noOutputTimeout = 1000 * 60 * 20; // 20 minutes;
    spawn(getCLIPath(), ['delete'], { cwd, stripColors: true, noOutputTimeout })
      .wait('Are you sure you want to continue?')
      .sendLine('y')
      .wait('Project deleted locally.')
      .run((err: Error) => {
        if (!err) {
          resolve(null);
        } else {
          reject(err);
        }
      });
  });
};
