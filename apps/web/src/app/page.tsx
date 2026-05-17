import type { ReactNode } from "react";
import {
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
    <main className="min-h-screen overflow-hidden text-[var(--foreground)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(7,17,15,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-7">
            <a
              href="#top"
              className="text-3xl font-black tracking-[-0.06em] text-[var(--accent-bright)] md:text-4xl"
            >
              ArkScore
            </a>
            <nav className="hidden items-center gap-6 text-sm font-semibold text-[var(--muted-foreground)] md:flex">
              <a
                className="border-b-2 border-[var(--accent)] py-2 text-[var(--accent-bright)]"
                href="#dashboard"
              >
                Dashboard
              </a>
              <a
                className="py-2 transition-colors hover:text-[var(--foreground)]"
                href="#registry"
              >
                Registry
              </a>
              <a
                className="py-2 transition-colors hover:text-[var(--foreground)]"
                href="#evidence"
              >
                Evidence
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone="danger" className="hidden sm:inline-flex">
              Fuji Testnet
            </Badge>
            <WalletConnector />
          </div>
        </div>
      </header>

      <section
        id="top"
        className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:px-8"
      >
        <div className="flex min-w-0 flex-col justify-between gap-8">
          <div>
            <Badge tone="danger" className="mb-5 sm:hidden">
              Fuji Testnet
            </Badge>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.075em] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
              Institutional Credit Decisions,{" "}
              <span className="text-glow text-[var(--accent-bright)]">
                On-Chain.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted-foreground)] md:text-lg">
              Evaluate counterparty risk using verifiable cryptographic
              evidence. ArkScore aggregates liquidity proofs, Wavy traceability,
              and institutional policy into auditable Avalanche decisions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SignalCard
              icon={<Building2 size={18} aria-hidden="true" />}
              label="Arkangeles"
              value="Investor + borrower scoring"
              tone="mint"
            />
            <SignalCard
              icon={<Landmark size={18} aria-hidden="true" />}
              label="Bankaool"
              value="Credit underwriting workflow"
              tone="blue"
            />
            <SignalCard
              icon={<ShieldCheck size={18} aria-hidden="true" />}
              label="Wavy Node"
              value="Traceability + AI risk"
              tone="purple"
            />
            <SignalCard
              icon={<LockKeyhole size={18} aria-hidden="true" />}
              label="eERC20"
              value={
                eerc20DemoAddress
                  ? "Private token configured"
                  : "Private token demo slot"
              }
              tone="red"
              link={
                eerc20DemoAddress
                  ? `https://testnet.snowtrace.io/address/${eerc20DemoAddress}`
                  : undefined
              }
            />
          </div>
        </div>

        <div className="panel-glow rounded-3xl border border-[var(--border-strong)] bg-[rgba(13,27,24,0.82)] p-4 sm:p-6">
          <div className="grid min-h-[25rem] place-items-center rounded-2xl border border-[var(--border)] bg-[linear-gradient(rgba(54,94,82,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(54,94,82,0.18)_1px,transparent_1px)] bg-[length:40px_40px] p-6 text-center">
            <div>
              <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(45,226,166,0.35)] bg-[rgba(45,226,166,0.08)] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-bright)]">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                Live assessment
              </div>
              <p className="font-mono text-sm uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Ark Score
              </p>
              <p className="text-glow mt-3 text-8xl font-black tracking-[-0.08em] text-[var(--foreground)]">
                742
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Badge tone="success" className="px-4 py-2 text-sm">
                  Approve
                </Badge>
                <Badge
                  tone="neutral"
                  className="px-4 py-2 text-sm normal-case tracking-normal"
                >
                  Low Risk
                </Badge>
              </div>
              <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
                <ProofMini label="Subject Hash" value="0x8f...4c2a" />
                <ProofMini label="Evidence Merkle Root" value="0x3b...9d1e" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="dashboard"
        className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8"
      >
        <ScoreDashboard />
      </section>

      <section
        id="evidence"
        className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8"
      >
        <div className="rounded-3xl border border-[var(--border)] bg-[rgba(13,27,24,0.72)] p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Hackathon submission evidence
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">
                On-chain credit oracle for LatAm institutions
              </h2>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
                ArkScore turns wallet risk into an auditable lending or equity
                issuance decision: Wavy Node analyzes the wallet, ArkScore
                computes the institutional score, and Avalanche Fuji stores the
                decision proof without exposing the raw wallet on-chain.
              </p>
            </div>
            <Badge tone="success">Built during hackathon</Badge>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CriteriaCard
              icon={<CheckCircle2 size={18} aria-hidden="true" />}
              title="Value proposition"
              body="Compliance-ready credit scoring for Arkangeles and Bankaool: wallet intake, explainable risk, reusable institutional decisions."
            />
            <CriteriaCard
              icon={<Network size={18} aria-hidden="true" />}
              title="Avalanche component"
              body="Fuji CreditScoreRegistry stores subject hashes, Wavy evidence hashes, analysis IDs, decisions, scorer permissions, and readback verification."
            />
            <CriteriaCard
              icon={<GitBranch size={18} aria-hidden="true" />}
              title="Execution proof"
              body="Live frontend, Railway API, Wavy-backed scoring with fallback, Fuji contract, tests, probes, and evidence scripts."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function SignalCard({
  icon,
  label,
  value,
  tone,
  link,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "mint" | "blue" | "purple" | "red";
  link?: string | undefined;
}) {
  const toneClass = {
    mint: "text-[var(--accent-bright)]",
    blue: "text-[var(--bank-blue)]",
    purple: "text-[#a78bfa]",
    red: "text-[#ffb3ae]",
  }[tone];

  const content = (
    <div className="rounded-2xl border border-[var(--border)] bg-[rgba(13,27,24,0.72)] p-4 transition-colors hover:border-[var(--border-strong)]">
      <div className={`flex items-center gap-2 ${toneClass}`}>
        {icon}
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );

  if (!link) return content;

  return (
    <a href={link} target="_blank" rel="noreferrer" className="group">
      {content}
    </a>
  );
}

function ProofMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[rgba(17,36,31,0.8)] p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-sm font-semibold text-[var(--accent-bright)]">
        {value}
      </p>
    </div>
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
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-raised)] p-4">
      <div className="flex items-center gap-2 text-[var(--accent-bright)]">
        {icon}
        <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        {body}
      </p>
    </div>
  );
}
