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
import { pick, useLanguage, type Language } from "@/lib/language";

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
  const { language } = useLanguage();
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
  const isLiveWavyScore = score?.source === "wavy";

  const canSubmitToRegistry = useMemo(
    () =>
      Boolean(
        score &&
        score.source === "wavy" &&
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
      setError(pick(language, "Ingresa una dirección de wallet EVM válida.", "Enter a valid EVM wallet address."));
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
          : pick(language, "No se pudo obtener el score de la wallet.", "Unable to fetch wallet score."),
      );
    } finally {
      setIsScoring(false);
    }
  }

  function handleStoreOnChain() {
    if (!score || !creditScoreRegistryAddress) return;

    if (score.source !== "wavy") {
      setError(pick(language, "Solo los scores en vivo de Wavy Node se pueden guardar en Fuji.", "Only live Wavy Node scores can be stored on Fuji."));
      return;
    }

    if (isAuthorizedScorer !== true) {
      setError(pick(language, "Conecta una wallet scorer autorizada antes de guardar en Fuji.", "Connect an authorized scorer wallet before storing on Fuji."));
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
      <section className="panel-glow rounded-3xl border border-[var(--border)] bg-[rgba(13,27,24,0.82)] p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              {pick(language, "Configuración de evaluación", "Assessment setup")}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.03em]">
              {pick(language, "Identidad institucional", "Institution identity")}
            </h2>
          </div>
          <Search
            size={20}
            aria-hidden="true"
            className="text-[var(--muted-foreground)]"
          />
        </div>

        <div className="mt-5 grid gap-5">
          <div>
            <label
              htmlFor="wallet-address"
              className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]"
            >
              {pick(language, "Dirección de wallet objetivo", "Target wallet address")}
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
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
              {pick(language, "Contexto institucional", "Institutional context")}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-raised)] p-1">
              <Button
                variant={institution === "arkangeles" ? "primary" : "ghost"}
                onClick={() => setInstitution("arkangeles")}
                className="h-11 rounded-lg font-mono text-xs"
              >
                Arkangeles
              </Button>
              <Button
                variant={institution === "bankaool" ? "primary" : "ghost"}
                onClick={() => setInstitution("bankaool")}
                className="h-11 rounded-lg font-mono text-xs"
              >
                Bankaool
              </Button>
            </div>
          </div>

          <Button
            onClick={handleScoreWallet}
            disabled={isScoring}
            className="h-14 text-base"
          >
            {isScoring ? (
              <Loader2 size={18} aria-hidden="true" className="animate-spin" />
            ) : (
              <ShieldAlert size={18} aria-hidden="true" />
            )}
            {isScoring ? pick(language, "Generando score", "Generating score") : pick(language, "Generar score crediticio", "Generate Credit Score")}
          </Button>

          {error ? (
            <div className="flex gap-2 rounded-2xl border border-[rgba(255,107,98,0.38)] bg-[rgba(165,28,36,0.18)] p-3 text-sm text-[#ffb3ae]">
              <AlertTriangle
                size={16}
                aria-hidden="true"
                className="mt-0.5 shrink-0"
              />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[var(--border)] bg-[rgba(17,36,31,0.72)] p-4 text-sm text-[var(--muted-foreground)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{pick(language, "Wallet conectada", "Connected wallet")}</span>
              <span className="font-mono text-[var(--foreground)]">
                {connectedAddress
                  ? shortAddress(connectedAddress)
                  : pick(language, "No conectada", "Not connected")}
              </span>
            </div>
            {creditScoreRegistryAddress ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                <span>{pick(language, "Estado del scorer", "Scorer status")}</span>
                <Badge tone={scorerTone(isAuthorizedScorer)}>
                  {scorerStatusLabel(language, {
                    connectedAddress,
                    isAuthorizedScorer,
                    isCheckingScorer,
                    isScorerCheckError,
                  })}
                </Badge>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel-glow rounded-3xl border border-[var(--border-strong)] bg-[rgba(13,27,24,0.82)] p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--accent-bright)]">
              {score ? pick(language, "Objeto de prueba verificado", "Verified proof object") : pick(language, "Evaluación en vivo", "Live assessment")}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.03em]">
              {pick(language, "Decisión institucional", "Institutional decision")}
            </h2>
          </div>
          {score ? (
            <Badge tone={score.source === "wavy" ? "success" : "info"}>
              {score.source === "wavy" ? pick(language, "Verificado vía Wavy", "Verified via Wavy") : pick(language, "Traza demo", "Demo trace")}
            </Badge>
          ) : (
            <Badge tone="neutral">{pick(language, "Esperando wallet", "Awaiting wallet")}</Badge>
          )}
        </div>

        {score ? (
          <div className="mt-5 grid gap-5">
            <div className="rounded-2xl border border-[var(--border)] bg-[linear-gradient(rgba(54,94,82,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(54,94,82,0.18)_1px,transparent_1px)] bg-[length:40px_40px] p-6 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Ark Score
              </p>
              <p className="text-glow mt-2 text-7xl font-black tracking-[-0.08em] text-[var(--foreground)] md:text-8xl">
                {score.composite.creditScore}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Badge
                  tone={decisionTone(score.composite.decision)}
                  className="px-4 py-2 text-sm"
                >
                  {translateDecision(language, score.composite.decision)}
                </Badge>
                <Badge
                  tone={riskTone(score.wavy.riskScore)}
                  className="px-4 py-2 text-sm"
                >
                  {translateRiskLevel(language, score.wavy.riskLevel)}
                </Badge>
              </div>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                {translateRecommendation(language, score.institution, score.composite.decision)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label={pick(language, "Riesgo Wavy", "Wavy risk")} value={`${score.wavy.riskScore}/100`} />
              <Metric
                label={pick(language, "Volumen de trazas", "Trace volume")}
                value={String(score.wavy.transactionsAnalyzed)}
              />
              <Metric label={pick(language, "Red", "Chain")} value="Fuji" />
            </div>

            <div>
              <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {pick(language, "Pruebas criptográficas", "Cryptographic proofs")}
              </h3>
              <div className="mt-3 grid gap-3">
                <Detail label={pick(language, "Hash del sujeto", "Subject hash")} value={score.subjectHash} />
                <Detail
                  label={pick(language, "Raíz Merkle de evidencia", "Evidence Merkle root")}
                  value={score.evidenceHash}
                />
                <Detail label={pick(language, "ID de análisis", "Analysis ID")} value={score.wavy.analysisId} />
                <Detail
                  label={pick(language, "Trazabilidad", "Traceability")}
                  value={`${score.wavy.traceability.provider} ${translateScanType(language, score.wavy.traceability.scanType)}; ${score.wavy.traceability.transactionsAnalyzed} tx; ${score.wavy.traceability.patternsCount} ${pick(language, "patrones", "patterns")}`}
                />
                <Detail
                  label={pick(language, "Escala de riesgo IA", "AI risk scale")}
                  value={`${score.wavy.traceability.riskScoreScale}; ${traceabilityRegistrationLabel(language, score.wavy.traceability.addressRegistration)}`}
                />
                <Detail label={pick(language, "Razón de riesgo", "Risk reason")} value={translateRiskReason(language, score.wavy.riskReason)} />
              </div>
            </div>

            <div
              id="registry"
              className="rounded-2xl border border-[var(--border)] bg-[rgba(17,36,31,0.72)] p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold tracking-[-0.03em]">
                    <Database
                      size={18}
                      aria-hidden="true"
                      className="text-[var(--muted-foreground)]"
                    />
                    {pick(language, "Lectura del registro", "Registry Readback")}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {pick(language, "Contrato:", "Contract:")}{" "}
                    <span className="font-mono text-[var(--foreground)]">
                      {creditScoreRegistryAddress
                        ? shortAddress(creditScoreRegistryAddress)
                        : pick(language, "Configura dirección del contrato", "Set contract address")}
                    </span>
                    {connectedAddress ? (
                      <span>
                        {" "}
                        · {pick(language, "Scorer:", "Scorer:")}{" "}
                        <span className="font-mono text-[var(--foreground)]">
                          {shortAddress(connectedAddress)}
                        </span>
                      </span>
                    ) : null}
                  </p>
                </div>
                <Badge
                  tone={storedScoreTone({
                    hasRegistry: Boolean(creditScoreRegistryAddress),
                    hasStoredScore,
                  })}
                >
                  {storedScoreStatusLabel(language, {
                    hasRegistry: Boolean(creditScoreRegistryAddress),
                    hasStoredScore,
                    isCheckingStoredScore,
                    isStoredScoreCheckError,
                  })}
                </Badge>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                    ? pick(language, "Cambiar a Fuji", "Switch to Fuji")
                    : !isLiveWavyScore
                      ? pick(language, "Requiere Wavy en vivo", "Live Wavy required")
                      : isCheckingScorer
                        ? pick(language, "Verificando scorer", "Checking scorer")
                        : hasStoredScore
                          ? pick(language, "Actualizar registro Fuji", "Update Fuji record")
                          : pick(language, "Guardar en Fuji", "Store on Fuji")}
                </Button>
                {transactionHash ? (
                  <a
                    href={`https://testnet.snowtrace.io/tx/${transactionHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-bright)]"
                  >
                    {pick(language, "Ver transacción", "View transaction")}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                ) : null}
              </div>

              {!isLiveWavyScore ? (
                <div className="mt-4 flex gap-2 rounded-2xl border border-[rgba(245,184,75,0.36)] bg-[rgba(245,184,75,0.10)] p-3 text-sm text-[var(--warning)]">
                  <AlertTriangle
                    size={16}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />
                  <p>
                    {pick(language, "Los scores demo son de solo lectura. Conecta la API Wavy en vivo de Railway antes de guardar evidencia en Fuji.", "Demo scores are read-only. Connect the live Railway Wavy API before storing evidence on Fuji.")}
                  </p>
                </div>
              ) : null}

              {hasStoredScore === true ? (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[rgba(13,27,24,0.76)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {pick(language, "Lectura on-chain", "On-chain readback")}
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
                      {storedReadbackStatusLabel(language, {
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
                        label={pick(language, "Score guardado", "Stored score")}
                        value={`${storedScoreRecord.wavyRiskScore}/100 ${pick(language, "riesgo", "risk")}; ${storedScoreRecord.compositeCreditScore}/100 ${pick(language, "crédito", "credit")}`}
                      />
                      <CompactDetail
                        label={pick(language, "Enum de decisión", "Decision enum")}
                        value={String(storedScoreRecord.decision)}
                      />
                      <CompactDetail
                        label={pick(language, "Submitter", "Submitter")}
                        value={shortAddress(storedScoreRecord.submitter)}
                      />
                      <CompactDetail
                        label={pick(language, "Actualizado", "Updated")}
                        value={formatUnixTimestamp(language, storedScoreRecord.updatedAt)}
                      />
                      <CompactDetail
                        label={pick(language, "ID de análisis", "Analysis ID")}
                        value={storedScoreRecord.wavyAnalysisId}
                      />
                      <CompactDetail
                        label={pick(language, "Institución", "Institution")}
                        value={storedScoreRecord.institution}
                      />
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                      {isLoadingStoredScoreRecord
                        ? pick(language, "Leyendo el registro desde Avalanche Fuji.", "Reading registry record from Avalanche Fuji.")
                        : pick(language, "Fuji reporta un score guardado, pero el registro todavía no está disponible.", "Fuji reports a stored score, but the registry record is not available yet.")}
                    </p>
                  )}
                </div>
              ) : null}

              {writeError ? (
                <div className="mt-4 flex gap-2 rounded-2xl border border-[rgba(245,184,75,0.36)] bg-[rgba(245,184,75,0.10)] p-3 text-sm text-[var(--warning)]">
                  <AlertTriangle
                    size={16}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0"
                  />
                  <p>{writeError.message}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-5 grid min-h-[320px] place-items-center rounded-2xl border border-dashed border-[var(--border)] bg-[rgba(17,36,31,0.46)] p-8 text-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                {pick(language, "Sin prueba generada", "No proof generated")}
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
                {pick(language, "Aquí aparecerán el riesgo de Wavy Node, el score compuesto, la evidencia criptográfica y los controles del registro Fuji.", "Wavy Node risk, composite score, cryptographic evidence, and Fuji registry controls will appear here.")}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[rgba(17,36,31,0.72)] p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-2xl font-bold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1 rounded-2xl border border-[var(--border)] bg-[rgba(17,36,31,0.72)] p-3 md:grid-cols-[160px_1fr]">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="min-w-0 break-all font-mono text-xs text-[var(--accent-bright)] md:text-sm">
        {value}
      </p>
    </div>
  );
}

function CompactDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[rgba(17,36,31,0.72)] p-2">
      <p className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
        {label}
      </p>
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

function scorerStatusLabel(language: Language, input: {
  connectedAddress: string | undefined;
  isAuthorizedScorer: boolean | undefined;
  isCheckingScorer: boolean;
  isScorerCheckError: boolean;
}) {
  if (!input.connectedAddress) return pick(language, "Conecta wallet", "Connect wallet");
  if (input.isCheckingScorer) return pick(language, "Verificando Fuji", "Checking Fuji");
  if (input.isScorerCheckError) return pick(language, "Falló verificación", "Check failed");
  if (input.isAuthorizedScorer === true) return pick(language, "Autorizado", "Authorized");
  if (input.isAuthorizedScorer === false) return pick(language, "No autorizado", "Not authorized");
  return pick(language, "Desconocido", "Unknown");
}

function storedScoreStatusLabel(language: Language, input: {
  hasRegistry: boolean;
  hasStoredScore: boolean | undefined;
  isCheckingStoredScore: boolean;
  isStoredScoreCheckError: boolean;
}) {
  if (!input.hasRegistry) return pick(language, "Configura registro", "Set registry");
  if (input.isCheckingStoredScore) return pick(language, "Verificando Fuji", "Checking Fuji");
  if (input.isStoredScoreCheckError) return pick(language, "Falló verificación", "Check failed");
  if (input.hasStoredScore === true) return pick(language, "Guardado en Fuji", "Stored on Fuji");
  if (input.hasStoredScore === false) return pick(language, "No guardado", "Not stored");
  return pick(language, "Esperando score", "Awaiting score");
}

function storedReadbackStatusLabel(language: Language, input: {
  isLoadingStoredScoreRecord: boolean;
  isStoredScoreRecordError: boolean;
  storedEvidenceMatches: boolean;
  storedScoreRecord: StoredScoreRecord | null;
}) {
  if (input.isLoadingStoredScoreRecord) return pick(language, "Leyendo Fuji", "Reading Fuji");
  if (input.isStoredScoreRecordError) return pick(language, "Falló lectura", "Read failed");
  if (!input.storedScoreRecord) return pick(language, "Esperando registro", "Awaiting record");
  if (input.storedEvidenceMatches) return pick(language, "Evidencia coincide", "Evidence match");
  return pick(language, "Evidencia distinta", "Different evidence");
}

function traceabilityRegistrationLabel(
  language: Language,
  value: ScoreApiResponse["wavy"]["traceability"]["addressRegistration"],
) {
  if (value === "auto-registered-or-reused") return pick(language, "Auto registrada/reutilizada", "Auto registered/reused");
  if (value === "preconfigured") return pick(language, "Dirección preconfigurada del proyecto", "Preconfigured project address");
  return pick(language, "Traza demo", "Demo trace");
}

function translateDecision(
  language: Language,
  decision: ScoreApiResponse["composite"]["decision"],
) {
  const labels = {
    APPROVE_IFC_EQUITY_ISSUANCE: pick(
      language,
      "Aprobar emisión de equity IFC",
      "Approve IFC equity issuance",
    ),
    APPROVE_BANKAOOL_LOAN: pick(
      language,
      "Aprobar crédito Bankaool",
      "Approve Bankaool loan",
    ),
    REVIEW_REQUIRED: pick(
      language,
      "Enviar a revisión institucional",
      "Route to institutional review",
    ),
    DECLINE: pick(
      language,
      "Rechazar hasta remediar riesgo",
      "Decline until risk is remediated",
    ),
  } satisfies Record<ScoreApiResponse["composite"]["decision"], string>;

  return labels[decision];
}

function translateRecommendation(
  language: Language,
  institution: Institution,
  decision: ScoreApiResponse["composite"]["decision"],
) {
  if (decision === "APPROVE_IFC_EQUITY_ISSUANCE") {
    return pick(
      language,
      "Arkangeles puede continuar el flujo de emisión de equity IFC con monitoreo estándar de compliance.",
      "Arkangeles can continue the IFC equity issuance flow with standard compliance monitoring.",
    );
  }

  if (decision === "APPROVE_BANKAOOL_LOAN") {
    return pick(
      language,
      "Bankaool puede avanzar a términos de crédito conservando el registro on-chain para auditoría.",
      "Bankaool can proceed to loan terms while retaining the on-chain score record for audit.",
    );
  }

  if (decision === "DECLINE") {
    return pick(
      language,
      "No aprobar hasta que el dueño de la wallet resuelva actividad de alto riesgo o entregue evidencia adicional.",
      "Do not approve until the wallet owner resolves high-risk activity or supplies additional evidence.",
    );
  }

  if (institution === "arkangeles") {
    return pick(
      language,
      "Enviar esta wallet a revisión de riesgo de Arkangeles antes de aprobar la emisión de equity.",
      "Send this wallet to Arkangeles risk review before equity issuance approval.",
    );
  }

  return pick(
    language,
    "Enviar este solicitante a revisión de originación de Bankaool antes de aprobar el crédito.",
    "Send this applicant to Bankaool underwriting review before loan approval.",
  );
}

function translateRiskLevel(language: Language, riskLevel: ScoreApiResponse["wavy"]["riskLevel"]) {
  const labels = {
    verified: pick(language, "verificado", "verified"),
    minimal: pick(language, "mínimo", "minimal"),
    low: pick(language, "bajo", "low"),
    medium: pick(language, "medio", "medium"),
    high: pick(language, "alto", "high"),
    critical: pick(language, "crítico", "critical"),
  } satisfies Record<ScoreApiResponse["wavy"]["riskLevel"], string>;

  return labels[riskLevel];
}

function translateScanType(language: Language, scanType: string) {
  if (scanType === "wallet-risk") {
    return pick(language, "riesgo-wallet", "wallet-risk");
  }
  return scanType;
}

function translateRiskReason(language: Language, riskReason: string) {
  const normalized = riskReason.toLowerCase();
  if (normalized.includes("low-risk")) {
    return pick(language, "Actividad de wallet Avalanche de bajo riesgo.", riskReason);
  }
  if (normalized.includes("mock") || normalized.includes("demo")) {
    return pick(language, "Traza demo usada cuando Wavy no está disponible.", riskReason);
  }
  return riskReason;
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

function formatUnixTimestamp(language: Language, value: bigint) {
  const timestampMs = Number(value) * 1000;
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
    return pick(language, "Timestamp pendiente", "Pending timestamp");
  }

  return new Intl.DateTimeFormat(language === "es" ? "es-419" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestampMs));
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
