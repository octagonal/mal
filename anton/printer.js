const { LIST_TYPES } = require('./constants');

function print(form) {
  if (Array.isArray(form)) {
    const listType = LIST_TYPES[form.type];

    return `${listType.L}${form.map(atom => print(atom)).join(' ')}${listType.R}`;
  }

  return form.atom;
}

module.exports = {
  pr_str: print,
};
