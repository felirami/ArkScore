import { isAddress } from "viem";

const registryAddress = process.env.NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS;
const eerc20Address = process.env.NEXT_PUBLIC_EERC20_DEMO_ADDRESS;

export const creditScoreRegistryAddress =
  registryAddress && isAddress(registryAddress)
    ? (registryAddress as `0x${string}`)
    : undefined;

export const eerc20DemoAddress =
  eerc20Address && isAddress(eerc20Address)
    ? (eerc20Address as `0x${string}`)
    : undefined;

export const creditScoreRegistryAbi = [
  {
    type: "function",
    name: "recordScore",
    stateMutability: "nonpayable",
    inputs: [
      { name: "subjectHash", type: "bytes32" },
      { name: "wavyRiskScore", type: "uint8" },
      { name: "compositeCreditScore", type: "uint8" },
      { name: "decision", type: "uint8" },
      { name: "wavyEvidenceHash", type: "bytes32" },
      { name: "wavyAnalysisId", type: "string" },
      { name: "institution", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isScorer",
    stateMutability: "view",
    inputs: [{ name: "scorer", type: "address" }],
    outputs: [{ name: "authorized", type: "bool" }],
  },
  {
    type: "function",
    name: "hasScore",
    stateMutability: "view",
    inputs: [{ name: "subjectHash", type: "bytes32" }],
    outputs: [{ name: "exists", type: "bool" }],
  },
] as const;
