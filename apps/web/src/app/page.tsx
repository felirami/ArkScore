import {
  ArrowUpRight,
  Building2,
  Landmark,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { ScoreDashboard } from "@/components/score-dashboard";
import { Badge } from "@/components/ui/badge";
import { WalletConnector } from "@/components/wallet-connector";
import { eerc20DemoAddress } from "@/lib/contracts";

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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
          <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4">
            <div className="flex items-center gap-2 text-[#be123c]">
              <LockKeyhole size={18} aria-hidden="true" />
              <p className="font-mono text-sm text-[var(--muted-foreground)]">
                eERC20
              </p>
            </div>
            <div className="mt-2 flex items-start justify-between gap-3">
              <p className="text-lg font-medium">Private credit token demo</p>
              <Badge tone={eerc20DemoAddress ? "success" : "info"}>
                {eerc20DemoAddress ? "Configured" : "Optional"}
              </Badge>
            </div>
            {eerc20DemoAddress ? (
              <a
                href={`https://testnet.snowtrace.io/address/${eerc20DemoAddress}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-mono text-xs font-medium text-[var(--accent)]"
              >
                {shortAddress(eerc20DemoAddress)}
                <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                EncryptedERC deployment slot
              </p>
            )}
          </div>
        </div>

        <ScoreDashboard />
      </section>
    </main>
  );
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
