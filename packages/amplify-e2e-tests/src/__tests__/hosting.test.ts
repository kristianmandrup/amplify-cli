import { amplifyPublishWithoutUpdate, createReactTestProject, resetBuildCommand } from 'amplify-e2e-core';

import { initJSProjectWithProfile, deleteProject } from 'amplify-e2e-core';
import { addDEVHosting, removeHosting, amplifyPushWithoutCodegen } from 'amplify-e2e-core';
import { Utils, getProjectMeta } from 'amplify-e2e-core';
import * as fs from 'fs-extra';
import * as path from 'path';
const { constructContext } = require('@aws-amplify/cli')

describe('amplify add hosting', () => {
  let projRoot: string;  
  const context = constructContext()
  let utils

  beforeAll(async () => {
    projRoot = await createReactTestProject();
    utils = new Utils(context, projRoot)
    await initJSProjectWithProfile(projRoot, {});
    await addDEVHosting(projRoot);
    await amplifyPushWithoutCodegen(projRoot);
  });

  afterAll(async () => {
    await removeHosting(projRoot);
    await amplifyPushWithoutCodegen(projRoot);
    await deleteProject(projRoot);
    utils.deleteProjectDir(projRoot);
  });

  it('push creates correct amplify artifacts', async () => {
    const { backendDirPathFor } = context.pathManager;
    expect(fs.existsSync(path.join(projRoot, backendDirPathFor('hosting', 'S3AndCloudFront')))).toBe(true);
    const projectMeta = getProjectMeta(context, projRoot);
    expect(projectMeta.hosting).toBeDefined();
    expect(projectMeta.hosting.S3AndCloudFront).toBeDefined();
  });

  it('publish successfully', async () => {
    let error;
    try {
      await amplifyPublishWithoutUpdate(projRoot);
    } catch (err) {
      error = err;
    }
    expect(error).not.toBeDefined();
  });

  it('publish throws error if build command is missing', async () => {
    const currentBuildCommand = resetBuildCommand(context, projRoot, '');
    let error;
    try {
      await amplifyPublishWithoutUpdate(projRoot);
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.message).toEqual('Process exited with non zero exit code 1');
    resetBuildCommand(context, projRoot, currentBuildCommand);
  });
});
