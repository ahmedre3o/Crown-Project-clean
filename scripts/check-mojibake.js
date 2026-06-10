#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGETS = [
  path.join(ROOT, 'backend', 'api.ts'),
  path.join(ROOT, 'backend', 'i18n', 'ar.ts'),
  path.join(ROOT, 'backend', 'i18n', 'en.ts'),
];

// Mojibake markers
const pattern = /Ø|Ã|â€|�|أک|™|Â|ï»¿/;

let hasError = false;

for (const file of TARGETS) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (pattern.test(line)) {
      hasError = true;
      console.error(`[mojibake] ${path.relative(ROOT, file)}:${idx + 1}: ${line.slice(0, 200)}`);
    }
  });
}

if (hasError) {
  console.error('Mojibake markers found. Failing.');
  process.exit(1);
}

console.log('No mojibake markers detected.');
