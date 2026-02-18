const getExpectedKeystrokes = (text) => {
    const tokens = text.match(/(\d+|\+|\-|\*|\/|x|÷)/g);
    if (!tokens) return [];

    const keys = [];
    tokens.forEach(token => {
        if (/\d+/.test(token)) {
            keys.push(...token.split(''));
        } else if (token === '+' || token === '-') {
            keys.push(token);
        } else if (token === '*' || token === 'x' || token === '×') {
            keys.push('*'); // Map to keyboard *
        } else if (token === '/' || token === '÷') {
            keys.push('/'); // Map to keyboard /
        }
    });
    keys.push('Enter');
    return keys;
};

const testCases = [
    "12 + 5",
    "42 - 26",
    "10 × 5",
    "100 ÷ 10",
    "(12 × 5) + (3 × 2)" // Memory logic
];

testCases.forEach(t => {
    console.log(`Text: "${t}"`);
    console.log(`Keys: ${JSON.stringify(getExpectedKeystrokes(t))}`);
});
