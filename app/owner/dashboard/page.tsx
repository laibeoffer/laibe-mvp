import React from 'react';
import ProjectCard from '../../../components/cards/ProjectCard';

export default function OwnerDashboard() {
    // System Designer Rule: Information is presented strictly, no false freedom.
    const activeProjects = [
        { id: 'PRJ-2026-001', title: 'Taipei Office Renovation', status: 'In Progress', budget: 1250000 },
        { id: 'PRJ-2026-002', title: 'Hualien Retail Store', status: 'Pending Vendor', budget: 850000 }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
                    <p className="text-sm text-slate-500 mt-1">Overview of your active and past projects.</p>
                </div>
                <a
                    href="/owner/project/new"
                    className="bg-slate-900 text-white px-4 py-2 rounded-md font-bold text-sm hover:bg-slate-800 transition-colors"
                >
                    Initiate New Project
                </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeProjects.map(p => (
                    <ProjectCard key={p.id} id={p.id} title={p.title} status={p.status} totalBudget={p.budget} />
                ))}
                {activeProjects.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 border border-slate-200 border-dashed rounded-lg">
                        No active projects. Click "Initiate New Project" to begin.
                    </div>
                )}
            </div>
        </div>
    );
}
