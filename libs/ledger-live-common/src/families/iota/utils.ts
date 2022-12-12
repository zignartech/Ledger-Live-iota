import estimateMaxSpendable from "./js-estimateMaxSpendable";
import { BigNumber } from "bignumber.js";
import type { Account, Address } from "@ledgerhq/types-live";
import type { Transaction } from "./types";
import { Bech32 } from "@iota/crypto.js";

export async function calculateAmount({
  account,
  transaction,
}: {
  account: Account;
  transaction: Transaction;
}): Promise<BigNumber> {
  //throw new Error(JSON.stringify(transaction));
  const amount =
    transaction.useAllAmount === true
      ? await estimateMaxSpendable({ account })
      : transaction.amount;
  return amount;
}

export const dustAllowanceOutputAmount = 0; // TODO: Implement function

export const getAddress = (a: Account): Address =>
  a.freshAddresses.length > 0
    ? a.freshAddresses[0]
    : { address: a.freshAddress, derivationPath: a.freshAddressPath };

export function getNetworkId(currencyId: string): string {
  switch (currencyId) {
    case "shimmer":
      return "14364762045254553490";
    case "iota":
      return "9374574019616453254";
    case "shimmer_testnet":
      return "8342982141227064571";
    default:
      throw new Error("Invalid currency id in transaction");
  }
}

export const uint8ArrayToAddress = (
  currencyId: string,
  uint8Array: Uint8Array
): string => {
  let address = "";
  switch (currencyId) {
    case "shimmer":
      address = Bech32.encode("smr", uint8Array);
      break;
    case "shimmer_testnet":
      address = Bech32.encode("rms", uint8Array);
      break;
    case "iota":
      address = Bech32.encode("iota", uint8Array);
      break;
    default:
      throw new Error(`currency ID error: "${currencyId}" is not a valid ID`);
  }
  return address;
};
