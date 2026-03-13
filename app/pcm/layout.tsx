import React from 'react';
import PcmLayout from '../../../components/layout/PcmLayout';

export default function AppPcmLayout({ children }: { children: React.ReactNode }) {
    // Wrap pages with the shared PCM layout
    return <PcmLayout>{children}</PcmLayout>;
}
