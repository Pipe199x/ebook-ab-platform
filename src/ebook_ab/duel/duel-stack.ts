// src/ebook_ab/duel/duel-stack.ts
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_lambda as lambda, aws_dynamodb as ddb, aws_stepfunctions as sfn, aws_stepfunctions_tasks as tasks } from 'aws-cdk-lib';

export class DuelStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    // DynamoDB table
    const table = new ddb.Table(this, 'DuelTable', {
      partitionKey: { name: 'PK', type: ddb.AttributeType.STRING },
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
    });
    // Lambda handling duels
    const duelHandler = new lambda.Function(this, 'DuelHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`exports.handler = async (event) => { console.log('Duel event', event); return {}; };`),
      environment: { TABLE_NAME: table.tableName },
    });
    table.grantReadWriteData(duelHandler);
    // Step Functions state machine invoking the Lambda
    const task = new tasks.LambdaInvoke(this, 'InvokeDuel', {
      lambdaFunction: duelHandler,
    });
    const definition = task;
    new sfn.StateMachine(this, 'DuelStateMachine', {
      definition,
    });
  }
}
// ponytail: add IAM policies, DLQ, monitoring as needed.
