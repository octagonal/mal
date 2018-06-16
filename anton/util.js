function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function head ([headToken]) {
    return headToken;
}

function rest ([,...restTokens]) {
    return restTokens;
}

module.exports = {
    isNumeric,
    head,
    rest,
}
