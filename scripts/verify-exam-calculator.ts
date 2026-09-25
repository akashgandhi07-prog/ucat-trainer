import assert from "node:assert/strict";
import {
  calculatorPress,
  initialCalculatorState,
} from "../src/exam-simulator/calculatorMachine";
const enter = (keys: string[]) =>
  keys.reduce(calculatorPress, initialCalculatorState);
assert.equal(enter(["2", "ADD", "3", "EQUALS"]).display, "5");
assert.equal(enter(["2", "ADD", "3", "MULTIPLY", "4", "EQUALS"]).display, "20");
assert.equal(
  enter(["1", "DECIMAL", "5", "MULTIPLY", "2", "EQUALS"]).display,
  "3",
);
assert.equal(
  enter(["1", "0", "0", "ADD", "1", "0", "PERCENT", "EQUALS"]).display,
  "110",
);
assert.equal(
  enter(["1", "0", "0", "SUBTRACT", "2", "0", "PERCENT", "EQUALS"]).display,
  "80",
);
assert.equal(enter(["9", "SQRT"]).display, "3");
assert.equal(enter(["9", "NEGATIVE", "SQRT"]).display, "Error");
assert.equal(enter(["8", "DIVIDE", "0", "EQUALS"]).display, "Error");
assert.equal(enter(["2", "ADD", "3", "EQUALS", "EQUALS"]).display, "8");
assert.equal(enter(["9", "ADD", "MULTIPLY", "2", "EQUALS"]).display, "18");
assert.equal(enter(["1", "2", "3", "BACK"]).display, "12");
assert.equal(
  enter(["1", "0", "0", "MULTIPLY", "2", "5", "PERCENT", "EQUALS"]).display,
  "25",
);
assert.equal(
  enter(["1", "0", "0", "DIVIDE", "2", "5", "PERCENT", "EQUALS"]).display,
  "400",
);
const memory = enter(["4", "2", "MPLUS", "ONCLEAR", "MRC"]);
assert.equal(memory.display, "42");
assert.equal(memory.memory, 42);
assert.equal(calculatorPress(memory, "MRC").memory, 0);
// Recalled, percentage and sign-changed results are fresh: the next digit starts a new number.
assert.equal(enter(["1", "2", "MPLUS", "ONCLEAR", "MRC", "3"]).display, "3");
assert.equal(
  enter(["1", "2", "MPLUS", "ONCLEAR", "7", "ADD", "MRC", "3", "EQUALS"])
    .display,
  "10",
);
assert.equal(enter(["5", "0", "ADD", "1", "0", "PERCENT", "5"]).display, "5");
assert.equal(
  enter(["5", "0", "ADD", "1", "0", "PERCENT", "5", "EQUALS"]).display,
  "55",
);
assert.equal(enter(["2", "ADD", "3", "EQUALS", "NEGATIVE"]).display, "-5");
assert.equal(enter(["2", "ADD", "3", "EQUALS", "NEGATIVE", "4"]).display, "4");
assert.equal(enter(["1", "2", "NEGATIVE", "3"]).display, "-123");
assert.equal(enter(["5", "ADD", "3", "NEGATIVE", "EQUALS"]).display, "2");
assert.equal(enter(["2", "0", "PERCENT", "DECIMAL", "5"]).display, "0.5");
assert.equal(enter(["2", "0", "PERCENT", "BACK"]).display, "0.2");
console.log(
  "Calculator checks passed: arithmetic, chaining, percentages, errors, repeat equals, memory and fresh entry after results.",
);
