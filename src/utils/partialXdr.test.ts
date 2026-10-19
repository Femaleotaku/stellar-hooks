import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { exportPartialXdr, importPartialXdr, mergeSignatures, toShareLink } from "./partialXdr";

const [a, b] = [Keypair.random(), Keypair.random()];

function build(seq = "1") {
  return new TransactionBuilder(new Account(a.publicKey(), seq), { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination: b.publicKey(), asset: Asset.native(), amount: "1" }))
    .setTimeout(0)
    .build();
}

describe("partial XDR", () => {
  it("round-trips through a share link", () => {
    const tx = build();
    tx.sign(a);
    const link = toShareLink(exportPartialXdr(tx), "https://app.example/sign#old");
    expect(link.startsWith("https://app.example/sign#xdr=")).toBe(true);
    expect(importPartialXdr(link, Networks.TESTNET).signatures).toHaveLength(1);
    expect(importPartialXdr(exportPartialXdr(tx), Networks.TESTNET).hash()).toEqual(tx.hash());
  });

  it("merges signatures from separate copies and drops duplicates", () => {
    const base = build();
    const signedByA = build();
    signedByA.sign(a);
    const signedByB = build();
    signedByB.sign(b);

    const merged = importPartialXdr(
      mergeSignatures([base.toXDR(), signedByA.toXDR(), signedByB.toXDR(), signedByA.toXDR()], Networks.TESTNET),
      Networks.TESTNET,
    );

    expect(merged.signatures).toHaveLength(2);
    expect(merged.hash()).toEqual(base.hash());
  });

  it("refuses to merge different transactions or invalid input", () => {
    expect(() => mergeSignatures([build("1").toXDR(), build("2").toXDR()], Networks.TESTNET)).toThrow("different transactions");
    expect(() => importPartialXdr("not xdr", Networks.TESTNET)).toThrow();
    expect(() => mergeSignatures([], Networks.TESTNET)).toThrow();
  });
});
