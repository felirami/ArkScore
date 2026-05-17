import type { ReactNode } from "react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  GitBranch,
  Landmark,
  LockKeyhole,
  Network,
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

        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase text-[var(--muted-foreground)]">
                Hackathon submission
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                On-chain credit decisions for LatAm institutions
              </h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
                ArkScore turns wallet risk into an auditable lending or equity
                issuance decision: Wavy Node analyzes the wallet, ArkScore
                computes the institutional score, and Avalanche Fuji stores the
                decision proof without exposing the raw wallet on-chain.
              </p>
            </div>
            <Badge tone="success">Built during hackathon</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <CriteriaCard
              icon={<CheckCircle2 size={18} aria-hidden="true" />}
              title="Value proposition"
              body="A compliance-ready credit oracle for Arkangeles and Bankaool: fast wallet intake, explainable risk, and reusable institutional decisions."
            />
            <CriteriaCard
              icon={<Network size={18} aria-hidden="true" />}
              title="Avalanche component"
              body="Fuji CreditScoreRegistry stores subject hashes, Wavy evidence hashes, analysis ids, decisions, scorer permissions, and readback verification."
            />
            <CriteriaCard
              icon={<GitBranch size={18} aria-hidden="true" />}
              title="Execution proof"
              body="Live Vercel frontend, Railway API, Wavy-backed scores with fallback, Fuji contract, tests, probes, and submission evidence scripts."
            />
          </div>
        </section>

        <ScoreDashboard />
      </section>
    </main>
  );
}

function CriteriaCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-[var(--accent)]">
        {icon}
        <h3 className="font-medium text-[var(--foreground)]">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        {body}
      </p>
    </div>
  );
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
