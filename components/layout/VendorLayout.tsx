import React from 'react';
import VendorSidebar from '../sidebar/VendorSidebar';
import VendorTopbar from '../topbar/VendorTopbar';

export default function VendorLayout({ children }: { children: React.ReactNode }) {
    // System Designer Rule: The user must always know "where am I in the process"
    // The layout ensures sidebar and topbar (status context) are always visible.
    return (
        <div className="flex h-screen w-full bg-slate-50 text-slate-900">
            {/* Sidebar for navigation without hidden routes */}
            <VendorSidebar />
            <div className="flex flex-col flex-1 w-full overflow-hidden">
                {/* Topbar for persistent state context */}
                <VendorTopbar />
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
