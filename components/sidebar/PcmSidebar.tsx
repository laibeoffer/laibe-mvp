import React from 'react';
import Link from 'next/link';

export default function PcmSidebar() {
    // System Designer Rule: No shortcuts. PCM has the highest access but must navigate strictly.
    const routes = [
        { name: 'Global Dashboard', path: '/pcm/dashboard' },
        { name: 'Dispute & Dispatch', path: '/pcm/dispatch' },
        { name: 'Rules Governance', path: '/pcm/governance' },
        { name: 'Escrow Control', path: '/pcm/escrow' },
        { name: 'Review & Reporting', path: '/pcm/review-report' },
        { name: 'System Archive', path: '/pcm/archive' },
    ];

    return (
        <nav className="w-64 border-r border-slate-200 bg-slate-900 flex flex-col h-full shrink-0">
            <div className="h-16 flex items-center px-6 border-b border-slate-800 font-bold text-lg text-white tracking-widest">
                Laibe PCM Core
            </div>
            <div className="flex-1 py-4 flex flex-col gap-1 px-4">
                {routes.map((route) => (
                    <Link
                        key={route.name}
                        href={route.path}
                        className="px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white rounded-md transition-colors"
                    >
                        {route.name}
                    </Link>
                ))}
            </div>
            <div className="p-4 border-t border-slate-800">
                <span className="text-[10px] text-green-500 uppercase tracking-widest font-bold">System Arbiter</span>
                <div className="text-xs text-slate-500 mt-1 truncate">ID: PCM-ADMIN-01</div>
            </div>
        </nav>
    );
}
