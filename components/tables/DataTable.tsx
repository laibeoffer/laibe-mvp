import React from 'react';

// Generics omitted for simplicity in Phase 1 skeleton
interface DataTableProps {
    columns: string[];
    data: any[][];
}

export default function DataTable({ columns, data }: DataTableProps) {
    // System Designer Rule: Cannot modify things in-line to prevent accidental changes.
    // Data tables are strictly read-only views. Actions are explicit external buttons.
    return (
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
            <table className="w-full text-left border-collapse text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        {columns.map((col, i) => (
                            <th key={i} className="px-4 py-3 font-semibold text-slate-700 select-none">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-4 py-3 text-slate-600">
                                    {/* System Rule 4: If not editable, it must visually look un-editable (plain text) */}
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400 italic">
                                No records found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
