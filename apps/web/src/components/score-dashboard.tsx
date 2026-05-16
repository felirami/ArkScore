"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Database,
  Loader2,
  Search,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";
import {
  decisionContractEnum,
  type Institution,
  type ScoreApiResponse,
} from "@arkscore/shared";
import {
  useConnection,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { avalancheFuji } from "@/config/chains";
import { fetchWalletScore } from "@/lib/api";
import {
  creditScoreRegistryAbi,
  creditScoreRegistryAddress,
} from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const demoWallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

type StoredScoreRecord = {
  subjectHash: `0x${string}`;
  wavyRiskScore: number;
  compositeCreditScore: number;
  decision: number;
  wavyEvidenceHash: `0x${string}`;
  wavyAnalysisId: string;
  institution: string;
  updatedAt: bigint;
  submitter: `0x${string}`;
};

export function ScoreDashboard() {
  const { address: connectedAddress, chainId, isConnected } = useConnection();
  const [institution, setInstitution] = useState<Institution>("arkangeles");
  const [walletAddress, setWalletAddress] = useState(demoWallet);
  const [score, setScore] = useState<ScoreApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const {
    data: isAuthorizedScorer,
    isLoading: isCheckingScorer,
    isError: isScorerCheckError,
  } = useReadContract({
    address: creditScoreRegistryAddress,
    abi: creditScoreRegistryAbi,
    functionName: "isScorer",
    args: connectedAddress ? [connectedAddress] : undefined,
    chainId: avalancheFuji.id,
    query: {
      enabled: Boolean(creditScoreRegistryAddress && connectedAddress),
    },
  });
  const {
    writeContract,
    data: transactionHash,
    error: writeError,
    isPending: isWriting,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: transactionHash,
    });
  const {
    data: hasStoredScore,
    isLoading: isCheckingStoredScore,
    isError: isStoredScoreCheckError,
    refetch: refetchStoredScore,
  } = useReadContract({
    address: creditScoreRegistryAddress,
    abi: creditScoreRegistryAbi,
    functionName: "hasScore",
    args: score ? [score.subjectHash] : undefined,
    chainId: avalancheFuji.id,
    query: {
      enabled: Boolean(creditScoreRegistryAddress && score?.subjectHash),
    },
  });
  const {
    data: rawStoredScoreRecord,
    isLoading: isLoadingStoredScoreRecord,
    isError: isStoredScoreRecordError,
    refetch: refetchStoredScoreRecord,
  } = useReadContract({
    address: creditScoreRegistryAddress,
    abi: creditScoreRegistryAbi,
    functionName: "getScore",
    args: score ? [score.subjectHash] : undefined,
    chainId: avalancheFuji.id,
    query: {
      enabled: Boolean(
        creditScoreRegistryAddress &&
        score?.subjectHash &&
        hasStoredScore === true,
      ),
      retry: false,
    },
  });

  const storedScoreRecord = useMemo(
    () => parseStoredScoreRecord(rawStoredScoreRecord),
    [rawStoredScoreRecord],
  );
  const storedEvidenceMatches = useMemo(
    () =>
      Boolean(
        score && storedScoreRecord && evidenceMatches(score, storedScoreRecord),
      ),
    [score, storedScoreRecord],
  );

  const canSubmitToRegistry = useMemo(
    () =>
      Boolean(
        score &&
        creditScoreRegistryAddress &&
        isConnected &&
        isAuthorizedScorer === true,
      ),
    [isAuthorizedScorer, isConnected, score],
  );

  useEffect(() => {
    if (isConfirmed) {
      void refetchStoredScore();
      void refetchStoredScoreRecord();
    }
  }, [isConfirmed, refetchStoredScore, refetchStoredScoreRecord]);

  async function handleScoreWallet() {
    setError(null);
    setScore(null);

    if (!isAddress(walletAddress)) {
      setError("Enter a valid EVM wallet address.");
      return;
    }

    setIsScoring(true);

    try {
      const result = await fetchWalletScore({
        address: walletAddress,
        institution,
      });
      setScore(result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to fetch wallet score.",
      );
    } finally {
      setIsScoring(false);
    }
  }

  function handleStoreOnChain() {
    if (!score || !creditScoreRegistryAddress) return;

    if (isAuthorizedScorer !== true) {
      setError("Connect an authorized scorer wallet before storing on Fuji.");
      return;
    }

    if (chainId !== avalancheFuji.id) {
      switchChain({ chainId: avalancheFuji.id });
      return;
    }

    writeContract({
      address: creditScoreRegistryAddress,
      abi: creditScoreRegistryAbi,
      functionName: "recordScore",
      args: [
        score.subjectHash,
        score.wavy.riskScore,
        score.composite.creditScore,
        decisionContractEnum[score.composite.decision],
        score.evidenceHash,
        score.wavy.analysisId,
        score.institution,
      ],
      chainId: avalancheFuji.id,
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 md:p-5">
        <div className="flex items-center gap-2">
          <Search
            size={18}
            aria-hidden="true"
            className="text-[var(--accent)]"
          />
          <h2 className="text-lg font-semibold">Wallet risk intake</h2>
        </div>

        <div className="mt-5 grid gap-4">
          <div>
            <label
              htmlFor="wallet-address"
              className="text-sm font-medium text-[var(--muted-foreground)]"
            >
              Wallet address
            </label>
            <Input
              id="wallet-address"
              value={walletAddress}
              onChange={(event) => setWalletAddress(event.target.value)}
              placeholder="0x..."
              spellCheck={false}
              className="mt-2"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-[var(--muted-foreground)]">
              Institution workflow
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                variant={institution === "arkangeles" ? "primary" : "secondary"}
                onClick={() => setInstitution("arkangeles")}
                className="h-12"
              >
                Arkangeles
              </Button>
              <Button
                variant={institution === "bankaool" ? "primary" : "secondary"}
                onClick={() => setInstitution("bankaool")}
                className="h-12"
              >
                Bankaool
              </Button>
            </div>
          </div>

          <Button
            onClick={handleScoreWallet}
            disabled={isScoring}
            className="h-12"
          >
            {isScoring ? (
              <Loader2 size={16} aria-hidden="true" className="animate-spin" />
            ) : (
              <ShieldAlert size={16} aria-hidden="true" />
            )}
            Fetch Wavy score
          </Button>

          {error ? (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle size={16} aria-hidden="true" className="mt-0.5" />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-[var(--muted-foreground)]">
            Connected wallet:{" "}
            <span className="font-mono text-[var(--foreground)]">
              {connectedAddress
                ? shortAddress(connectedAddress)
                : "Not connected"}
            </span>
            {creditScoreRegistryAddress ? (
              <span className="mt-2 flex items-center gap-2">
                <span>Scorer status:</span>
                <Badge tone={scorerTone(isAuthorizedScorer)}>
                  {scorerStatusLabel({
                    connectedAddress,
                    isAuthorizedScorer,
                    isCheckingScorer,
                    isScorerCheckError,
                  })}
                </Badge>
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Database
              size={18}
              aria-hidden="true"
              className="text-[var(--accent)]"
            />
            <h2 className="text-lg font-semibold">Institutional decision</h2>
          </div>
          {score ? (
            <Badge tone={score.source === "wavy" ? "success" : "info"}>
              {score.source === "wavy" ? "Live Wavy Node" : "Mock Wavy trace"}
            </Badge>
          ) : null}
        </div>

        {score ? (
          <div className="mt-5 grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Wavy risk" value={`${score.wavy.riskScore}/100`} />
              <Metric
                label="Credit score"
                value={`${score.composite.creditScore}/100`}
              />
              <Metric
                label="Trace volume"
                value={String(score.wavy.transactionsAnalyzed)}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={riskTone(score.wavy.riskScore)}>
                  {score.wavy.riskLevel}
                </Badge>
                <Badge tone={decisionTone(score.composite.decision)}>
                  {score.composite.decisionLabel}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                {score.composite.recommendation}
              </p>
            </div>

            <div className="grid gap-2 text-sm">
              <Detail
                label="Traceability"
                value={`${score.wavy.traceability.provider} ${score.wavy.traceability.scanType}; ${score.wavy.traceability.transactionsAnalyzed} tx; ${score.wavy.traceability.patternsCount} patterns`}
              />
              <Detail
                label="AI risk scale"
                value={`${score.wavy.traceability.riskScoreScale}; ${traceabilityRegistrationLabel(score.wavy.traceability.addressRegistration)}`}
              />
              <Detail label="Subject hash" value={score.subjectHash} />
              <Detail label="Analysis ID" value={score.wavy.analysisId} />
              <Detail label="Evidence hash" value={score.evidenceHash} />
              <Detail label="Risk reason" value={score.wavy.riskReason} />
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-[var(--muted-foreground)]">
                Registry:{" "}
                <span className="font-mono text-[var(--foreground)]">
                  {creditScoreRegistryAddress
                    ? shortAddress(creditScoreRegistryAddress)
                    : "Set contract address"}
                </span>
                {creditScoreRegistryAddress && connectedAddress ? (
                  <span className="mt-1 block">
                    Scorer:{" "}
                    <span className="font-mono text-[var(--foreground)]">
                      {shortAddress(connectedAddress)}
                    </span>{" "}
                    <span className="text-[var(--muted-foreground)]">
                      {isAuthorizedScorer === true
                        ? "authorized"
                        : "not authorized"}
                    </span>
                  </span>
                ) : null}
                <span className="mt-2 flex flex-wrap items-center gap-2">
                  <span>Subject status:</span>
                  <Badge
                    tone={storedScoreTone({
                      hasRegistry: Boolean(creditScoreRegistryAddress),
                      hasStoredScore,
                    })}
                  >
                    {storedScoreStatusLabel({
                      hasRegistry: Boolean(creditScoreRegistryAddress),
                      hasStoredScore,
                      isCheckingStoredScore,
                      isStoredScoreCheckError,
                    })}
                  </Badge>
                </span>
              </div>
              <Button
                onClick={handleStoreOnChain}
                disabled={
                  !canSubmitToRegistry ||
                  isWriting ||
                  isConfirming ||
                  isSwitching
                }
              >
                {isWriting || isConfirming || isSwitching ? (
                  <Loader2
                    size={16}
                    aria-hidden="true"
                    className="animate-spin"
                  />
                ) : isConfirmed ? (
                  <CheckCircle2 size={16} aria-hidden="true" />
                ) : (
                  <UploadCloud size={16} aria-hidden="true" />
                )}
                {chainId !== avalancheFuji.id && isConnected
                  ? "Switch to Fuji"
                  : isCheckingScorer
                    ? "Checking scorer"
                    : hasStoredScore
                      ? "Update Fuji record"
                      : "Store on Fuji"}
              </Button>
            </div>

            {transactionHash ? (
              <a
                href={`https://testnet.snowtrace.io/tx/${transactionHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)]"
              >
                View transaction
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            ) : null}

            {hasStoredScore === true ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    On-chain readback
                  </p>
                  <Badge
                    tone={
                      storedEvidenceMatches
                        ? "success"
                        : isStoredScoreRecordError
                          ? "danger"
                          : "info"
                    }
                  >
                    {storedReadbackStatusLabel({
                      isLoadingStoredScoreRecord,
                      isStoredScoreRecordError,
                      storedEvidenceMatches,
                      storedScoreRecord,
                    })}
                  </Badge>
                </div>

                {storedScoreRecord ? (
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <CompactDetail
                      label="Stored score"
                      value={`${storedScoreRecord.wavyRiskScore}/100 risk; ${storedScoreRecord.compositeCreditScore}/100 credit`}
                    />
                    <CompactDetail
                      label="Decision enum"
                      value={String(storedScoreRecord.decision)}
                    />
                    <CompactDetail
                      label="Submitter"
                      value={shortAddress(storedScoreRecord.submitter)}
                    />
                    <CompactDetail
                      label="Updated"
                      value={formatUnixTimestamp(storedScoreRecord.updatedAt)}
                    />
                    <CompactDetail
                      label="Analysis ID"
                      value={storedScoreRecord.wavyAnalysisId}
                    />
                    <CompactDetail
                      label="Institution"
                      value={storedScoreRecord.institution}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                    {isLoadingStoredScoreRecord
                      ? "Reading registry record from Avalanche Fuji."
                      : "Fuji reports a stored score, but the registry record is not available yet."}
                  </p>
                )}
              </div>
            ) : null}

            {writeError ? (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                <AlertTriangle
                  size={16}
                  aria-hidden="true"
                  className="mt-0.5"
                />
                <p>{writeError.message}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-slate-50 p-6 text-center text-sm text-[var(--muted-foreground)]">
            Wavy Node risk, composite score, and on-chain evidence will appear
            here.
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-3">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border border-slate-200 p-3 md:grid-cols-[140px_1fr]">
      <p className="text-[var(--muted-foreground)]">{label}</p>
      <p className="break-all font-mono text-xs md:text-sm">{value}</p>
    </div>
  );
}

function CompactDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200 bg-white p-2">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function riskTone(riskScore: number) {
  if (riskScore >= 80) return "danger";
  if (riskScore >= 60) return "warning";
  if (riskScore >= 40) return "info";
  return "success";
}

function decisionTone(decision: ScoreApiResponse["composite"]["decision"]) {
  if (decision === "DECLINE") return "danger";
  if (decision === "REVIEW_REQUIRED") return "warning";
  return "success";
}

function scorerTone(isAuthorizedScorer: boolean | undefined) {
  if (isAuthorizedScorer === true) return "success";
  if (isAuthorizedScorer === false) return "warning";
  return "info";
}

function storedScoreTone(input: {
  hasRegistry: boolean;
  hasStoredScore: boolean | undefined;
}) {
  if (!input.hasRegistry) return "warning";
  if (input.hasStoredScore === true) return "success";
  if (input.hasStoredScore === false) return "info";
  return "info";
}

function scorerStatusLabel(input: {
  connectedAddress: string | undefined;
  isAuthorizedScorer: boolean | undefined;
  isCheckingScorer: boolean;
  isScorerCheckError: boolean;
}) {
  if (!input.connectedAddress) return "Connect wallet";
  if (input.isCheckingScorer) return "Checking Fuji";
  if (input.isScorerCheckError) return "Check failed";
  if (input.isAuthorizedScorer === true) return "Authorized";
  if (input.isAuthorizedScorer === false) return "Not authorized";
  return "Unknown";
}

function storedScoreStatusLabel(input: {
  hasRegistry: boolean;
  hasStoredScore: boolean | undefined;
  isCheckingStoredScore: boolean;
  isStoredScoreCheckError: boolean;
}) {
  if (!input.hasRegistry) return "Set registry";
  if (input.isCheckingStoredScore) return "Checking Fuji";
  if (input.isStoredScoreCheckError) return "Check failed";
  if (input.hasStoredScore === true) return "Stored on Fuji";
  if (input.hasStoredScore === false) return "Not stored";
  return "Awaiting score";
}

function storedReadbackStatusLabel(input: {
  isLoadingStoredScoreRecord: boolean;
  isStoredScoreRecordError: boolean;
  storedEvidenceMatches: boolean;
  storedScoreRecord: StoredScoreRecord | null;
}) {
  if (input.isLoadingStoredScoreRecord) return "Reading Fuji";
  if (input.isStoredScoreRecordError) return "Read failed";
  if (!input.storedScoreRecord) return "Awaiting record";
  if (input.storedEvidenceMatches) return "Evidence match";
  return "Different evidence";
}

function traceabilityRegistrationLabel(
  value: ScoreApiResponse["wavy"]["traceability"]["addressRegistration"],
) {
  if (value === "auto-registered-or-reused") return "Auto registered/reused";
  if (value === "preconfigured") return "Preconfigured project address";
  return "Demo trace";
}

function parseStoredScoreRecord(value: unknown): StoredScoreRecord | null {
  if (!value || typeof value !== "object") return null;

  const subjectHash = getRecordField(value, "subjectHash", 0);
  const wavyRiskScore = getRecordField(value, "wavyRiskScore", 1);
  const compositeCreditScore = getRecordField(value, "compositeCreditScore", 2);
  const decision = getRecordField(value, "decision", 3);
  const wavyEvidenceHash = getRecordField(value, "wavyEvidenceHash", 4);
  const wavyAnalysisId = getRecordField(value, "wavyAnalysisId", 5);
  const institution = getRecordField(value, "institution", 6);
  const updatedAt = getRecordField(value, "updatedAt", 7);
  const submitter = getRecordField(value, "submitter", 8);

  if (
    !isBytes32(subjectHash) ||
    !isNumericValue(wavyRiskScore) ||
    !isNumericValue(compositeCreditScore) ||
    !isNumericValue(decision) ||
    !isBytes32(wavyEvidenceHash) ||
    typeof wavyAnalysisId !== "string" ||
    typeof institution !== "string" ||
    !isNumericValue(updatedAt) ||
    typeof submitter !== "string" ||
    !isAddress(submitter)
  ) {
    return null;
  }

  return {
    subjectHash,
    wavyRiskScore: Number(wavyRiskScore),
    compositeCreditScore: Number(compositeCreditScore),
    decision: Number(decision),
    wavyEvidenceHash,
    wavyAnalysisId,
    institution,
    updatedAt:
      typeof updatedAt === "bigint" ? updatedAt : BigInt(Number(updatedAt)),
    submitter: submitter as `0x${string}`,
  };
}

function getRecordField(value: object, key: string, index: number) {
  if (Array.isArray(value)) return value[index];
  return (value as Record<string, unknown>)[key];
}

function evidenceMatches(
  score: ScoreApiResponse,
  storedScoreRecord: StoredScoreRecord,
) {
  return (
    sameHex(score.subjectHash, storedScoreRecord.subjectHash) &&
    sameHex(score.evidenceHash, storedScoreRecord.wavyEvidenceHash) &&
    score.wavy.analysisId === storedScoreRecord.wavyAnalysisId &&
    score.wavy.riskScore === storedScoreRecord.wavyRiskScore &&
    score.composite.creditScore === storedScoreRecord.compositeCreditScore &&
    decisionContractEnum[score.composite.decision] ===
      storedScoreRecord.decision
  );
}

function isBytes32(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

function isNumericValue(value: unknown): value is number | bigint {
  return typeof value === "number" || typeof value === "bigint";
}

function sameHex(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase();
}

function formatUnixTimestamp(value: bigint) {
  const timestampMs = Number(value) * 1000;
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
    return "Pending timestamp";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestampMs));
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
