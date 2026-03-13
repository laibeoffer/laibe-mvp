import "./globals.css";

export const metadata = {
    title: "LaiBE Professional Renovation Bidding Platform",
    description: "LaiBE 治理標準與投標系統",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="zh-TW">
            <body className="font-sans antialiased text-slate-900 bg-black min-h-screen">
                {children}
            </body>
        </html>
    );
}
