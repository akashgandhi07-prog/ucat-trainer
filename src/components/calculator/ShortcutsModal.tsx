import { X } from 'lucide-react';

interface ShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ShortcutsModal = ({ isOpen, onClose }: ShortcutsModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white rounded-t-xl z-10">
                    <h2 className="text-xl font-bold text-slate-800">Calculator Shortcuts</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Navigation */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Navigation Shortcuts</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-sm font-semibold text-slate-700 min-w-[2rem] text-center">Alt</kbd>
                                    <span className="text-slate-400">+</span>
                                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-sm font-semibold text-slate-700 min-w-[2rem] text-center">N</kbd>
                                </div>
                                <span className="text-slate-600 font-medium">Next question</span>
                            </div>
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-sm font-semibold text-slate-700 min-w-[2rem] text-center">Alt</kbd>
                                    <span className="text-slate-400">+</span>
                                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-sm font-semibold text-slate-700 min-w-[2rem] text-center">P</kbd>
                                </div>
                                <span className="text-slate-600 font-medium">Previous question</span>
                            </div>
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-sm font-semibold text-slate-700 min-w-[2rem] text-center">A</kbd>
                                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-sm font-semibold text-slate-700 min-w-[2rem] text-center">B</kbd>
                                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-sm font-semibold text-slate-700 min-w-[2rem] text-center">C</kbd>
                                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-sm font-semibold text-slate-700 min-w-[2rem] text-center">D</kbd>
                                </div>
                                <span className="text-slate-600 font-medium">Select answer options directly</span>
                            </div>
                        </div>
                    </section>

                    {/* Calculator Toggle */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Calculator Shortcuts</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between group">
                                <div className="flex items-center gap-2">
                                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-sm font-semibold text-slate-700 min-w-[2rem] text-center">Alt</kbd>
                                    <span className="text-slate-400">+</span>
                                    <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-sm font-semibold text-slate-700 min-w-[2rem] text-center">C</kbd>
                                </div>
                                <span className="text-slate-600 font-medium">Open/close calculator</span>
                            </div>
                        </div>
                    </section>

                    {/* Basic Ops */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Basic Operations</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-4">
                                <kbd className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-sm font-semibold text-indigo-700 min-w-[2rem] text-center">+</kbd>
                                <span className="text-slate-600">Addition</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <kbd className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-sm font-semibold text-indigo-700 min-w-[2rem] text-center">-</kbd>
                                <span className="text-slate-600">Subtraction</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <kbd className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-sm font-semibold text-indigo-700 min-w-[2rem] text-center">*</kbd>
                                <span className="text-slate-600">Multiplication</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <kbd className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-sm font-semibold text-indigo-700 min-w-[2rem] text-center">/</kbd>
                                <span className="text-slate-600">Division</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <kbd className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-sm font-semibold text-indigo-700 min-w-[4rem] text-center">Enter</kbd>
                                <span className="text-slate-600">Equals</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <kbd className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-sm font-semibold text-indigo-700 min-w-[4rem] text-center">Backspace</kbd>
                                <span className="text-slate-600">Clear all</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <kbd className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-sm font-semibold text-indigo-700 min-w-[2rem] text-center">Esc</kbd>
                                <span className="text-slate-600">Clear all</span>
                            </div>
                        </div>
                    </section>

                    {/* Advanced & Memory */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Memory & Advanced</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-4">
                                <kbd className="px-2 py-1 bg-emerald-50 border border-emerald-100 rounded text-sm font-semibold text-emerald-700 min-w-[2rem] text-center">P</kbd>
                                <span className="text-slate-600">Memory Store (M+)</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <kbd className="px-2 py-1 bg-emerald-50 border border-emerald-100 rounded text-sm font-semibold text-emerald-700 min-w-[2rem] text-center">C</kbd>
                                <span className="text-slate-600">Memory Recall (MRC)</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <kbd className="px-2 py-1 bg-emerald-50 border border-emerald-100 rounded text-sm font-semibold text-emerald-700 min-w-[2rem] text-center">X</kbd>
                                <span className="text-slate-600">Square Root (√) — after entering the number</span>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-xl text-center space-y-1">
                    <p className="text-sm text-slate-500">
                        Pro Tip: Use the NumPad on your keyboard for maximum speed!
                    </p>
                    <p className="text-xs text-slate-400">
                        On Mac, use <kbd className="px-1 py-0.5 bg-slate-200 rounded text-slate-600">Option</kbd> (⌥) instead of Alt.
                    </p>
                </div>
            </div>
        </div>
    );
};
