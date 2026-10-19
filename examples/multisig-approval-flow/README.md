# Two-of-three approval flow

One signer proposes a payment; two others review and sign it; it is submitted once the
threshold is met. No backend: the partially signed XDR is passed between signers (see
`docs/guides/multisig-coordination.md`).

```tsx
import { useState } from "react";
import { useCollectSignatures, useMultiSig } from "stellar-hooks";

export function Approval({ signers, thresholds, passphrase }) {
  const { build, sign, submit } = useMultiSig();
  const [xdr, setXdr] = useState<string | null>(null);
  const { status } = useCollectSignatures(xdr, passphrase, signers, thresholds);

  return (
    <>
      {/* 1. Proposer */}
      <button onClick={async () => setXdr(await sign(await build(paymentOps)))}>Propose</button>

      {/* 2. Each reviewer pastes the XDR they received, signs, and sends the result on */}
      <textarea onChange={(e) => setXdr(e.target.value)} placeholder="Paste XDR" />
      <button onClick={async () => xdr && setXdr(await sign(xdr))}>Review and sign</button>

      {/* 3. Anyone can submit once enough weight has signed */}
      {status && (
        <p>
          {status.collectedWeight}/{status.requiredWeight} signed - missing: {status.missing.join(", ") || "none"}
        </p>
      )}
      <button disabled={!status?.satisfied} onClick={() => xdr && submit(xdr)}>Submit</button>
    </>
  );
}
```

With three signers of weight 1 and a medium threshold of 2, the proposer's signature is not
enough (`1/2`); after one more reviewer signs, `status.satisfied` becomes true.
