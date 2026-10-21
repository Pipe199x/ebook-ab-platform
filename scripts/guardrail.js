// scripts/guardrail.js
const { execSync } = require('child_process');
try {
  const out = execSync('npx cdk synth --json', { encoding: 'utf8' });
  const template = JSON.parse(out);
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
