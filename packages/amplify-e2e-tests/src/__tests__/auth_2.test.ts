import { initJSProjectWithProfile, deleteProject, amplifyPushAuth, amplifyPush } from 'amplify-e2e-core';
import { addAuthWithDefaultSocial, addAuthWithGroupTrigger, addAuthWithRecaptchaTrigger, addAuthViaAPIWithTrigger } from 'amplify-e2e-core';
import {
  createNewProjectDir,
  deleteProjectDir,
  getProjectMeta,
  getUserPool,
  getUserPoolClients,
  isDeploymentSecretForEnvExists,
  getLambdaFunction,
} from 'amplify-e2e-core';
import { constructContext } from '@amplify/cli'

const defaultsSettings = {
  name: 'authTest',
};

describe('amplify add auth...', () => {
  let projRoot: string;
  let context
  beforeEach(async () => {
    projRoot = await createNewProjectDir('auth');
    context = constructContext(projRoot)
  });

  afterEach(async () => {
    await deleteProject(projRoot);
    deleteProjectDir(projRoot);
  });

  it('...should init a project and add auth with defaultSocial', async () => {
    await initJSProjectWithProfile(projRoot, defaultsSettings);
    await addAuthWithDefaultSocial(projRoot, {});
    expect(isDeploymentSecretForEnvExists(projRoot, 'integtest')).toBeTruthy();
    await amplifyPushAuth(projRoot);
    const meta = getProjectMeta(context, projRoot);
    expect(isDeploymentSecretForEnvExists(projRoot, 'integtest')).toBeFalsy();
    const authMeta = Object.keys(meta.auth).map(key => meta.auth[key])[0];
    const id = authMeta.output.UserPoolId;
    const userPool = await getUserPool(id, meta.providers.awscloudformation.Region);
    const clientIds = [authMeta.output.AppClientIDWeb, authMeta.output.AppClientID];
    const clients = await getUserPoolClients(id, clientIds, meta.providers.awscloudformation.Region);

    expect(userPool.UserPool).toBeDefined();
    expect(clients).toHaveLength(2);
    expect(clients[0].UserPoolClient.CallbackURLs[0]).toEqual('https://www.google.com/');
    expect(clients[0].UserPoolClient.LogoutURLs[0]).toEqual('https://www.nytimes.com/');
    expect(clients[0].UserPoolClient.SupportedIdentityProviders).toHaveLength(4);
  });

  it('...should init a project and add auth a PostConfirmation: add-to-group trigger', async () => {
    await initJSProjectWithProfile(projRoot, defaultsSettings);
    await addAuthWithGroupTrigger(projRoot, {});
    await amplifyPushAuth(projRoot);
    const meta = getProjectMeta(context, projRoot);

    const functionName = `${Object.keys(meta.auth)[0]}PostConfirmation-integtest`;

    const authMeta = Object.keys(meta.auth).map(key => meta.auth[key])[0];
    const id = authMeta.output.UserPoolId;
    const userPool = await getUserPool(id, meta.providers.awscloudformation.Region);
    const clientIds = [authMeta.output.AppClientIDWeb, authMeta.output.AppClientID];
    const clients = await getUserPoolClients(id, clientIds, meta.providers.awscloudformation.Region);

    const lambdaFunction = await getLambdaFunction(functionName, meta.providers.awscloudformation.Region);
    expect(userPool.UserPool).toBeDefined();
    expect(clients).toHaveLength(2);
    expect(lambdaFunction).toBeDefined();
    expect(lambdaFunction.Configuration.Environment.Variables.GROUP).toEqual('mygroup');
  });

  it('...should allow the user to add auth via API category, with a trigger', async () => {
    await initJSProjectWithProfile(projRoot, defaultsSettings);
    await addAuthViaAPIWithTrigger(projRoot, {});
    await amplifyPush(projRoot);
    const meta = getProjectMeta(context, projRoot);

    const functionName = `${Object.keys(meta.auth)[0]}PostConfirmation-integtest`;
    const authMeta = Object.keys(meta.auth).map(key => meta.auth[key])[0];
    const id = authMeta.output.UserPoolId;
    const userPool = await getUserPool(id, meta.providers.awscloudformation.Region);
    const clientIds = [authMeta.output.AppClientIDWeb, authMeta.output.AppClientID];
    const clients = await getUserPoolClients(id, clientIds, meta.providers.awscloudformation.Region);

    const lambdaFunction = await getLambdaFunction(functionName, meta.providers.awscloudformation.Region);
    expect(userPool.UserPool).toBeDefined();
    expect(clients).toHaveLength(2);
    expect(lambdaFunction).toBeDefined();
    expect(lambdaFunction.Configuration.Environment.Variables.GROUP).toEqual('mygroup');
  });

  it('...should init a project and add 3 custom auth flow triggers for Google reCaptcha', async () => {
    await initJSProjectWithProfile(projRoot, defaultsSettings);
    await addAuthWithRecaptchaTrigger(projRoot, {});
    await amplifyPushAuth(projRoot);
    const meta = getProjectMeta(context, projRoot);

    const createFunctionName = `${Object.keys(meta.auth)[0]}CreateAuthChallenge-integtest`;
    const defineFunctionName = `${Object.keys(meta.auth)[0]}DefineAuthChallenge-integtest`;
    const verifyFunctionName = `${Object.keys(meta.auth)[0]}VerifyAuthChallengeResponse-integtest`;

    const authMeta = Object.keys(meta.auth).map(key => meta.auth[key])[0];
    const id = authMeta.output.UserPoolId;
    const userPool = await getUserPool(id, meta.providers.awscloudformation.Region);
    const clientIds = [authMeta.output.AppClientIDWeb, authMeta.output.AppClientID];
    const clients = await getUserPoolClients(id, clientIds, meta.providers.awscloudformation.Region);

    const createFunction = await getLambdaFunction(createFunctionName, meta.providers.awscloudformation.Region);
    const defineFunction = await getLambdaFunction(defineFunctionName, meta.providers.awscloudformation.Region);
    const verifyFunction = await getLambdaFunction(verifyFunctionName, meta.providers.awscloudformation.Region);

    expect(userPool.UserPool).toBeDefined();
    expect(clients).toHaveLength(2);
    expect(createFunction).toBeDefined();
    expect(defineFunction).toBeDefined();
    expect(verifyFunction).toBeDefined();
    expect(verifyFunction.Configuration.Environment.Variables.RECAPTCHASECRET).toEqual('dummykey');
  });
});
