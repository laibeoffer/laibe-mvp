import React from 'react';

// Simplified form element props for Phase 1 skeleton
interface SystemFormProps {
    children: React.ReactNode;
    onSubmit: (e: React.FormEvent) => void;
    submitLabel?: string;
    isDangerous?: boolean;
}

export function SystemForm({ children, onSubmit, submitLabel = "Submit", isDangerous = false }: SystemFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-6 max-w-2xl bg-white p-6 border border-slate-200 rounded-lg">
            {/* Rule 7: Risk isn't hidden. It's a feature. */}
            {isDangerous && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                    <p className="font-bold text-red-800 text-sm">Warning: Irreversible Action</p>
                    <p className="text-red-700 text-xs mt-1">This form submission cannot be undone. You will be bound by the decisions made below.</p>
                </div>
            )}
            <div className="space-y-4">
                {children}
            </div>
            <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button
                    type="submit"
                    className={`px-6 py-2 rounded-md font-bold text-sm text-white transition-colors ${isDangerous ? 'bg-laibe-red hover:bg-red-800' : 'bg-slate-900 hover:bg-slate-800'
                        }`}
                    // Add inline style check for laibe-red in case tailwind isn't configured for it yet.
                    style={isDangerous ? { backgroundColor: '#AD5A5A' } : {}}
                >
                    {submitLabel}
                </button>
            </div>
        </form>
    );
}

// Subcomponent: Locked/Read-Only Field
// Rule 4: If not editable, it must not use a standard input box. Just plain text with clear label.
export function FormFieldLocked({ label, value, reason }: { label: string, value: string | number, reason?: string }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
            <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-700 font-mono text-sm relative">
                {value}
                {reason && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 px-1 rounded shadow-sm">
                        Locked: {reason}
                    </span>
                )}
            </div>
        </div>
    );
}

// Subcomponent: Clickable Number (for traceability)
// Rule 5: User must know source of numbers.
export function TraceableNumber({ amount, label }: { amount: number, label: string }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
            <button
                type="button"
                className="text-left bg-slate-50 border border-blue-200 hover:border-blue-400 rounded px-3 py-2 text-blue-700 font-bold font-mono text-lg transition-colors group relative"
            >
                ${amount.toLocaleString()}
                <span className="opacity-0 group-hover:opacity-100 absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded transition-opacity">
                    Click to trace spec source
                </span>
            </button>
        </div>
    )
}
