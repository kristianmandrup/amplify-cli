import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import _ from 'lodash';
import { JSONUtilities } from 'amplify-cli-core';

function getAWSConfigAndroidPath(projRoot: string): string {
  return path.join(projRoot, 'app', 'src', 'main', 'res', 'raw', 'awsconfiguration.json');
}

function getAmplifyConfigAndroidPath(projRoot: string): string {
  return path.join(projRoot, 'app', 'src', 'main', 'res', 'raw', 'amplifyconfiguration.json');
}

function getAmplifyConfigIOSPath(projRoot: string): string {
  return path.join(projRoot, 'amplifyconfiguration.json');
}

function getAmplifyDirPath(context, projRoot: string): string {
  const { getAmplifyDirPath } = context.pathManager
  return path.join(projRoot, getAmplifyDirPath());
}

function getAWSConfigIOSPath(projRoot: string): string {
  return path.join(projRoot, 'awsconfiguration.json');
}

function getProjectMeta(context, projectRoot: string) {
  const { getAmplifyDirPath } = context.pathManager
  const metaFilePath: string = path.join(projectRoot, getAmplifyDirPath('#current-cloud-backend', 'amplify-meta.json'));
  return JSON.parse(fs.readFileSync(metaFilePath, 'utf8'));
}

function getProjectTags(context, projectRoot: string) {
  const { getAmplifyDirPath } = context.pathManager
  const projectTagsFilePath: string = path.join(projectRoot, getAmplifyDirPath('#current-cloud-backend', 'tags.json'));
  return JSON.parse(fs.readFileSync(projectTagsFilePath, 'utf8'));
}

function getBackendAmplifyMeta(context, projectRoot: string) {
  const { getBackendDirPath } = context.pathManager
  const metaFilePath: string = path.join(projectRoot, getBackendDirPath('amplify-meta.json'));
  return JSON.parse(fs.readFileSync(metaFilePath, 'utf8'));
}

function getBackendConfig(context, projectRoot: string) {
  const { getBackendDirPath } = context.pathManager
  const backendFConfigFilePath: string = path.join(projectRoot, getBackendDirPath('backend-config.json'));
  return JSON.parse(fs.readFileSync(backendFConfigFilePath, 'utf8'));
}

function getCloudBackendConfig(context, projectRoot: string) {
  const { getAmplifyDirPath } = context.pathManager
  const currentCloudPath: string = path.join(projectRoot, getAmplifyDirPath('#current-cloud-backend', 'backend-config.json'));
  return JSON.parse(fs.readFileSync(currentCloudPath, 'utf8'));
}

function getTeamProviderInfo(context, projectRoot: string) {
  const { getAmplifyDirPath } = context.pathManager
  const teamProviderFilePath: string = path.join(projectRoot, getAmplifyDirPath('team-provider-info.json'));
  return JSON.parse(fs.readFileSync(teamProviderFilePath, 'utf8'));
}

function getS3StorageBucketName(projectRoot: string) {
  const meta = getProjectMeta(projectRoot);
  const storage = meta['storage'];
  const s3 = Object.keys(storage).filter(r => storage[r].service === 'S3');
  const fStorageName = s3[0];
  return storage[fStorageName].output.BucketName;
}

function getAwsAndroidConfig(projectRoot: string) {
  const configPath = getAWSConfigAndroidPath(projectRoot);
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function getAwsIOSConfig(projectRoot: string) {
  const configPath = getAWSConfigIOSPath(projectRoot);
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function getDeploymentSecrets(): any {
  const deploymentSecretsPath: string = path.join(os.homedir(), '.aws', 'amplify', 'deployment-secrets.json');
  return (
    JSONUtilities.readJson(deploymentSecretsPath, {
      throwIfNotExist: false,
    }) || { appSecrets: [] }
  );
}

function isDeploymentSecretForEnvExists(projRoot: string, envName: string): boolean {
  const teamproviderInfo = getTeamProviderInfo(projRoot);
  const rootStackId = teamproviderInfo[envName].awscloudformation.StackId.split('/')[2];
  const resource = _.first(Object.keys(teamproviderInfo[envName].categories.auth));
  const deploymentSecrets = getDeploymentSecrets();
  const deploymentSecretByAppId = _.find(deploymentSecrets.appSecrets, appSecret => appSecret.rootStackId === rootStackId);
  if (deploymentSecretByAppId) {
    const path = [envName, 'auth', resource, 'hostedUIProviderCreds'];
    return _.has(deploymentSecretByAppId.environments, path);
  }
  return false;
}

export {
  getProjectMeta,
  getProjectTags,
  getBackendAmplifyMeta,
  getAwsAndroidConfig,
  getAwsIOSConfig,
  getAWSConfigAndroidPath,
  getAmplifyConfigAndroidPath,
  getAmplifyConfigIOSPath,
  getAWSConfigIOSPath,
  getDeploymentSecrets,
  isDeploymentSecretForEnvExists,
  getS3StorageBucketName,
  getAmplifyDirPath,
  getBackendConfig,
  getTeamProviderInfo,
  getCloudBackendConfig,
};
