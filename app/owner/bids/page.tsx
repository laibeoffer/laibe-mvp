import React from 'react';
import DataTable from '../../../components/tables/DataTable';

export default function OwnerBidsPage() {
    // System Designer Rule: Abort Penalty warning must be undeniably visible prior to action.
    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-900">活躍投標 (招標)</h2>
                <p className="text-sm text-slate-500 mt-1">審核您活躍專案的廠商提交。</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">PRJ-2026-002：花蓮零售店</h3>

                <DataTable
                    columns={["廠商", "建議預算", "預計時程", "動作"]}
                    data={[
                        ["Vendor A", "$840,000", "2026-05-01", "待審核"],
                        ["Vendor B", "$880,000", "2026-04-15", "待審核"]
                    ]}
                />

                <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col items-end">
                    {/* Rule: Override and Abort actions are uncomfortable and full of warnings */}
                    <button className="px-6 py-2 bg-slate-100 text-[#AD5A5A] border border-[#AD5A5A] font-bold rounded hover:bg-[#AD5A5A] hover:text-white transition-colors">
                        全部拒絕投標 (案件中止)
                    </button>
                    <div className="text-right mt-2">
                        <span className="text-sm font-bold block" style={{ color: '#AD5A5A' }}>
                            若確定流標後欲重新上架案件，須支付一定手續費。
                        </span>
                        <span className="text-xs text-slate-500 block">
                            若案件確定流標且欲重新上架，需支付一定手續費。
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
