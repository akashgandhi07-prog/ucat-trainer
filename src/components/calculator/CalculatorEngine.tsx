import { useRef, useEffect, useState } from 'react';
import { useCalculatorLogic } from './useCalculatorLogic';
import './calculator.css';

interface CalculatorEngineProps {
    lagEnabled: boolean;
    onInput?: (key: string) => void;
    onStateChange?: (state: { display: string; currentValue: number | null; lastCalculated?: number }) => void;
    active: boolean; // For focus loss simulation
    hideDisplay?: boolean;
}

export const CalculatorEngine = ({ lagEnabled, onInput, onStateChange, active, hideDisplay = false }: CalculatorEngineProps) => {
    const {
        display,
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
        internalState
    } = useCalculatorLogic({ lagEnabled, onInput });

    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const elemStart = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        elemStart.current = { ...position };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPosition({
            x: elemStart.current.x + dx,
            y: elemStart.current.y + dy
        });
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // Cleanup listeners on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);
    useEffect(() => {
        if (!active && containerRef.current) {
            // Logic handled by parent or overlay, but we can double check here
        }
    }, [active]);

    const { display: internalDisplay, currentValue: internalCurrentValue, lastCalculated: internalLastCalculated } = internalState;

    useEffect(() => {
        if (onStateChange) {
            onStateChange({ display: internalDisplay, currentValue: internalCurrentValue, lastCalculated: internalLastCalculated });
        }
    }, [internalDisplay, internalCurrentValue, internalLastCalculated, onStateChange]);



    const handleBtnClick = (e: React.MouseEvent<HTMLButtonElement>, action: () => void) => {
        e.currentTarget.blur();
        action();
    };

    return (
        <div
            className={`ucat-calculator-container ${!active ? 'opacity-50 pointer-events-none' : ''}`}
            ref={containerRef}
            style={{ transform: `translate(${position.x}px, ${position.y}px)`, position: 'relative', zIndex: 100 }}
        >
            {!active && (
                <div className="inactive-overlay">
                    <span>Click to Resume</span>
                </div>
            )}

            <div
                className="ucat-calculator-header"
                onMouseDown={handleMouseDown}
                style={{ cursor: 'move' }}
            >
                <span>Calculator</span>
                <span onClick={() => { /* Close logic if needed */ }} style={{ cursor: 'pointer' }}>X</span>
            </div>

            <div className="ucat-calculator-body">
                <div className="solar-panel-container">
                    <div className="solar-panel"></div>
                </div>
                <div className="ucat-display-container">
                    <div className="ucat-display">
                        {hideDisplay ? '' : display}
                    </div>
                </div>
                <div className="brand-text">
                    <span className="tex-inst">TEXAS INSTRUMENTS</span>
                    <span className="model-num">TI-108</span>
                </div>

                <div className="ucat-keypad">
                    {/* Row 1: +/-  sqrt  %  / */}
                    <button className="ucat-btn btn-red" onClick={(e) => handleBtnClick(e, toggleSign)}>+/-</button>
                    <button className="ucat-btn btn-red" onClick={(e) => handleBtnClick(e, sqrt)}>√</button>
                    <button className="ucat-btn btn-red" onClick={(e) => handleBtnClick(e, percentage)}>%</button>
                    <button className="ucat-btn btn-red" onClick={(e) => handleBtnClick(e, () => performOperation('/'))}>÷</button>

                    {/* Row 2: MRC  M-  M+  X */}
                    <button className="ucat-btn btn-red" onClick={(e) => handleBtnClick(e, memoryRecallClear)}>MRC</button>
                    <button className="ucat-btn btn-red" onClick={(e) => handleBtnClick(e, memorySub)}>M-</button>
                    <button className="ucat-btn btn-red" onClick={(e) => handleBtnClick(e, memoryAdd)}>M+</button>
                    <button className="ucat-btn btn-red" onClick={(e) => handleBtnClick(e, () => performOperation('*'))}>×</button>

                    {/* Row 3: 7  8  9  - */}
                    <button className="ucat-btn btn-white" onClick={(e) => handleBtnClick(e, () => inputDigit('7'))}>7</button>
                    <button className="ucat-btn btn-white" onClick={(e) => handleBtnClick(e, () => inputDigit('8'))}>8</button>
                    <button className="ucat-btn btn-white" onClick={(e) => handleBtnClick(e, () => inputDigit('9'))}>9</button>
                    <button className="ucat-btn btn-red" onClick={(e) => handleBtnClick(e, () => performOperation('-'))}>-</button>

                    {/* Row 4: 4  5  6  + */}
                    <button className="ucat-btn btn-white" onClick={(e) => handleBtnClick(e, () => inputDigit('4'))}>4</button>
                    <button className="ucat-btn btn-white" onClick={(e) => handleBtnClick(e, () => inputDigit('5'))}>5</button>
                    <button className="ucat-btn btn-white" onClick={(e) => handleBtnClick(e, () => inputDigit('6'))}>6</button>
                    <button className="ucat-btn btn-red" onClick={(e) => handleBtnClick(e, () => performOperation('+'))}>+</button>

                    {/* Row 5: 1  2  3  = (spans 2 rows) */}
                    <button className="ucat-btn btn-white" onClick={(e) => handleBtnClick(e, () => inputDigit('1'))}>1</button>
                    <button className="ucat-btn btn-white" onClick={(e) => handleBtnClick(e, () => inputDigit('2'))}>2</button>
                    <button className="ucat-btn btn-white" onClick={(e) => handleBtnClick(e, () => inputDigit('3'))}>3</button>
                    <button className="ucat-btn btn-red equals-btn" onClick={(e) => handleBtnClick(e, calculateResult)}>=</button>

                    {/* Row 6: ON/C  0  . */}
                    <button className="ucat-btn btn-red" onClick={(e) => handleBtnClick(e, clearDisplay)}>ON/C</button>
                    <button className="ucat-btn btn-white" onClick={(e) => handleBtnClick(e, () => inputDigit('0'))}>0</button>
                    <button className="ucat-btn btn-white" onClick={(e) => handleBtnClick(e, inputDot)}>.</button>
                </div>
            </div>
        </div>
    );
};
