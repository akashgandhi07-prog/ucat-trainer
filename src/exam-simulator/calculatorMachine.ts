export type CalculatorState = {
  display: string;
  accumulator: number | null;
  operator: Operator | null;
  waitingForOperand: boolean;
  memory: number;
  lastOperator: Operator | null;
  lastOperand: number | null;
  recallArmed: boolean;
  /** The display holds a computed or recalled value: the next digit starts a new number. */
  freshEntry: boolean;
};
type Operator = "ADD" | "SUBTRACT" | "MULTIPLY" | "DIVIDE";
export const initialCalculatorState: CalculatorState = {
  display: "0",
  accumulator: null,
  operator: null,
  waitingForOperand: false,
  memory: 0,
  lastOperator: null,
  lastOperand: null,
  recallArmed: false,
  freshEntry: false,
};
const valueOf = (display: string) =>
  Number.isFinite(Number(display)) ? Number(display) : 0;
export function formatCalculatorNumber(value: number) {
  if (!Number.isFinite(value)) return "Error";
  if (Object.is(value, -0)) return "0";
  const precise = Number(value.toPrecision(10));
  const text = String(precise);
  return text.length <= 12 ? text : precise.toExponential(6);
}
function calculate(left: number, operator: Operator, right: number) {
  if (operator === "ADD") return left + right;
  if (operator === "SUBTRACT") return left - right;
  if (operator === "MULTIPLY") return left * right;
  return right === 0 ? Number.NaN : left / right;
}
function shown(
  state: CalculatorState,
  value: number,
  waiting = true,
  fresh = false,
): CalculatorState {
  return {
    ...state,
    display: formatCalculatorNumber(value),
    waitingForOperand: waiting,
    recallArmed: false,
    freshEntry: fresh,
  };
}
export function calculatorPress(
  state: CalculatorState,
  key: string,
): CalculatorState {
  if (/^\d$/.test(key)) {
    const display =
      state.waitingForOperand ||
      state.freshEntry ||
      state.display === "0" ||
      state.display === "Error"
        ? key
        : (state.display + key).slice(0, 12);
    return {
      ...state,
      display,
      waitingForOperand: false,
      recallArmed: false,
      freshEntry: false,
    };
  }
  if (key === "DECIMAL") {
    if (
      state.waitingForOperand ||
      state.freshEntry ||
      state.display === "Error"
    )
      return {
        ...state,
        display: "0.",
        waitingForOperand: false,
        recallArmed: false,
        freshEntry: false,
      };
    return state.display.includes(".")
      ? state
      : { ...state, display: state.display + ".", recallArmed: false };
  }
  if (key === "ONCLEAR")
    return { ...initialCalculatorState, memory: state.memory };
  if (key === "MC") return { ...state, memory: 0, recallArmed: false };
  if (key === "BACK") {
    if (
      state.waitingForOperand ||
      state.freshEntry ||
      state.display === "Error"
    )
      return state;
    const display = state.display.length > 1 ? state.display.slice(0, -1) : "0";
    return {
      ...state,
      display: display === "-" ? "0" : display,
      recallArmed: false,
    };
  }
  const current = valueOf(state.display);
  if (key === "NEGATIVE")
    return shown(
      state,
      -current,
      false,
      state.waitingForOperand || state.freshEntry,
    );
  if (key === "SQRT")
    return shown(state, current < 0 ? Number.NaN : Math.sqrt(current));
  if (key === "MPLUS")
    return {
      ...state,
      memory: state.memory + current,
      waitingForOperand: true,
      recallArmed: false,
    };
  if (key === "MMINUS")
    return {
      ...state,
      memory: state.memory - current,
      waitingForOperand: true,
      recallArmed: false,
    };
  if (key === "MRC")
    return state.recallArmed
      ? { ...state, memory: 0, recallArmed: false }
      : {
          ...state,
          display: formatCalculatorNumber(state.memory),
          waitingForOperand: false,
          recallArmed: true,
          freshEntry: true,
        };
  if (key === "PERCENT") {
    const result =
      state.operator &&
      state.accumulator !== null &&
      ["ADD", "SUBTRACT"].includes(state.operator)
        ? (state.accumulator * current) / 100
        : current / 100;
    return shown(state, result, false, true);
  }
  if (["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"].includes(key)) {
    const nextOperator = key as Operator;
    if (state.display === "Error")
      return {
        ...initialCalculatorState,
        memory: state.memory,
        operator: nextOperator,
        waitingForOperand: true,
      };
    if (state.accumulator === null)
      return {
        ...state,
        accumulator: current,
        operator: nextOperator,
        waitingForOperand: true,
        lastOperator: null,
        lastOperand: null,
        recallArmed: false,
      };
    if (state.operator && !state.waitingForOperand) {
      const result = calculate(state.accumulator, state.operator, current);
      return {
        ...shown(state, result),
        accumulator: Number.isFinite(result) ? result : null,
        operator: Number.isFinite(result) ? nextOperator : null,
        lastOperator: null,
        lastOperand: null,
      };
    }
    return {
      ...state,
      operator: nextOperator,
      waitingForOperand: true,
      recallArmed: false,
    };
  }
  if (key === "EQUALS") {
    if (state.operator && state.accumulator !== null) {
      const operand = state.waitingForOperand ? state.accumulator : current;
      const result = calculate(state.accumulator, state.operator, operand);
      return {
        ...shown(state, result),
        accumulator: null,
        operator: null,
        lastOperator: state.operator,
        lastOperand: operand,
      };
    }
    if (state.lastOperator && state.lastOperand !== null)
      return shown(
        state,
        calculate(current, state.lastOperator, state.lastOperand),
      );
  }
  return state;
}
