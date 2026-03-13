export default function ProjectScope() {
    return (
        <div className="w-full md:w-1/2 relative flex flex-col items-center justify-center p-8 lg:p-16" data-purpose="project-visual-core">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    alt="Interior Renovation Render"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIVFZrWW9ahBXBhmaLxkJEckawmhS6RzL2JaJhCYBB9ZaXyGYSz28XoURpdIbCp8wl1VeokJiRqPFj6t02AQnzvkQvCd_M0PrSIzm9ua8brNghABoPL4FLDUUanuda5pvU83Rh0FPFsM0tkC9wX1fE18oN2R7Duei1iAD_B4_Sdr6w2pfNBJzofOTuqquYIm2hUoSMoHKW8lFDa19AE5uznRcErqHtPRxWuYj4ELH7-J0-pnkAfpAVe7m3x9wH-fCdtn2dyReU7b8"
                />
                <div className="absolute inset-0 bg-black/50"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-lg">
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-8 leading-tight">
                    台北市信義區老屋翻新案
                </h1>

                {/* Project Parameters */}
                <div className="grid grid-cols-1 gap-6 mb-10" data-purpose="key-parameters">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">📏</div>
                        <div>
                            <p className="text-white/60 text-sm">坪數</p>
                            <p className="text-white text-xl font-medium">35 坪</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">💰</div>
                        <div>
                            <p className="text-white/60 text-sm">預算</p>
                            <p className="text-white text-xl font-medium">$12,500,000</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">⏳</div>
                        <div>
                            <p className="text-white/60 text-sm">工期</p>
                            <p className="text-white text-xl font-medium">120 天</p>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button className="bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 px-8 py-4 rounded-lg text-white font-medium flex items-center transition-all duration-300 group">
                    <span>👁️ 查看詳細圖說與工法</span>
                    <svg className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            </div>
        </div>
    );
}
