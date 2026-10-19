import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { getSignatureStatus, requiredThresholdLevel } from "./signatureStatus";

const [a, b, c, outsider] = [Keypair.random(), Keypair.random(), Keypair.random(), Keypair.random()];
const signers = [a, b, c].map((k) => ({ key: k.publicKey(), weight: 1 }));
const thresholds = { low: 1, medium: 2, high: 3 };

function tx(op: ReturnType<typeof Operation.payment> | ReturnType<typeof Operation.setOptions>, signWith: Keypair[]) {
  const built = new TransactionBuilder(new Account(a.publicKey(), "1"), { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(op)
    .setTimeout(0)
    .build();
  signWith.forEach((k) => built.sign(k));
  return built;
}

const payment = () => Operation.payment({ destination: b.publicKey(), asset: Asset.native(), amount: "1" });

describe("requiredThresholdLevel", () => {
  it("classifies operations", () => {
    expect(requiredThresholdLevel([payment()])).toBe("medium");
    expect(requiredThresholdLevel([Operation.bumpSequence({ bumpTo: "5" })])).toBe("low");
    expect(requiredThresholdLevel([Operation.setOptions({ masterWeight: 2 })])).toBe("high");
    expect(requiredThresholdLevel([Operation.setOptions({ homeDomain: "x.com" }), Operation.accountMerge({ destination: b.publicKey() })])).toBe("high");
  });
});

describe("getSignatureStatus", () => {
  it("reports who signed, who is missing and whether the threshold is met", () => {
    const status = getSignatureStatus(tx(payment(), [a]), signers, thresholds);
    expect(status.signed).toEqual([a.publicKey()]);
    expect(status.missing).toEqual([b.publicKey(), c.publicKey()]);
    expect(status).toMatchObject({ collectedWeight: 1, requiredWeight: 2, level: "medium", satisfied: false });
  });

  it("is satisfied once enough weight has signed", () => {
    expect(getSignatureStatus(tx(payment(), [a, c]), signers, thresholds).satisfied).toBe(true);
  });

  it("uses the high threshold for signer changes", () => {
    const status = getSignatureStatus(tx(Operation.setOptions({ masterWeight: 2 }), [a, b]), signers, thresholds);
    expect(status).toMatchObject({ requiredWeight: 3, satisfied: false });
  });

  it("ignores signatures from unknown keys and counts a signer once", () => {
    const status = getSignatureStatus(tx(payment(), [a, a, outsider]), signers, thresholds);
    expect(status.collectedWeight).toBe(1);
    expect(status.unknownSignatures).toBe(1);
  });

  it("weights signers", () => {
    const heavy = [{ key: a.publicKey(), weight: 2 }, { key: b.publicKey(), weight: 1 }];
    expect(getSignatureStatus(tx(payment(), [a]), heavy, thresholds).satisfied).toBe(true);
  });
});
