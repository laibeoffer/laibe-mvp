import React from 'react';
import VendorLayout from '../../../components/layout/VendorLayout';

export default function AppVendorLayout({ children }: { children: React.ReactNode }) {
    // Wrap pages with the shared vendor layout
    return <VendorLayout>{children}</VendorLayout>;
}
