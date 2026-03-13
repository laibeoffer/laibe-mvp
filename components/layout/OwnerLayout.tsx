import React from 'react';
import OwnerSidebar from '../sidebar/OwnerSidebar';
import OwnerTopbar from '../topbar/OwnerTopbar';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
    // System Designer Rule: The user must always know "where am I in the process"
    // The layout ensures sidebar and topbar (status context) are always visible.
    return (
        <div className="flex h-screen w-full bg-slate-50 text-slate-900">
            {/* Sidebar for navigation without hidden routes */}
            <OwnerSidebar />
            <div className="flex flex-col flex-1 w-full overflow-hidden">
                {/* Topbar for persistent state context */}
                <OwnerTopbar />
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
