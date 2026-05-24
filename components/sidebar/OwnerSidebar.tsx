import React from 'react';
import Link from 'next/link';

export default function OwnerSidebar() {
    // System Designer Rule: No shortcuts or hidden entries. Explicitly listed routes.
    const routes = [
        { name: '儀表板', path: '/owner/dashboard' },
        { name: '專案', path: '/owner/project/new' }, // 'New' vs 'List' can be explicitly separated
        { name: '投標', path: '/owner/bids' },
        { name: '合約', path: '/owner/contracts' },
        { name: '訊息', path: '/owner/messages' },
    ];

    return (
        <nav className="w-64 border-r border-slate-200 bg-white flex flex-col h-full shrink-0">
            <div className="h-16 flex items-center px-6 border-b border-slate-200 font-bold text-lg text-slate-800 tracking-wider">
                Laibe Owner
            </div>
            <div className="flex-1 py-4 flex flex-col gap-1 px-4">
                {routes.map((route) => (
                    <Link
                        key={route.name}
                        href={route.path}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors"
                    >
                        {route.name}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
