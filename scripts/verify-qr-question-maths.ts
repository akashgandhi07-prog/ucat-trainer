/**
 * QR trainer maths audit:
 * 1) Calculator prompt strings recomputed independently (exhaustive grids from generator ranges).
 * 2) Mental maths payloads fuzzed; each sample checked against parsed prompt recomputation.
 *
 * Run: npx tsx scripts/verify-qr-question-maths.ts
 */

import { answerFromCalculatorPrompt } from "../src/components/calculator/calculatorPromptAnswer.ts";
import {
  assertMentalMathsQuestionConsistent,
  getQuestionForStage,
} from "../src/components/mentalMaths/mathsAlgorithms.ts";

function assertEq(msg: string, a: number, b: number) {
  if (a !== b) throw new Error(`${msg}: expected ${a}, got ${b}`);
}

function verifyCalculatorPercentageGrids() {
  const easyPct = [5, 10, 15, 20, 25];
  const easyN = [20, 40, 60, 80, 100];
  for (const pct of easyPct) {
    for (const n of easyN) {
      const text = `${pct}% of ${n}`;
      const expected = Math.round((pct / 100) * n);
      assertEq(`pct easy ${text}`, expected, answerFromCalculatorPrompt(text));
    }
  }

  const medPct = [10, 15, 20, 25, 30];
  const medN = [40, 60, 80, 100, 120];
  for (const pct of medPct) {
    for (const n of medN) {
      const text = `${pct}% of ${n}`;
      const expected = Math.round((pct / 100) * n);
      assertEq(`pct medium ${text}`, expected, answerFromCalculatorPrompt(text));
    }
  }

  const hardPct = [15, 20, 25, 30, 40];
  const hardN = [80, 100, 120, 150, 200];
  for (const pct of hardPct) {
    for (const n of hardN) {
      const text = `${pct}% of ${n}`;
      const expected = Math.round((pct / 100) * n);
      assertEq(`pct hard ${text}`, expected, answerFromCalculatorPrompt(text));
    }
  }
}

function verifyCalculatorCompoundProducts() {
  for (let a = 2; a <= 16; a++) {
    for (let b = 2; b <= 13; b++) {
      for (let c = 2; c <= 16; c++) {
        for (let d = 2; d <= 13; d++) {
          const text = `(${a} × ${b}) + (${c} × ${d})`;
          const expected = a * b + c * d;
          assertEq(`compound med ${text}`, expected, answerFromCalculatorPrompt(text));
        }
      }
    }
  }

  for (let a = 3; a <= 27; a++) {
    for (let b = 2; b <= 16; b++) {
      for (let c = 3; c <= 27; c++) {
        for (let d = 2; d <= 16; d++) {
          const text = `(${a} × ${b}) + (${c} × ${d})`;
          const expected = a * b + c * d;
          assertEq(`compound hard ${text}`, expected, answerFromCalculatorPrompt(text));
        }
      }
    }
  }
}

function verifyCalculatorEasyBinary() {
  const maxA = 50;
  const maxB = 20;
  for (let a = 1; a <= maxA; a++) {
    for (let b = 1; b <= maxB; b++) {
      let x = a;
      let y = b;
      if (y > x) [x, y] = [y, x];
      assertEq(`+ ${x}+${y}`, x + y, answerFromCalculatorPrompt(`${x} + ${y}`));
      assertEq(`- ${x}-${y}`, x - y, answerFromCalculatorPrompt(`${x} - ${y}`));
      assertEq(`× ${x}×${y}`, x * y, answerFromCalculatorPrompt(`${x} × ${y}`));
      const prod = a * b;
      assertEq(`÷ ${prod}÷${a}`, b, answerFromCalculatorPrompt(`${prod} ÷ ${a}`));
    }
  }
}

function verifyCalculatorMediumBinaries() {
  const maxA = 100;
  const maxB = 50;
  for (const op of ["+", "-", "×"] as const) {
    for (let a = 1; a <= maxA; a++) {
      for (let b = 1; b <= maxB; b++) {
        if (op === "+") {
          assertEq(`med + ${a}+${b}`, a + b, answerFromCalculatorPrompt(`${a} + ${b}`));
        } else if (op === "-") {
          let x = a;
          let y = b;
          if (y > x) [x, y] = [y, x];
          assertEq(`med - ${x}-${y}`, x - y, answerFromCalculatorPrompt(`${x} - ${y}`));
        } else {
          assertEq(`med × ${a}×${b}`, a * b, answerFromCalculatorPrompt(`${a} × ${b}`));
        }
      }
    }
  }
  for (let a = 1; a <= maxA; a++) {
    for (let b = 1; b <= maxB; b++) {
      const prod = a * b;
      assertEq(`med ÷ ${prod}÷${a}`, b, answerFromCalculatorPrompt(`${prod} ÷ ${a}`));
    }
  }
}

/** Memory-style compound grid (matches generateSum("memory") ranges) */
function verifyMemoryStyleCompounds() {
  for (let a = 5; a <= 24; a++) {
    for (let b = 2; b <= 11; b++) {
      for (let c = 5; c <= 24; c++) {
        for (let d = 2; d <= 11; d++) {
          const text = `(${a} × ${b}) + (${c} × ${d})`;
          const expected = a * b + c * d;
          assertEq(`memory ${text}`, expected, answerFromCalculatorPrompt(text));
        }
      }
    }
  }
}

function fuzzMentalMaths(iterations: number) {
  for (let i = 0; i < iterations; i++) {
    for (let stage = 0; stage < 4; stage++) {
      assertMentalMathsQuestionConsistent(getQuestionForStage(stage));
    }
  }
}

console.log("verify-qr-question-maths: calculator percentage grids...");
verifyCalculatorPercentageGrids();

console.log("verify-qr-question-maths: calculator compound products...");
verifyCalculatorCompoundProducts();

console.log("verify-qr-question-maths: calculator easy binary...");
verifyCalculatorEasyBinary();

console.log("verify-qr-question-maths: calculator medium binary...");
verifyCalculatorMediumBinaries();

console.log("verify-qr-question-maths: memory-style compounds...");
verifyMemoryStyleCompounds();

console.log("verify-qr-question-maths: mental maths fuzz...");
fuzzMentalMaths(1500);

console.log("verify-qr-question-maths: all checks passed.");
