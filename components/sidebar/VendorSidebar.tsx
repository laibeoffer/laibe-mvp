import React from 'react';
import Link from 'next/link';

export default function VendorSidebar() {
    // System Designer Rule: No shortcuts or hidden entries. Explicitly listed routes.
    const routes = [
        { name: 'Dashboard', path: '/vendor/dashboard' },
        { name: 'Qualification', path: '/vendor/qualification' },
        { name: 'Tenders (Bids)', path: '/vendor/tenders' },
        { name: 'Active Projects', path: '/vendor/project/dummy-id' }, // Placeholder for project selection
        { name: 'Messages', path: '/vendor/messages' },
    ];

    return (
        <nav className="w-64 border-r border-slate-200 bg-[#1e293b] flex flex-col h-full shrink-0">
            <div className="h-16 flex items-center px-6 border-b border-slate-700 font-bold text-lg text-white tracking-wider">
                Laibe Vendor
            </div>
            <div className="flex-1 py-4 flex flex-col gap-1 px-4">
                {routes.map((route) => (
                    <Link
                        key={route.name}
                        href={route.path}
                        className="px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white rounded-md transition-colors"
                    >
                        {route.name}
                    </Link>
                ))}
            </div>
            <div className="p-4 border-t border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">System Bound Identity</span>
                <div className="text-xs text-slate-400 mt-1 truncate">ID: VND-2026-X99</div>
            </div>
        </nav>
    );
}
