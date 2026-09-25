import { useEffect, useRef, useState } from "react";
import art from "./calculator.svg?raw";
import { calculatorPress, initialCalculatorState } from "./calculatorMachine";

const faceKeys = [
  "NEGATIVE",
  "SQRT",
  "PERCENT",
  "DIVIDE",
  "MRC",
  "MMINUS",
  "MPLUS",
  "MULTIPLY",
  "7",
  "8",
  "9",
  "SUBTRACT",
  "4",
  "5",
  "6",
  "ADD",
  "1",
  "2",
  "3",
  "EQUALS",
  "ONCLEAR",
  "0",
  "DECIMAL",
];

// Calculator state lives in this component only, so it resets whenever the
// calculator is closed (the dialog unmounts it).
export function Calculator({ close }: { close: () => void }) {
  const [state, setState] = useState(initialCalculatorState);
  const bodyRef = useRef<HTMLDivElement>(null);
  function press(key: string) {
    setState((previous) => calculatorPress(previous, key));
  }
  useEffect(() => {
    const fn = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable]:not([contenteditable='false'])",
        )
      )
        return;
      const button = target?.closest("button");
      if (button) {
        // Enter and Space activate the focused button itself.
        if (event.key === "Enter" || event.key === " ") return;
        // Only buttons inside the calculator dialog pass keys to the calculator.
        const dialog = bodyRef.current?.closest("[role='dialog']");
        if (!dialog?.contains(button)) return;
      }
      const map: Record<string, string> = {
        "+": "ADD",
        "-": "SUBTRACT",
        "*": "MULTIPLY",
        "/": "DIVIDE",
        "=": "EQUALS",
        Enter: "EQUALS",
        ".": "DECIMAL",
        Escape: "CLOSE",
        Backspace: "BACK",
        Delete: "ONCLEAR",
        "%": "PERCENT",
      };
      const key = /^\d$/.test(event.key) ? event.key : map[event.key];
      if (!key) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (key === "CLOSE") close();
      else press(key);
    };
    window.addEventListener("keydown", fn, true);
    return () => window.removeEventListener("keydown", fn, true);
  });
  return (
    <div ref={bodyRef} className="calc-body">
      <div className="calc-art" dangerouslySetInnerHTML={{ __html: art }} />
      <output
        aria-live="polite"
        aria-label="Calculator display"
        className="calc-display"
      >
        {state.memory !== 0 && <small>M </small>}
        {state.display}
      </output>
      <div className="calc-hit-grid" aria-label="Calculator keypad">
        {faceKeys.map((key) => (
          <button
            key={key}
            className={key === "EQUALS" ? "equals-hit" : ""}
            aria-label={key}
            onClick={() => press(key)}
          />
        ))}
      </div>
      <p className="sr-only">
        Use digits, arithmetic operators, Enter, decimal point, percent,
        Backspace and Delete. MRC recalls memory and clears it when pressed
        twice.
      </p>
    </div>
  );
}
