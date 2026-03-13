import React from 'react';
import OwnerLayout from '../../../components/layout/OwnerLayout';

export default function AppOwnerLayout({ children }: { children: React.ReactNode }) {
    // Wrap pages with the shared layout
    return <OwnerLayout>{children}</OwnerLayout>;
}
