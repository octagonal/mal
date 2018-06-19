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

const { MACROS, SYMBOL, NUMBER, LIST_TYPES, COMMENT } = require('./constants');
const { isNumeric, head, rest } = require('./util');

const LIST = LIST_TYPES.LIST;
const VECT = LIST_TYPES.VECT;
const HMAP = LIST_TYPES.HMAP;

function readAtom(atom) {
  if (isNumeric(atom)) {
    return { type: NUMBER, atom };
  }

  return { type: SYMBOL, atom };
}


function readList(list, processTokens, separator = LIST) {
  if (head(processTokens) === separator.R) {
    const finishedList = list;
    finishedList.type = separator.type;
    return [finishedList, rest(processTokens)];
  }

  const [item, restTokens] = readForm(processTokens, false, separator);

  return readList([...list, item], restTokens, separator);
}

function readForm(tokens, ensureTerm, separator = LIST) {
  const listStart = [LIST, VECT, HMAP].find(el => head(tokens) === el.L);

  if (listStart) {
    if (!rest(tokens).length) {
      throw Error(`expected ${listStart.R}, got EOF`);
    }

    const [list, remainingTokens] = readList([], rest(tokens), listStart);

    if (ensureTerm && remainingTokens.length) {
      throw Error(`unexpected "${remainingTokens.join(' ')}"`);
    }

    return [list, remainingTokens];
  }

  if (!tokens.length) throw Error(`expected ${separator.R}, got EOF`);

  const expand = (expansion) => {
    const [, remainingTokens] = readForm(rest(tokens), ensureTerm);
    return [readList([readAtom(expansion)], [LIST.R])[0], remainingTokens];
  };

  const macroFind = Object.values(MACROS).find(macro => head(tokens) === macro.symbol);
  if (macroFind) return expand(macroFind.literal);

  if (ensureTerm && tokens.length > 1 && !head(rest(tokens)).startsWith(COMMENT, 0)) {
    throw Error(`unexpected "${rest(tokens).join(' ')}"`);
  }

  return [readAtom(head(tokens)), rest(tokens)];
}

function tokenizer(input) {
  const tokens = /[\s,]*(~@|[\[\]{}()'`~^@]|"(?:\\.|[^\\"])*"|;.*|[^\s\[\]{}('"`,;)]+)/g;

  const getMatches = (matches = []) => {
    const match = tokens.exec(input);
    return match ? getMatches([...matches, match[1]]) : matches;
  };

  return getMatches();
}

function readStr(line) {
  const [form] = readForm(tokenizer(line), true);

  return form;
}


module.exports = {
  read_str: readStr,
};
