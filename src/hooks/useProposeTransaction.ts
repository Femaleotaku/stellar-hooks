import { useCallback, useState } from "react";
import { Horizon, Memo, TransactionBuilder, type Operation } from "@stellar/stellar-sdk";
import { useStellarContext } from "../context";
import { useFreighter } from "./useFreighter";
import { unsafeAsXdrString } from "../types";

export interface ProposeOptions {
  memo?: string;
  /** Fee per operation in stroops. Default: 100. */
  fee?: number;
  /** How long other signers have to sign. Default: 24 hours. */
  timeoutSeconds?: number;
}

/** A pending transaction other signers can open. */
export interface TransactionProposal {
  /** Envelope signed by the proposer. */
  xdr: string;
  hash: string;
  proposer: string;
  networkPassphrase: string;
  operationCount: number;
  memo: string | null;
  createdAt: string;
  /** After this time the transaction is no longer valid and must be proposed again. */
  expiresAt: string;
}

export interface UseProposeTransactionReturn {
  propose: (operations: Operation[], options?: ProposeOptions) => Promise<TransactionProposal>;
  proposal: TransactionProposal | null;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
}

const DAY_SECONDS = 24 * 60 * 60;

/**
 * Builds a transaction, applies the proposer's signature, and returns the XDR with
 * the metadata other signers need to review it. Share `proposal.xdr` with
 * `toShareLink` and collect the remaining signatures with `useCollectSignatures`.
 */
export function useProposeTransaction(): UseProposeTransactionReturn {
  const { config } = useStellarContext();
  const { signTransaction, publicKey } = useFreighter();
  const [proposal, setProposal] = useState<TransactionProposal | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const propose = useCallback(
    async (operations: Operation[], options: ProposeOptions = {}): Promise<TransactionProposal> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!publicKey) throw new Error("Freighter is not connected. Call connect() first.");
        const { memo, fee = 100, timeoutSeconds = DAY_SECONDS } = options;

        const account = await new Horizon.Server(config.horizonUrl).loadAccount(publicKey);
        const builder = new TransactionBuilder(account, { fee: String(fee), networkPassphrase: config.networkPassphrase });
        operations.forEach((op) => builder.addOperation(op as unknown as Parameters<typeof builder.addOperation>[0]));
        builder.setTimeout(timeoutSeconds);
        if (memo) builder.addMemo(Memo.text(memo));
        const tx = builder.build();

        const signedXdr = await signTransaction(unsafeAsXdrString(tx.toXDR()), {
          networkPassphrase: config.networkPassphrase,
        });

        const now = Date.now();
        const result: TransactionProposal = {
          xdr: signedXdr,
          hash: tx.hash().toString("hex"),
          proposer: publicKey,
          networkPassphrase: config.networkPassphrase,
          operationCount: operations.length,
          memo: memo ?? null,
          createdAt: new Date(now).toISOString(),
          expiresAt: new Date(now + timeoutSeconds * 1000).toISOString(),
        };
        setProposal(result);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [publicKey, config, signTransaction],
  );

  const reset = useCallback(() => {
    setProposal(null);
    setError(null);
  }, []);

  return { propose, proposal, isLoading, error, reset };
}
