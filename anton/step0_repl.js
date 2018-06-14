const readline = require('readline');
const argv = require('yargs').argv;

const terminal = !!argv.terminal;

function READ (input) {
    return input;
}

function EVAL (input) {
    return input;
}

function PRINT (input) {
    return input;
}

function rep (input) {
    return PRINT(EVAL(READ(input)));
}

function loop () {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal,
        prompt: 'user> ',
    });

    rl.prompt();

    rl.on('line', (line) => {
        const data = rep(line.trim());

        data && process.stdout.write(`${data}\n`);

        rl.prompt();
    });

    rl.on('close', () => {
        process.exit(0);
    });
}

loop();

