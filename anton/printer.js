function print (form) {
    if (Array.isArray(form)) {
        return `(${form.map(atom => print(atom)).join(' ')})`;
    }

    return form.atom;
}

module.exports = {
    pr_str: print,
}
