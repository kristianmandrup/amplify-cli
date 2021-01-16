import * as path from 'path';
import * as fs from 'fs-extra';
import { TRANSFORM_CONFIG_FILE_NAME, TransformConfig } from 'graphql-transformer-core';

export function getTransformConfig(context, projectRoot: string, apiName: string): TransformConfig {
  const { backendPathDirFor } = context.pathManager
  const metaFilePath = path.join(projectRoot, backendPathDirFor('api', apiName, TRANSFORM_CONFIG_FILE_NAME));
  return <TransformConfig>JSON.parse(fs.readFileSync(metaFilePath, 'utf8'));
}
