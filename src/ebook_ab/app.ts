// src/ebook_ab/app.ts
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { Budgets } from './budgets';

export class BudgetStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);
    new Budgets(this, 'Budgets');
  }
}

const app = new App();
new BudgetStack(app, 'EbookAbBudgetStack');
app.synth();
