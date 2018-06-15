function print (form) {
    if (Array.isArray(form)) {
        return `(${form.map(atom => print(atom)).join(' ')})`;
    }

    const [value] = Object.values(form);

    return value;
}

module.exports = {
    pr_str: print,
}
