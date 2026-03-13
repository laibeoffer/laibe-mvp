export default function GovernanceRules({
    ctaText = "📜 詳閱投標須知並同意"
}: {
    ctaText?: string
}) {
    return (
        <div className="w-full md:w-1/2 bg-[#005757] flex flex-col items-center justify-center p-8 lg:p-16 border-t md:border-t-0 md:border-l border-white/10" data-purpose="governance-rules-core">
            <div className="w-full max-w-lg">
                <div className="text-center mb-10">
                    <h2 className="text-[#D4AF37] text-2xl lg:text-3xl font-bold tracking-widest uppercase">
                        本案治理標準與投標須知
                    </h2>
                    <div className="h-1 w-20 bg-[#D4AF37] mx-auto mt-4"></div>
                </div>

                {/* Rule Cards Container */}
                <div className="space-y-4 mb-10" data-purpose="governance-cards">
                    {/* Card 1: PCM */}
                    <div className="bg-white/5 border border-white/10 p-5 rounded-lg hover:border-[#D4AF37]/50 transition-colors">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-white font-bold flex items-center">
                                <span className="mr-2">🛡️</span> PCM 介入權聲明
                            </span>
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded border border-green-500/30 uppercase tracking-tighter">
                                Active
                            </span>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed">
                            甲方保有隨時委託 PCM 進行數量核實與撥款審查之權利。
                        </p>
                    </div>

                    {/* Card 2: 3% Clause */}
                    <div className="bg-white/5 border border-white/10 p-5 rounded-lg hover:border-[#D4AF37]/50 transition-colors">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-white font-bold flex items-center">
                                <span className="mr-2">⚖️</span> ±3% 豁免機制
                            </span>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed">
                            本案適用 LaiBE 標準追加減豁免條款，請詳閱計算標準。
                        </p>
                    </div>

                    {/* Card 3: Protection */}
                    <div className="bg-white/5 border border-white/10 p-5 rounded-lg hover:border-[#D4AF37]/50 transition-colors">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-white font-bold flex items-center">
                                <span className="mr-2">💰</span> 5%/10% 進場保護
                            </span>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed">
                            首期款將依施工進度表查核後撥付。
                        </p>
                    </div>
                </div>

                {/* CTA Action */}
                <div className="text-center">
                    <button className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#005757] font-bold py-4 px-8 rounded shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                        {ctaText}
                    </button>
                    <p className="mt-4 text-white/40 text-xs">
                        LaiBE 智能合約已就緒，所有操作將存證於治理鏈
                    </p>
                </div>
            </div>
        </div>
    );
}
