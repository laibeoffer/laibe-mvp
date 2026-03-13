import React from 'react';

interface DocumentUploadProps {
    label: string;
    accept: string;
    legalWarning: string;
}

export default function DocumentUpload({ label, accept, legalWarning }: DocumentUploadProps) {
    // System Designer Rule: Override/Upload is risky. User must know the exact consequences.
    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-800">{label}</label>

            {/* Risk wrapper around the upload intent */}
            <div className="border-2 border-dashed border-red-200 bg-slate-50 rounded-lg p-6 text-center hover:bg-red-50 transition-colors cursor-pointer group">
                <input type="file" className="hidden" accept={accept} id={`upload-${label}`} />
                <label htmlFor={`upload-${label}`} className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400 group-hover:text-red-500 mb-2 transition-colors" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                        Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-slate-500 mt-1">Accepted: {accept}</span>
                </label>
            </div>

            {/* Mandatory legal warning accompanying any upload */}
            <div className="flex items-start gap-2 mt-2 bg-yellow-50 border border-yellow-200 p-3 rounded">
                <svg className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3.L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                    <p className="text-xs font-bold text-yellow-800">Legal Binding Notice</p>
                    <p className="text-[10px] text-yellow-700 leading-tight mt-0.5">{legalWarning}</p>
                </div>
            </div>
        </div>
    );
}
