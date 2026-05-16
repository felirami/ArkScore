import { Building2, Landmark, ShieldCheck } from "lucide-react";
import { ScoreDashboard } from "@/components/score-dashboard";
import { WalletConnector } from "@/components/wallet-connector";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-5 text-[var(--foreground)] md:px-6 md:py-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase text-[var(--muted-foreground)]">
              Avalanche Fuji
            </p>
            <h1 className="text-3xl font-semibold md:text-4xl">ArkScore</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)] md:text-base">
              Wavy Node traceability and AI risk scoring, converted into an
              auditable on-chain decision for Arkangeles and Bankaool.
            </p>
          </div>
          <WalletConnector />
        </header>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <Building2 size={18} aria-hidden="true" />
              <p className="font-mono text-sm text-[var(--muted-foreground)]">
                Arkangeles
              </p>
            </div>
            <p className="mt-2 text-lg font-medium">
              Investor and borrower scoring
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="flex items-center gap-2 text-[#1d4ed8]">
              <Landmark size={18} aria-hidden="true" />
              <p className="font-mono text-sm text-[var(--muted-foreground)]">
                Bankaool
              </p>
            </div>
            <p className="mt-2 text-lg font-medium">
              Credit underwriting workflow
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="flex items-center gap-2 text-[#7c3aed]">
              <ShieldCheck size={18} aria-hidden="true" />
              <p className="font-mono text-sm text-[var(--muted-foreground)]">
                Wavy Node
              </p>
            </div>
            <p className="mt-2 text-lg font-medium">
              Traceability and AI risk score
            </p>
          </div>
        </div>

        <ScoreDashboard />
      </section>
    </main>
  );
}
