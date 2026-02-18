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
            onInputRef.current?.(digit);
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
            onInputRef.current?.('.');
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
            onInputRef.current?.('Backspace');
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
                        display: String(newValue).slice(0, 12),
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
            onInputRef.current?.(nextOperator || '');
        });
    };

    const calculateResult = () => {
        processInput(() => {
            setState(prev => {
                // If no operation pending, just update lastCalculated to signal completion
                if (!prev.operator || prev.currentValue === null) {
                    return {
                        ...prev,
                        lastCalculated: Date.now()
                    };
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
                    display: String(newValue).slice(0, 12),
                    currentValue: null,
                    operator: null,
                    waitingForOperand: true,
                    lastCalculated: Date.now()
                };
            });
            onInputRef.current?.('Enter');
        });
    };

    const memoryAdd = () => {
        processInput(() => {
            setState(prev => ({
                ...prev,
                memory: prev.memory + parseFloat(prev.display),
                waitingForOperand: true // Usually acts like hitting equals or completing an input
            }));
            onInputRef.current?.('m+');
        });
    };

    const memorySub = () => {
        processInput(() => {
            setState(prev => ({
                ...prev,
                memory: prev.memory - parseFloat(prev.display),
                waitingForOperand: true
            }));
            onInputRef.current?.('m-');
        });
    };

    const memoryRecallClear = () => {
        processInput(() => {
            setState(prev => {
                // If memory is on display, clear it. If not, recall it.
                // Standard behavior: First press recalls, second press clears.
                // For simplicity/UCAT behavior: check if we just recalled? 
                // UCAT usually: MRC displays memory. If pressed again (or if memory is 0?), might clear.
                // Let's implement Recalls Memory. 
                // Note: The prompt says "Backspace maps to Clear", but "Mrc" helps solving.
                // Let's stick to standard: Recall. User can clear by other means or implement double-click logic if needed.
                // Actually, often MRC clears if held or double pressed. Let's Simple Recall for now.

                return {
                    ...prev,
                    display: String(prev.memory),
                    waitingForOperand: true
                };
            });
            onInputRef.current?.('mrc');
        });
    };

    const sqrt = () => {
        processInput(() => {
            setState(prev => ({
                ...prev,
                display: String(Math.sqrt(parseFloat(prev.display))).slice(0, 12),
                waitingForOperand: true
            }));
            onInputRef.current?.('sqrt');
        });
    };

    const percentage = () => {
        processInput(() => {
            setState(prev => {
                const currentValue = parseFloat(prev.display);
                const newValue = currentValue / 100;
                return {
                    ...prev,
                    display: String(newValue).slice(0, 12),
                    waitingForOperand: true
                };
            });
            onInputRef.current?.('%');
        });
    };

    const toggleSign = () => {
        processInput(() => {
            setState(prev => {
                const currentValue = parseFloat(prev.display);
                const newValue = currentValue * -1;
                return {
                    ...prev,
                    display: String(newValue).slice(0, 12),
                    waitingForOperand: true // Usually acts as a completed input for that number
                };
            });
            onInputRef.current?.('±');
        });
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const { key } = event;

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
