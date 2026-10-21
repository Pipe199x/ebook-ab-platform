// scripts/guardrail.js
const { execSync } = require('child_process');
try {
  const fs = require('fs');
  const outputPath = 'cdk-output.json';
  if (!fs.existsSync(outputPath)) {
    console.error('Guardrail error: cdk-output.json not found');
    process.exit(1);
  }
  const raw = fs.readFileSync(outputPath, 'utf8');
  const template = JSON.parse(raw);
  const resources = template?.Resources || {};
  const hasGlueJob = Object.values(resources).some(r => r.Type === 'AWS::Glue::Job');
  if (hasGlueJob) {
    console.error('Guardrail failed: Glue Job detected in stack');
    process.exit(1);
  }
  console.log('Guardrail passed: No Glue Job present');
  process.exit(0);
} catch (e) {
  console.error('Guardrail error:', e.message);
  process.exit(1);
}
