"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Budgets = void 0;
// src/ebook_ab/budgets.ts
// Budget constructs for $5 monthly alarm and free‑allowance check.
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class Budgets extends constructs_1.Construct {
    alertTopic;
    constructor(scope, id) {
        super(scope, id);
        this.alertTopic = new aws_cdk_lib_1.aws_sns.Topic(this, 'BudgetAlertTopic', {
            displayName: 'Budget Alerts',
            topicName: 'budget-alerts',
        });
        // Email subscription for alerts
        this.alertTopic.addSubscription(new aws_cdk_lib_1.aws_sns_subscriptions.EmailSubscription('duqueandres800@gmail.com'));
        // $5 monthly alarm budget.
        new aws_cdk_lib_1.aws_budgets.CfnBudget(this, 'MonthlyDollarBudget', {
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
        new aws_cdk_lib_1.aws_budgets.CfnBudget(this, 'FreeAllowanceBudget', {
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
exports.Budgets = Budgets;
// ponytail: minimal budget setup; expand thresholds, tags, IAM policies when needed.
