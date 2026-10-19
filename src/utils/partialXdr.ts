import { TransactionBuilder, type Transaction } from "@stellar/stellar-sdk";

const SHARE_PARAM = "xdr";

function parse(xdr: string, networkPassphrase: string): Transaction {
  const tx = TransactionBuilder.fromXDR(xdr.trim(), networkPassphrase);
  if (!("operations" in tx) || "innerTransaction" in tx) {
    throw new Error("Fee-bump transactions are not supported; share the inner transaction instead.");
  }
  return tx as Transaction;
}

/** Serializes a (partially) signed transaction to its base64 XDR envelope. */
export function exportPartialXdr(transaction: Transaction): string {
  return transaction.toXDR();
}

/** A link that carries the XDR in the URL fragment, which browsers never send to a server. */
export function toShareLink(xdr: string, baseUrl: string): string {
  const base = baseUrl.split("#")[0];
  return `${base}#${SHARE_PARAM}=${encodeURIComponent(xdr)}`;
}

/**
 * Imports a transaction from a bare XDR string or a link made by {@link toShareLink}.
 * Throws if the input is not a valid envelope for `networkPassphrase`.
 */
export function importPartialXdr(input: string, networkPassphrase: string): Transaction {
  const trimmed = input.trim();
  const fragment = trimmed.includes("#") ? trimmed.slice(trimmed.indexOf("#") + 1) : "";
  const fromLink = new URLSearchParams(fragment).get(SHARE_PARAM);
  return parse(fromLink ?? trimmed, networkPassphrase);
}

/**
 * Combines signatures collected on separate copies of the same transaction.
 * Every input must be the same transaction (same hash); duplicate signatures are
 * dropped. Returns the merged envelope as XDR.
 */
export function mergeSignatures(xdrs: string[], networkPassphrase: string): string {
  if (xdrs.length === 0) throw new Error("mergeSignatures needs at least one XDR");
  const [first, ...rest] = xdrs.map((xdr) => parse(xdr, networkPassphrase));
  const hash = first.hash().toString("hex");
  const seen = new Set(first.signatures.map((s) => s.toXDR("base64")));

  for (const tx of rest) {
    if (tx.hash().toString("hex") !== hash) {
      throw new Error("Cannot merge signatures: the XDRs are different transactions");
    }
    for (const signature of tx.signatures) {
      const key = signature.toXDR("base64");
      if (!seen.has(key)) {
        seen.add(key);
        first.signatures.push(signature);
      }
    }
  }
  return first.toXDR();
}
