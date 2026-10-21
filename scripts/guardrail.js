// scripts/guardrail.js
const { execSync } = require('child_process');
try {
  const fs = require('fs');

// Determine output file: argument overrides, else fallback to cdk-output.json or faulty-output.json if present
const argPath = process.argv[2];
let outputPath;
if (argPath) {
  outputPath = argPath;
} else if (fs.existsSync('faulty-output.json')) {
  outputPath = 'faulty-output.json';
} else {
  outputPath = 'cdk-output.json';
}

if (!fs.existsSync(outputPath)) {
  console.error(`Guardrail error: ${outputPath} not found`);
  process.exit(1);
}

let raw;
try {
  raw = fs.readFileSync(outputPath, 'utf8');
} catch (e) {
  console.error('Guardrail error reading file:', e.message);
  process.exit(1);
}

let template;
try {
  template = JSON.parse(raw);
} catch (e) {
  console.error('Guardrail error parsing JSON:', e.message);
  process.exit(1);
}

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
