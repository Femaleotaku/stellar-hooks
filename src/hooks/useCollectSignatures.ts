import { useMemo } from "react";
import { TransactionBuilder, type Transaction } from "@stellar/stellar-sdk";
import { getSignatureStatus, type SignatureStatus, type SignerInfo, type ThresholdInfo } from "../utils/signatureStatus";

export interface UseCollectSignaturesReturn {
  /** Who has signed, who is missing and whether the threshold is met; null until an XDR is provided. */
  status: SignatureStatus | null;
  /** Set when the XDR could not be parsed. */
  error: Error | null;
}

/**
 * Tracks which of an account's signers have signed a transaction, and whether the
 * collected weight meets the threshold its operations require.
 *
 * @param xdr - The (partially) signed transaction envelope, base64.
 * @param networkPassphrase - Network the transaction targets.
 * @param signers - The account's signers (`useMultiSig` returns them after `build`).
 * @param thresholds - The account's low/medium/high thresholds.
 */
export function useCollectSignatures(
  xdr: string | null,
  networkPassphrase: string,
  signers: SignerInfo[],
  thresholds: ThresholdInfo,
): UseCollectSignaturesReturn {
  return useMemo(() => {
    if (!xdr) return { status: null, error: null };
    try {
      const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase) as Transaction;
      return { status: getSignatureStatus(tx, signers, thresholds), error: null };
    } catch (e) {
      return { status: null, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }, [xdr, networkPassphrase, signers, thresholds]);
}
