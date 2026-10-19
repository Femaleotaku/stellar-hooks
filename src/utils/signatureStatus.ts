import { Keypair, type Operation, type Transaction } from "@stellar/stellar-sdk";

export interface SignerInfo {
  /** Signer public key (G...). */
  key: string;
  weight: number;
}

export interface ThresholdInfo {
  low: number;
  medium: number;
  high: number;
}

export type ThresholdLevel = "low" | "medium" | "high";

export interface SignatureStatus {
  /** Signers whose signature on the transaction is valid. */
  signed: string[];
  /** Signers that have not signed yet. */
  missing: string[];
  /** Sum of the weights of `signed`. */
  collectedWeight: number;
  /** The threshold the transaction must meet. */
  requiredWeight: number;
  level: ThresholdLevel;
  /** True when `collectedWeight >= requiredWeight`: safe to submit. */
  satisfied: boolean;
  /** Signatures that match none of the known signers (or are invalid). */
  unknownSignatures: number;
}

const LOW_OPS = new Set(["allowTrust", "setTrustLineFlags", "bumpSequence", "claimClaimableBalance"]);
const SET_OPTIONS_HIGH_FIELDS = ["masterWeight", "lowThreshold", "medThreshold", "highThreshold", "signer"] as const;

function levelOf(operation: Operation): ThresholdLevel {
  if (operation.type === "accountMerge") return "high";
  if (operation.type === "setOptions") {
    const options = operation as unknown as Record<string, unknown>;
    return SET_OPTIONS_HIGH_FIELDS.some((field) => options[field] !== undefined) ? "high" : "medium";
  }
  return LOW_OPS.has(operation.type) ? "low" : "medium";
}

const RANK: Record<ThresholdLevel, number> = { low: 0, medium: 1, high: 2 };

/** The strictest threshold level among the transaction's operations. */
export function requiredThresholdLevel(operations: Operation[]): ThresholdLevel {
  return operations.reduce<ThresholdLevel>((level, op) => (RANK[levelOf(op)] > RANK[level] ? levelOf(op) : level), "low");
}

/**
 * Checks a transaction's signatures against the account's signers and thresholds.
 * Each signature is cryptographically verified; a signer counts once.
 */
export function getSignatureStatus(
  transaction: Transaction,
  signers: SignerInfo[],
  thresholds: ThresholdInfo,
): SignatureStatus {
  const hash = transaction.hash();
  const signed = new Set<string>();
  let unknownSignatures = 0;

  for (const signature of transaction.signatures) {
    const match = signers.find((signer) => {
      try {
        return Keypair.fromPublicKey(signer.key).verify(hash, signature.signature());
      } catch {
        return false; // not an ed25519 account key
      }
    });
    if (match) signed.add(match.key);
    else unknownSignatures += 1;
  }

  const level = requiredThresholdLevel(transaction.operations);
  const requiredWeight = thresholds[level];
  const collectedWeight = signers.filter((s) => signed.has(s.key)).reduce((sum, s) => sum + s.weight, 0);

  return {
    signed: signers.filter((s) => signed.has(s.key)).map((s) => s.key),
    missing: signers.filter((s) => !signed.has(s.key) && s.weight > 0).map((s) => s.key),
    collectedWeight,
    requiredWeight,
    level,
    satisfied: collectedWeight >= requiredWeight,
    unknownSignatures,
  };
}
