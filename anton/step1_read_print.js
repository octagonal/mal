const readline = require('readline');
const argv = require('yargs').argv;

const { read_str } = require('./reader.js');
const { pr_str } = require('./printer.js');

const terminal = !!argv.terminal;

function READ(input) {
  return read_str(input);
}

function EVAL(input) {
  return input;
}

function PRINT(input) {
  return pr_str(input);
}

function rep(input) {
  return PRINT(EVAL(READ(input)));
}

function loop() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal,
    prompt: 'user> ',
  });

  rl.prompt();

  rl.on('line', (line) => {
    const data = line.trim();

    try {
      const form = data && rep(data);
      if (form) process.stdout.write(`${form}\n`);
    } catch (error) {
      process.stdout.write(`${error.message}\n`);
    } finally {
      rl.prompt();
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

loop();

