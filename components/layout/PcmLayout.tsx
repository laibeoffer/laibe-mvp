import React from 'react';
import PcmSidebar from '../sidebar/PcmSidebar';
import PcmTopbar from '../topbar/PcmTopbar';

export default function PcmLayout({ children }: { children: React.ReactNode }) {
    // System Designer Rule: The layout enforces explicit navigation and status tracking.
    return (
        <div className="flex h-screen w-full bg-slate-100 text-slate-900">
            {/* Sidebar for navigation without hidden routes */}
            <PcmSidebar />
            <div className="flex flex-col flex-1 w-full overflow-hidden">
                {/* Topbar for persistent state context */}
                <PcmTopbar />
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
