#!/usr/bin/env node
import process from 'process';
import { Console } from 'node:console';
const console = new Console(process.stdout, process.stderr);
import fs from 'fs';
import path from 'path';
import * as glob from 'glob';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { OpenAI } from 'openai';

// Helper: scan files
function scanFiles(rootDir) {
  // Scan all .js, .ts, and package.json files recursively in the given directory
  let tsFiles = glob.sync(path.join(rootDir, '**/*.ts'));
  let jsFiles = glob.sync(path.join(rootDir, '**/*.js'));
  const pkgFiles = glob.sync(path.join(rootDir, '**/package.json'));
  // Exclude all files in the CLI project from analysis
  // Exclude all files in the CLI project directory from analysis
  // const cliProjectDir = path.dirname(new URL(import.meta.url).pathname); // Not used, removed for compatibility
  const targetSrcDir = path.join(path.resolve(rootDir), 'src');
  tsFiles = tsFiles.filter(f => path.resolve(f).startsWith(targetSrcDir));
  jsFiles = jsFiles.filter(f => path.resolve(f).startsWith(targetSrcDir));
  return { tsFiles, jsFiles, pkgFiles };
}

// Helper: run ESLint
function runESLint(files) {
  try {
    // Only lint files in src folder, prefer .ts if no .js files
    // Determine the src directory of the target repo
    const targetDir = path.dirname(files[0])?.split('src')[0] || process.argv[2] || '.';
    const lintPatterns = [];
    const hasJs = files.some(f => f.endsWith('.js'));
    const hasTs = files.some(f => f.endsWith('.ts'));
    if (hasJs) lintPatterns.push('src/**/*.js');
    if (hasTs) lintPatterns.push('src/**/*.ts');
    if (!lintPatterns.length) return 'No JS or TS files found to lint.';
    // Check for ESLint config file before running
    const eslintConfigPath = path.join(targetDir, 'eslint.config.js');
    if (!fs.existsSync(eslintConfigPath)) {
      return 'Warning: ESLint config file (eslint.config.js) not found in target project. Skipping linting.\nSee https://eslint.org/docs/latest/use/configure/migration-guide for migration info.';
    }
    const lintCmd = `npx eslint ${lintPatterns.join(' ')}`;
    const result = execSync(lintCmd, { encoding: 'utf8', cwd: targetDir });
    return result;
  } catch {
    return 'Error running ESLint.';
  }
}

// Helper: check outdated dependencies
function checkOutdatedDeps(pkgPath) {
  try {
    const result = execSync(`npm outdated --json`, { cwd: path.dirname(pkgPath), encoding: 'utf8' });
    return JSON.parse(result);
  } catch (err) {
    return {};
  }
}

// Helper: call OpenAI for deeper analysis
async function gptAnalyze(code, staticResults, openaiApiKey) {
  const openai = new OpenAI({ apiKey: openaiApiKey });
  const prompt = `Analyze the following code for tech debt. Static analysis: ${staticResults}. Code: ${code}`;
  const completion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'gpt-4',
    max_tokens: 500
  });
  return completion.choices[0].message.content;
}

// Helper: generate report
function generateReport({ tsFiles, jsFiles, pkgFiles }, lintResults, outdatedDeps, gptResults) {
  const totalFiles = tsFiles.length + jsFiles.length + pkgFiles.length;
  console.log(chalk.bold(`Files scanned: ${totalFiles}`));
  // Log issues and suggested fixes in a concise format
  lintResults.forEach(res => {
    const lines = res.split('\n');
    lines.forEach(line => {
      if (line.match(/warning|error|deprecated|outdated|callback|untyped|missing|style|security/i)) {
        console.log(`- ❌ Issue: ${line.trim()}`);
      }
      if (line.match(/suggest(ed|ion)|fix|replace|convert|update|run/i)) {
        console.log(`- ✅ Suggested fix: ${line.trim()}`);
      }
    });
  });
  if (Object.keys(outdatedDeps).length) {
    for (const [dep, info] of Object.entries(outdatedDeps)) {
      console.log(`- ❌ Issue: "${dep}": "${info.current}" (outdated, latest is "${info.latest}")`);
      console.log(`- ✅ Suggested fix: run \`npm install ${dep}@latest\``);
    }
  }
  if (gptResults.length) {
    gptResults.forEach(res => {
      const lines = res.split('\n');
      lines.forEach(line => {
        if (line.match(/issue|debt|problem|callback|untyped|missing|style|security|hardcoded|magic string|lack|no/i)) {
          console.log(`- ❌ Issue: ${line.trim()}`);
        }
        if (line.match(/suggest(ed|ion)|fix|replace|convert|update|run|refactor|add|improve|use/i)) {
          console.log(`- ✅ Suggested fix: ${line.trim()}`);
        }
      });
    });
  }
  return '';
}

// Main CLI
async function main() {
  const rootDir = process.argv[2] || '.';
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error(chalk.red('Missing OPENAI_API_KEY environment variable.'));
    process.exit(1);
  }
  const files = scanFiles(rootDir);
  const lintResults = [];
  if (files.tsFiles.length || files.jsFiles.length) {
    lintResults.push(runESLint([...files.tsFiles, ...files.jsFiles]));
  }
  let outdatedDeps = {};
  if (files.pkgFiles.length) {
    outdatedDeps = checkOutdatedDeps(files.pkgFiles[0]);
  }
  // GPT analysis for each file
  const gptResults = [];
  for (const file of [...files.tsFiles, ...files.jsFiles].slice(0, 3)) { // limit for demo
  const code = fs.readFileSync(file, 'utf8');
    // Limit code chunk to first 200 lines or 4000 characters
    const codeChunk = code.split('\n').slice(0, 200).join('\n').slice(0, 4000);
    const staticResult = lintResults.join('\n').slice(0, 2000);
    const gptRes = await gptAnalyze(codeChunk, staticResult, openaiApiKey);
    gptResults.push(`### ${file}\n${gptRes}`);
  }
  generateReport(files, lintResults, outdatedDeps, gptResults);
  console.log(chalk.green('Tech Debt Report logged above.'));
}

main();
