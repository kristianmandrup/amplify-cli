import {
  amplifyPush,
  amplifyPushUpdate,
  deleteProject,
  initJSProjectWithProfile,
  getSchemaPath,
  addHeadlessApi,
  updateHeadlessApi,
  getProjectSchema,
  removeHeadlessApi,
  addApiWithSchema,
  createNewProjectDir,
  deleteProjectDir,
  getAppSyncApi,
  getProjectMeta,
  getTransformConfig,
} from 'amplify-e2e-core';
import path from 'path';
import { existsSync } from 'fs';
import { TRANSFORM_CURRENT_VERSION, TRANSFORM_BASE_VERSION, writeTransformerConfiguration } from 'graphql-transformer-core';
import { AddApiRequest, UpdateApiRequest } from 'amplify-headless-interface';
import { readFileSync } from 'fs-extra';
import _ from 'lodash';
import { constructContext } from '@amplify/cli'

describe('amplify add api (GraphQL)', () => {
  let projRoot: string;
  let context
  beforeEach(async () => {
    projRoot = await createNewProjectDir('graphql-api');
    context = constructContext(projRoot)
  });

  afterEach(async () => {
    const { amplifyPathDir } = context.pathManager
    const metaFilePath = path.join(projRoot, amplifyPathDir('#current-cloud-backend', 'amplify-meta.json'));
    if (existsSync(metaFilePath)) {
      await deleteProject(context, projRoot);
    }
    deleteProjectDir(projRoot);
  });

  it('init a project and add the simple_model api, change transformer version to base version and push', async () => {
    const name = `simplemodelv${TRANSFORM_BASE_VERSION}`;
    await initJSProjectWithProfile(projRoot, { name });
    await addApiWithSchema(projRoot, 'simple_model.graphql');

    const transformConfig = getTransformConfig(context, projRoot, name);
    expect(transformConfig).toBeDefined();
    expect(transformConfig.Version).toBeDefined();
    expect(transformConfig.Version).toEqual(TRANSFORM_CURRENT_VERSION);

    transformConfig.Version = TRANSFORM_BASE_VERSION;
    const { backendPathDirFor } = context.pathManager
    const apiRoot = path.join(projRoot, backendPathDirFor('api', name));
    writeTransformerConfiguration(apiRoot, transformConfig);

    await amplifyPush(projRoot);

    const meta = getProjectMeta(context, projRoot);
    const { output } = meta.api[name];
    const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
    const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, meta.providers.awscloudformation.Region);

    expect(GraphQLAPIIdOutput).toBeDefined();
    expect(GraphQLAPIEndpointOutput).toBeDefined();
    expect(GraphQLAPIKeyOutput).toBeDefined();

    expect(graphqlApi).toBeDefined();
    expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);
  });

  const addApiRequest: AddApiRequest = {
    version: 1,
    serviceConfiguration: {
      serviceName: 'AppSync',
      apiName: 'myApiName',
      transformSchema: readFileSync(getSchemaPath('simple_model.graphql'), 'utf8'),
      defaultAuthType: {
        mode: 'API_KEY',
      },
    },
  };

  it('creates AppSync API in headless mode', async () => {
    await initJSProjectWithProfile(projRoot, {});
    await addHeadlessApi(projRoot, addApiRequest);
    await amplifyPush(projRoot);

    // verify
    const meta = getProjectMeta(context, projRoot);
    const { output } = meta.api.myApiName;
    const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
    const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, meta.providers.awscloudformation.Region);

    expect(GraphQLAPIIdOutput).toBeDefined();
    expect(GraphQLAPIEndpointOutput).toBeDefined();
    expect(GraphQLAPIKeyOutput).toBeDefined();

    expect(graphqlApi).toBeDefined();
    expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);
  });

  const newSchema = readFileSync(getSchemaPath('two-model-schema.graphql'), 'utf8');

  const updateApiRequest: UpdateApiRequest = {
    version: 1,
    serviceModification: {
      serviceName: 'AppSync',
      transformSchema: newSchema,
      defaultAuthType: {
        mode: 'AWS_IAM',
      },
      additionalAuthTypes: [
        {
          mode: 'API_KEY',
        },
      ],
      conflictResolution: {
        defaultResolutionStrategy: {
          type: 'OPTIMISTIC_CONCURRENCY',
        },
      },
    },
  };

  it('updates AppSync API in headless mode', async () => {
    await initJSProjectWithProfile(projRoot, {});
    await addHeadlessApi(projRoot, addApiRequest);
    await amplifyPush(projRoot);
    await updateHeadlessApi(projRoot, updateApiRequest);
    await amplifyPushUpdate(projRoot);

    // verify
    const meta = getProjectMeta(context, projRoot);
    const { output } = meta.api.myApiName;
    const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
    const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, meta.providers.awscloudformation.Region);

    expect(GraphQLAPIIdOutput).toBeDefined();
    expect(GraphQLAPIEndpointOutput).toBeDefined();
    expect(GraphQLAPIKeyOutput).toBeDefined();

    expect(graphqlApi).toBeDefined();
    expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);

    expect(getTransformConfig(context, projRoot, 'myApiName')).toMatchSnapshot();
    expect(output.authConfig).toMatchSnapshot();
    expect(getProjectSchema(context, projRoot, 'myApiName')).toMatchSnapshot();
  });

  it('removes AppSync API in headless mode', async () => {
    await initJSProjectWithProfile(projRoot, {});
    await addHeadlessApi(projRoot, addApiRequest);
    await amplifyPush(projRoot);

    // verify
    const meta = getProjectMeta(context, projRoot);
    const { output } = meta.api.myApiName;
    const { GraphQLAPIIdOutput, GraphQLAPIEndpointOutput, GraphQLAPIKeyOutput } = output;
    const { graphqlApi } = await getAppSyncApi(GraphQLAPIIdOutput, meta.providers.awscloudformation.Region);

    expect(GraphQLAPIIdOutput).toBeDefined();
    expect(GraphQLAPIEndpointOutput).toBeDefined();
    expect(GraphQLAPIKeyOutput).toBeDefined();

    expect(graphqlApi).toBeDefined();
    expect(graphqlApi.apiId).toEqual(GraphQLAPIIdOutput);

    await removeHeadlessApi(projRoot, 'myApiName');
    await amplifyPushUpdate(projRoot);

    const newMeta = getProjectMeta(context, projRoot);
    expect(_.isEmpty(newMeta.api)).toBe(true);
    try {
      await getAppSyncApi(GraphQLAPIIdOutput, meta.providers.awscloudformation.Region);
      expect(true).toBe(false); // expecting failure
    } catch (err) {
      expect(err.message).toBe(`GraphQL API ${GraphQLAPIIdOutput} not found.`);
    }
  });
});
