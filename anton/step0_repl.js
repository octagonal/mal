const readline = require('readline');

function read (input) {
    return input;
}

function eeval (input) {
    return input;
}

function print (input) {
    return input;
}

function rep (input) {
    return print(eeval(read(input)));
}

function loop () {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'user> '
    });

    const PRESERVE_CURSORPOS = false;
    const prompt = () => rl.prompt(PRESERVE_CURSORPOS);
    prompt();

    rl.on('line', (line) => {
        const data = rep(line.trim());

        data && process.stdout.write(data + '\r\n');

        prompt();
    });

    rl.on('close', () => {
        process.exit(0);
    });
}

loop();

