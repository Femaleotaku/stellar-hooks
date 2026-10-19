import { nativeToScVal } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { decodeInvocationArgs } from "./decodeInvocationArgs";

describe("decodeInvocationArgs", () => {
  const args = [nativeToScVal(7, { type: "u32" }), nativeToScVal("hi", { type: "string" })];

  it("labels arguments positionally and decodes values without a spec", () => {
    expect(decodeInvocationArgs(args, "transfer")).toEqual([
      { name: "arg0", type: "u32", value: 7 },
      { name: "arg1", type: "string", value: "hi" },
    ]);
  });

  it("uses parameter names and types from the spec", () => {
    const spec = {
      getFunc: () => ({
        inputs: () => [
          { name: () => "amount", type: () => ({ switch: () => ({ name: "scSpecTypeU32" }) }) },
          { name: () => "memo", type: () => ({ switch: () => ({ name: "scSpecTypeString" }) }) },
        ],
      }),
    };
    expect(decodeInvocationArgs(args, "transfer", spec as never).map((a) => [a.name, a.type, a.value])).toEqual([
      ["amount", "u32", 7],
      ["memo", "string", "hi"],
    ]);
  });

  it("falls back when the function is not in the spec", () => {
    const spec = { getFunc: () => { throw new Error("missing"); } };
    expect(decodeInvocationArgs(args, "nope", spec as never)[0].name).toBe("arg0");
  });
});
