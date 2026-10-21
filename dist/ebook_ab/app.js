"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetStack = void 0;
// src/ebook_ab/app.ts
const aws_cdk_lib_1 = require("aws-cdk-lib");
const budgets_1 = require("./budgets");
class BudgetStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        new budgets_1.Budgets(this, 'Budgets');
    }
}
exports.BudgetStack = BudgetStack;
const app = new aws_cdk_lib_1.App();
new BudgetStack(app, 'EbookAbBudgetStack');
app.synth();
