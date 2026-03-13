import React from 'react';

interface ProjectCardProps {
    id: string;
    title: string;
    status: string;
    totalBudget: number;
}

export default function ProjectCard({ id, title, status, totalBudget }: ProjectCardProps) {
    // System Designer Rule: All numbers must be traceable. Clickable to see source.
    // Rule: Locked items must look locked (no hover effects on the card itself, only on actions).
    return (
        <div className="border border-slate-200 rounded-lg p-5 bg-white shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-md font-bold text-slate-900">{title}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-1">ID: {id}</p>
                </div>
                {/* Status visually distinct, non-interactive */}
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded border border-slate-200 select-none">
                    {status}
                </span>
            </div>

            <div className="mt-2 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500 block mb-1">Total Budget (Est.)</span>
                {/* Rule 5: Numbers are traceable. Clicking this would open a modal with calculation logic. */}
                <button
                    className="text-lg font-bold text-blue-600 hover:text-blue-800 underline decoration-blue-300 decoration-dashed transition-colors flex items-center gap-1"
                    title="Click to view budget calculation specification"
                >
                    ${totalBudget.toLocaleString()}
                    <span className="text-[10px] text-slate-400 no-underline">(Spec)</span>
                </button>
            </div>

            {/* Action buttons must clearly state their intent, no generic "Go" */}
            <div className="mt-2 flex gap-2">
                <a href={`/owner/project/${id}`} className="flex-1 text-center py-2 bg-slate-900 text-white rounded text-sm font-semibold hover:bg-slate-800 transition-colors">
                    View Project Details
                </a>
            </div>
        </div>
    );
}
