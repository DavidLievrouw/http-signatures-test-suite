'use strict';

const path = require('path');
const fs = require('fs');
const {exec} = require('child_process');

async function generate(file, options) {
  options = options || {};
  const filePath = path.join(__dirname, 'input', `${file}.httpMessage`);
  const date = options.date || new Date().toGMTString();
  const latestDate = `Date: ${date}`;
  let args = '';
  for(const key in options.args) {
    let value = options.args[key];
    if(Array.isArray(value)) {
      value = `--${key} "${value.join(' ')}" `;
    } else {
      value = `--${key} ${value} `;
    }
    args += value;
  }
  // this cat filePath - the dash is the last pipe op
  const inputStr = `${latestDate}\n\n{"hello": "world"}`;
  const httpMessage = fs.readFileSync(filePath, 'utf8') + inputStr;
  const binaryOps = `"${options.generator}" ${options.command} `;
  const command = binaryOps + args;
  const result = await runTest(command, httpMessage);
  return result;
}

function runTest(command, httpMessage) {
  return new Promise((resolve, reject) => {
    const child = exec(command);
    child.stdin.end(httpMessage);
    const streams = Promise.all([
      streamToString(child.stdout),
      streamToString(child.stderr)
    ]);
    child.addListener('exit', async code => {
      const [stdout, stderr] = await streams;
      if(code === 0) {
        resolve(stdout);
      } else {
        const error = new Error(
          `Driver exited with error code ${code}. \n ${stderr}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

function streamToString(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(chunks.join('')));
  });
}

function getUnixTime({time = Date.now()} = {}) {
  return time / 1000 | 0;
}

module.exports = {
  generate,
  getUnixTime
};
