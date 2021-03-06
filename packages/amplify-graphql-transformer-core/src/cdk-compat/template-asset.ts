import * as cdk from '@aws-cdk/core';
import * as crypto from 'crypto';
import {
  S3MappingTemplateProvider,
  InlineMappingTemplateProvider,
  MappingTemplateType,
} from '@aws-amplify/graphql-transformer-interfaces';
import { FileAsset } from './file-asset';
export class S3MappingTemplate implements S3MappingTemplateProvider {
  private content: string;
  private name: string;
  private asset?: FileAsset;
  public readonly type = MappingTemplateType.S3_LOCATION;
  static fromFile(): S3MappingTemplate {
    throw new Error('Not implemented');
  }

  static fromInlineTemplate(code: string, templateName?: string): S3MappingTemplate {
    return new S3MappingTemplate(code, templateName);
  }

  constructor(content: string, name?: string) {
    this.content = content;
    const assetHash = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
    this.name = name || `mapping-template-${assetHash}.vtl`;
  }

  bind(scope: cdk.Construct): string {
    // If the same AssetCode is used multiple times, retain only the first instantiation.
    if (!this.asset) {
      this.asset = new FileAsset(scope, `Template${this.name}`, {
        fileContent: this.content,
        fileName: this.name,
      });
    }
    return this.asset.s3Url;
  }
  substitueValues(values: Record<string, string|number>): void {
    let name = this.name;
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`({${key}})`, 'g');
      name = name.replace(regex, `${value}`);
    });
    this.name = name;
  }
}

export class InlineTemplate implements InlineMappingTemplateProvider {
  public readonly type = MappingTemplateType.INLINE;

  // eslint-disable-next-line no-useless-constructor
  constructor(private content: string) {}
  bind(): string {
    return this.content;
  }
}

export class MappingTemplate {
  static inlineTemplateFromString(template: string): InlineTemplate {
    return new InlineTemplate(template);
  }
  static s3MappingTemplateFromString(
    template: string,
    templateName: string,
    type: 'pipeline' | 'resolver' = 'pipeline',
  ): S3MappingTemplate {
    const templatePrefix = type == 'pipeline' ? 'pipelineFunctions' : 'resolvers';
    return new S3MappingTemplate(template, `${templatePrefix}/${templateName}`);
  }
}
