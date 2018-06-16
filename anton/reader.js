/*
  Input:
  (+ 2 (* 3 4))

  Struct:
          List
         / |  \
        /  |   \
       /   |    \
  Sym:+  Int:2  List
               / |  \
              /  |   \
             /   |    \
         Sym:*  Int:3  Int:4

  Output:
  ['+' 2 ['*' 3 4]]
*/

const constants = require('./constants');
const { isNumeric, head, rest } = require('./util');

const PLEFT = '(';
const PRIGHT = ')';

function readAtom (atom) {
    if (isNumeric(atom)) {
        return { type: constants.NUMBER, atom };
    }

    return { type: constants.SYMBOL, atom };

    throw Error('Unsupported type');
}

function readList (list, processTokens) {
    if (processTokens.length === 0) {
        throw Error(`expected ${PRIGHT}, got EOF`);
    }

    if (head(processTokens) === PRIGHT) {
        return [list, rest(processTokens)];
    }

    const [item, restTokens] = readForm(processTokens);

    return readList([...list, item], restTokens);
}

function readForm (tokens) {
    if (head(tokens) === PLEFT) {
        const [list, remainingTokens] = readList([], rest(tokens));
        return [list, remainingTokens];
    }

    const expand = (expansion) => {
        const [list, remainingTokens] = readForm(rest(tokens));
        return [[readAtom(expansion), list], remainingTokens];
    };

    switch(head(tokens)) {
        case constants.QUOTE:
            return expand('quote');
        case constants.QUASI:
            return expand('quasiquote');
        case constants.UNQUOTE:
            return expand('unquote');
        case constants.SPLICE:
            return expand('splice-unquote');
        default:
            return [readAtom(head(tokens)), rest(tokens)];
    }
}

function tokenizer (input) {
    const tokens = /[\s,]*(~@|[\[\]{}()'`~^@]|"(?:\\.|[^\\"])*"|;.*|[^\s\[\]{}('"`,;)]+)/g;

    const getMatches = (matches = []) => {
        const match = tokens.exec(input);
        return match ? getMatches([...matches, match[1]]) : matches;
    };

    return getMatches();
}

function readStr (line) {
    const [form, remainingTokens] = readForm(tokenizer(line));

    if(remainingTokens.length) {
        throw Error(`expected ${PLEFT}, got EOF`);
    }

    return form;
}


module.exports = {
    read_str: readStr
};
