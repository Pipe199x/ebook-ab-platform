// src/ebook_ab/budgets.ts
// Budget constructs for $5 monthly alarm and free‑allowance check.
import { Construct } from 'constructs';
import { aws_budgets as budgets, aws_sns as sns, aws_sns_subscriptions as subscriptions } from 'aws-cdk-lib';

export class Budgets extends Construct {
  public readonly alertTopic: sns.ITopic;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.alertTopic = new sns.Topic(this, 'BudgetAlertTopic', {
      displayName: 'Budget Alerts',
      topicName: 'budget-alerts',
    });
    // Email subscription for alerts
    this.alertTopic.addSubscription(new subscriptions.EmailSubscription('duqueandres800@gmail.com'));
    // $5 monthly alarm budget.
    new budgets.CfnBudget(this, 'MonthlyDollarBudget', {
      budget: {
        budgetName: 'MonthlyDollarBudget',
        budgetLimit: { amount: 5, unit: 'USD' },
        timeUnit: 'MONTHLY',
        budgetType: 'COST',
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
          },
          subscribers: [{ subscriptionType: 'SNS', address: this.alertTopic.topicArn }],
        },
      ],
    });
    // Free‑allowance allow‑list check budget (zero limit, alarm when any spend).
    new budgets.CfnBudget(this, 'FreeAllowanceBudget', {
      budget: {
        budgetName: 'FreeAllowanceBudget',
        budgetLimit: { amount: 0.01, unit: 'USD' },
        timeUnit: 'MONTHLY',
        budgetType: 'COST',
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 0.1,
          },
          subscribers: [{ subscriptionType: 'SNS', address: this.alertTopic.topicArn }],
        },
      ],
    });
  }
}

// ponytail: minimal budget setup; expand thresholds, tags, IAM policies when needed.
