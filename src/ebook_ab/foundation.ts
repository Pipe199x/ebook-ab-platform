// src/ebook_ab/foundation.ts
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_s3 as s3, aws_iam as iam } from 'aws-cdk-lib';

export class FoundationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    // Lakehouse bucket
    new s3.Bucket(this, 'LakehouseBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });
    // GitHub OIDC provider
    const provider = new iam.OpenIdConnectProvider(this, 'GitHubOIDC', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });
    // Role assumed by GitHub actions
    new iam.Role(this, 'GitHubActionsRole', {
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          // placeholder repo; replace with actual repo path when known
          'token.actions.githubusercontent.com:sub': 'repo:OWNER/REPO:*',
        },
      }),
    });
  }
}
// ponytail: add bucket policies, tags, resource policies as needed.
