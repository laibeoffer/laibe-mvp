import React from 'react';
import { SystemForm, FormFieldLocked } from '../../../components/forms/SystemForm';
import DocumentUpload from '../../../components/upload/DocumentUpload';

export default function VendorQualificationPage() {
    // System Designer Rule: Qualifications dictate what a vendor is allowed to bid on.
    // Unverified status is rigidly presented.
    return (
        <div className="max-w-4xl space-y-8">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-900">Vendor Qualification Profile</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Your validated capabilities dictate system bidding permissions. Falsified data leads to immediate platform ban.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Core Identity (Verified)</h3>
                        <div className="space-y-4">
                            <FormFieldLocked label="Registered Company Name" value="BuildCorp Taiwan Ltd." reason="Verified via Commerce Registry" />
                            <FormFieldLocked label="Unified Business Number" value="12345678" reason="System Core Identifier" />
                            <FormFieldLocked label="Primary Contact" value="John Doe (john@buildcorp.tw)" reason="Bound to LINE Account ID" />
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Skill Capability Matrix</h3>
                        <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 mb-4">
                            Pending: You are currently missing proof of Class A Electrical certification. Bids requiring this skill are temporarily blocked.
                        </p>
                        <SystemForm onSubmit={(e) => e.preventDefault()} submitLabel="Submit for Human Audit" isDangerous={false}>
                            <DocumentUpload
                                label="Electrical Class A Certification"
                                accept=".pdf,.jpg"
                                legalWarning="By uploading, you attest this document is officially issued and currently valid."
                            />
                        </SystemForm>
                    </div>
                </div>

                <div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 sticky top-6">
                        <h3 className="text-md font-bold text-slate-800 uppercase tracking-widest text-center mb-4">System Trust Score</h3>
                        <div className="text-center">
                            <span className="text-4xl font-bold text-slate-900">85<span className="text-xl text-slate-500">/100</span></span>
                            <p className="text-xs text-slate-500 mt-2">Level: Reliable Vendor</p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-200 divide-y divide-slate-100 text-sm">
                            <div className="flex justify-between py-2">
                                <span className="text-slate-500">Completed Projects</span>
                                <span className="font-bold">4</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-slate-500">Dispute Rate</span>
                                <span className="font-bold text-green-600">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
