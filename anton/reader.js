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

const PLEFT = '(';
const PRIGHT = ')';

function readAtom (atom) {
    function isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    if (isNumeric(atom)) {
        return { Num: atom };
    }

    return { Sym: atom };

    throw Error('Unsupported type');
}

function head ([headToken]) {
    return headToken;
}

function rest ([,...restTokens]) {
    return restTokens;
}

function readList (list, processTokens) {
    if (processTokens.length === 0) {
        throw Error(`Unmatched ${PLEFT}`);
    }

    if (head(processTokens) === PRIGHT) {
        return [list, rest(processTokens)];
    }

    const [item, restTokens] = readForm(processTokens);

    return readList([...list, item], restTokens);
}

function readForm (tokens) {
    if (head(tokens) === PLEFT) {
        return readList([], rest(tokens));
    }

    return [readAtom(head(tokens)), rest(tokens)];
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
        throw Error(`Unmatched ${PRIGHT}`);
    }

    return form;
}


module.exports = {
    read_str: readStr
};
