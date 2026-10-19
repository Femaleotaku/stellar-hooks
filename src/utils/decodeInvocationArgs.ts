import { scValToNative, type contract, type xdr } from "@stellar/stellar-sdk";

export interface DecodedArgument {
  /** Parameter name from the contract spec, or `arg0`, `arg1`... without one. */
  name: string;
  /** Spec type (for example `u32`, `address`, `vec`), or the raw ScVal type without a spec. */
  type: string;
  /** The native JavaScript value. */
  value: unknown;
}

/**
 * Names and types a Soroban invocation's arguments using the contract spec, instead
 * of showing raw XDR values. With no spec (or an unknown function) the arguments
 * are still decoded to native values, labelled `arg0`, `arg1`...
 *
 * @param args - The invocation's `ScVal` arguments.
 * @param functionName - The contract function being called.
 * @param spec - A `contract.Spec` for the contract, when available.
 */
export function decodeInvocationArgs(
  args: xdr.ScVal[],
  functionName: string,
  spec?: contract.Spec,
): DecodedArgument[] {
  let inputs: ReturnType<ReturnType<contract.Spec["getFunc"]>["inputs"]> = [];
  try {
    inputs = spec ? spec.getFunc(functionName).inputs() : [];
  } catch {
    inputs = []; // function not in this spec
  }

  return args.map((arg, index) => {
    const input = inputs[index];
    return {
      name: input ? input.name().toString() : `arg${index}`,
      type: input ? input.type().switch().name.replace(/^scSpecType/, "").toLowerCase() : arg.switch().name.replace(/^scv/, "").toLowerCase(),
      value: scValToNative(arg),
    };
  });
}
