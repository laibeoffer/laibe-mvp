import ProjectScope from "../../components/ProjectScope";
import GovernanceRules from "../../components/GovernanceRules";

export default function OwnerPage() {
    return (
        <main className="w-full min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <section className="hero-container w-full max-w-7xl mx-auto flex flex-col md:flex-row overflow-hidden shadow-2xl rounded-2xl border border-white/10" id="main-hero">
                <ProjectScope />
                <GovernanceRules ctaText="📜 檢視投標須知與發包狀態" />
            </section>
        </main>
    );
}
