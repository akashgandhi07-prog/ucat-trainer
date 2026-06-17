import { useState, useEffect, useCallback, useRef } from 'react';

type Operator = '+' | '-' | '*' | '/' | null;

interface CalculatorState {
    display: string;
    currentValue: number | null;
    operator: Operator;
    waitingForOperand: boolean;
    memory: number;
    lastCalculated: number;
}

interface UseCalculatorLogicProps {
    lagEnabled: boolean;
    onInput?: (key: string) => void;
}

const LAG_MS = 40;

/** Cap length and surface non-finite results (÷0, overflow) as the real calculator's "Error". */
function formatDisplay(value: number): string {
    if (!Number.isFinite(value)) return 'Error';
    return String(value).slice(0, 12);
}

export const useCalculatorLogic = ({ lagEnabled, onInput }: UseCalculatorLogicProps) => {
    const [state, setState] = useState<CalculatorState>({
        display: '0',
        currentValue: null,
        operator: null,
        waitingForOperand: false,
        memory: 0,
        lastCalculated: 0
    });

    const onInputRef = useRef(onInput);

    useEffect(() => {
        onInputRef.current = onInput;
    }, [onInput]);

    // Tracks whether the immediately-previous action was an MRC press, so a second
    // consecutive MRC clears memory (standard basic-calculator behaviour). Any other
    // key resets it via emit().
    const lastWasRecallRef = useRef(false);
    const emit = useCallback((key: string) => {
        if (key !== 'mrc') lastWasRecallRef.current = false;
        onInputRef.current?.(key);
    }, []);

    const processInput = useCallback((action: () => void) => {
        if (lagEnabled) {
            setTimeout(action, LAG_MS);
        } else {
            action();
        }
    }, [lagEnabled]);

    const inputDigit = (digit: string) => {
        processInput(() => {
            setState(prev => {
                if (prev.waitingForOperand) {
                    return {
                        ...prev,
                        display: digit,
                        waitingForOperand: false
                    };
                }
                const newDisplay = prev.display === '0' ? digit : prev.display + digit;
                // Limit display length to realistic calculator limits (e.g., 12 digits)
                if (newDisplay.length > 12) return prev;
                return {
                    ...prev,
                    display: newDisplay
                };
            });
            emit(digit);
        });
    };

    const inputDot = () => {
        processInput(() => {
            setState(prev => {
                if (prev.waitingForOperand) {
                    return {
                        ...prev,
                        display: '0.',
                        waitingForOperand: false
                    };
                }
                if (prev.display.indexOf('.') === -1) {
                    return {
                        ...prev,
                        display: prev.display + '.'
                    };
                }
                return prev;
            });
            emit('.');
        });
    };

    const clearDisplay = () => {
        processInput(() => {
            setState(prev => ({
                ...prev,
                display: '0',
                currentValue: null,
                operator: null,
                waitingForOperand: false
            }));
            emit('Backspace');
        });
    };

    const performOperation = (nextOperator: Operator) => {
        processInput(() => {
            setState(prev => {
                const inputValue = parseFloat(prev.display);

                if (prev.currentValue === null) {
                    return {
                        ...prev,
                        currentValue: inputValue,
                        operator: nextOperator,
                        waitingForOperand: true
                    };
                }

                if (prev.operator && !prev.waitingForOperand) {
                    // Sequential Logic: Execute current operation immediately
                    // UCAT calculators do NOT follow BIDMAS/PEMDAS. They calculate continuously.
                    let newValue = prev.currentValue;
                    switch (prev.operator) {
                        case '+': newValue += inputValue; break;
                        case '-': newValue -= inputValue; break;
                        case '*': newValue *= inputValue; break;
                        case '/': newValue /= inputValue; break;
                    }

                    return {
                        ...prev,
                        currentValue: newValue,
                        display: formatDisplay(newValue),
                        operator: nextOperator,
                        waitingForOperand: true
                    };
                }

                // If we just hit an operator after another, usually we update the operator
                return {
                    ...prev,
                    operator: nextOperator,
                    waitingForOperand: true
                };
            });
            emit(nextOperator || '');
        });
    };

    const calculateResult = () => {
        processInput(() => {
            setState(prev => {
                // No operation pending: a stray/extra "=" press. Do NOT bump
                // lastCalculated here — drills auto-advance on every change to it, so
                // signalling a non-calculation would re-submit the current display
                // against the next question and mark it wrong.
                if (!prev.operator || prev.currentValue === null) {
                    return prev;
                }

                const inputValue = parseFloat(prev.display);
                let newValue = prev.currentValue;

                switch (prev.operator) {
                    case '+': newValue += inputValue; break;
                    case '-': newValue -= inputValue; break;
                    case '*': newValue *= inputValue; break;
                    case '/': newValue /= inputValue; break;
                }

                return {
                    ...prev,
                    display: formatDisplay(newValue),
                    currentValue: null,
                    operator: null,
                    waitingForOperand: true,
                    lastCalculated: Date.now()
                };
            });
            emit('Enter');
        });
    };

    const memoryAdd = () => {
        processInput(() => {
            setState(prev => ({
                ...prev,
                memory: prev.memory + parseFloat(prev.display),
                waitingForOperand: true // Usually acts like hitting equals or completing an input
            }));
            emit('m+');
        });
    };

    const memorySub = () => {
        processInput(() => {
            setState(prev => ({
                ...prev,
                memory: prev.memory - parseFloat(prev.display),
                waitingForOperand: true
            }));
            emit('m-');
        });
    };

    const memoryRecallClear = () => {
        processInput(() => {
            // Standard MRC: first press recalls memory to the display, a second
            // consecutive press clears the memory. Decide synchronously off the ref so
            // the two presses don't race the functional setState.
            const isSecondPress = lastWasRecallRef.current;
            setState(prev =>
                isSecondPress
                    ? { ...prev, memory: 0, display: '0', waitingForOperand: true }
                    : { ...prev, display: formatDisplay(prev.memory), waitingForOperand: true }
            );
            lastWasRecallRef.current = !isSecondPress;
            emit('mrc');
        });
    };

    const sqrt = () => {
        processInput(() => {
            setState(prev => ({
                ...prev,
                display: formatDisplay(Math.sqrt(parseFloat(prev.display))),
                waitingForOperand: true
            }));
            emit('sqrt');
        });
    };

    const percentage = () => {
        processInput(() => {
            setState(prev => {
                const value = parseFloat(prev.display);
                // Standard basic-calculator percentage (the model the UCAT calculator
                // follows), NOT a bare ÷100:
                //   a + b%  →  a + (a × b/100)   (markup)
                //   a − b%  →  a − (a × b/100)   (discount, e.g. "15% off")
                //   a × b%  →  a × (b/100)
                //   a ÷ b%  →  a ÷ (b/100)
                // With no pending operation it falls back to b/100.
                if (prev.operator && prev.currentValue !== null) {
                    const base = prev.currentValue;
                    if (prev.operator === '+' || prev.operator === '-') {
                        // Becomes the operand; pressing = then applies base ± thisValue.
                        return { ...prev, display: formatDisplay((base * value) / 100), waitingForOperand: false };
                    }
                    const result = prev.operator === '*' ? base * (value / 100) : base / (value / 100);
                    return {
                        ...prev,
                        display: formatDisplay(result),
                        currentValue: null,
                        operator: null,
                        waitingForOperand: true
                    };
                }
                return { ...prev, display: formatDisplay(value / 100), waitingForOperand: true };
            });
            emit('%');
        });
    };

    const toggleSign = () => {
        processInput(() => {
            setState(prev => {
                const currentValue = parseFloat(prev.display);
                const newValue = currentValue * -1;
                return {
                    ...prev,
                    display: formatDisplay(newValue),
                    waitingForOperand: true // Usually acts as a completed input for that number
                };
            });
            emit('±');
        });
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const { key } = event;

            // Don't hijack keystrokes meant for a real text field (answer inputs,
            // search boxes, contenteditable). The calculator only owns bare keypresses.
            const target = event.target as HTMLElement | null;
            if (target) {
                const tag = target.tagName;
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
                    return;
                }
            }

            // Prevent default for calculator keys to stop scrolling/browser actions
            if (['+', '-', '*', '/', 'Enter', 'Backspace'].includes(key)) {
                // event.preventDefault(); // Sometimes prevents typing in other inputs if global. 
                // Since this is global window listener, be careful. 
                // Only prevent if focused? 
                // For now, let's leave it as is but remove the state dependency.
            }

            if (/\d/.test(key)) {
                inputDigit(key);
            } else if (key === '.') {
                inputDot();
            } else if (key === 'Enter' || key === '=') {
                calculateResult();
            } else if (key === 'Backspace' || key === 'Delete' || key === 'Escape') {
                clearDisplay();
            } else if (key === '+') {
                performOperation('+');
            } else if (key === '-') {
                performOperation('-');
            } else if (key === '*') {
                performOperation('*');
            } else if (key === '/') {
                performOperation('/');
            } else if (key.toLowerCase() === 'p') {
                memoryAdd();
            } else if (key.toLowerCase() === 'm') {
                memorySub();
            } else if (key.toLowerCase() === 'c' && !event.altKey) {
                memoryRecallClear();
            } else if (key.toLowerCase() === 'x') {
                event.preventDefault();
                sqrt();
            } else if (key === '%') {
                event.preventDefault();
                percentage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-bind only when lagEnabled changes; handlers use stable logic
    }, [lagEnabled]);

    // Return checks
    return {
        display: state.display,
        inputDigit,
        inputDot,
        clearDisplay,
        performOperation,
        calculateResult,
        memoryAdd,
        memorySub,
        memoryRecallClear,
        sqrt,
        percentage,
        toggleSign,
        internalState: state // Exposing for drills to check correctness without display
    };
};
