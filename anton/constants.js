module.exports = {
  SYMBOL: 'Symbol',
  NUMBER: 'Number',
  COMMENT: ';',
  MACROS: {
    QUOTE: {
      symbol: '\'',
      literal: 'quote',
    },
    QUASI: {
      symbol: '`',
      literal: 'quasiquote',
    },
    UNQUOTE: {
      symbol: '~',
      literal: 'unquote',
    },
    DEREF: {
      symbol: '@',
      literal: 'deref',
    },
    SPLICE: {
      symbol: '~@',
      literal: 'splice-unquote',
    },
  },
  LIST_TYPES: {
    LIST: { L: '(', R: ')', type: 'LIST' },
    VECT: { L: '[', R: ']', type: 'VECT' },
    HMAP: { L: '{', R: '}', type: 'HMAP' },
  },
};
