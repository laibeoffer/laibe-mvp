import React from 'react';
import ProjectCard from '../../../components/cards/ProjectCard';

export default function VendorDashboardPage() {
    // System Designer Rule: Information is rigidly displayed.
    const assignedProjects = [
        { id: 'PRJ-2026-001', title: 'Taipei Office Renovation', status: 'Execution (Phase 2)', budget: 850000 }
    ];

    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-900">Vendor Dashboard</h2>
                <p className="text-sm text-slate-500 mt-1">Overview of your committed projects and pending actions.</p>
            </div>

            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Active Bound Contracts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignedProjects.map(p => (
                        <ProjectCard key={p.id} id={p.id} title={p.title} status={p.status} totalBudget={p.budget} />
                    ))}
                    {assignedProjects.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 border border-slate-200 border-dashed rounded-lg">
                            No active projects bound to your vendor ID.
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Action Items</h3>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex justify-between items-center">
                    <div>
                        <span className="font-bold text-red-800 block">Critical: Overdue Material Submission</span>
                        <span className="text-sm text-red-700">PRJ-2026-001 • Lighting Fixtures Specification (Due yesterday)</span>
                    </div>
                    <button className="px-4 py-2 bg-red-600 text-white font-bold rounded text-sm hover:bg-red-700 transition">
                        Resolve Immediately
                    </button>
                </div>
            </div>
        </div>
    );
}
