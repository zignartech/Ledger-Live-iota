import estimateMaxSpendable from "./js-estimateMaxSpendable";
import { BigNumber } from "bignumber.js";
import type { Account } from "@ledgerhq/types-live";
import type { Transaction } from "./types";

export async function calculateAmount({
  account,
  transaction,
}: {
  account: Account;
  transaction: Transaction;
}): Promise<BigNumber> {
  const amount =
    transaction.useAllAmount === true
      ? await estimateMaxSpendable({ account })
      : transaction.amount;

  return amount;
}

export const dustAllowanceOutputAmount = 0; // TODO: Implement function

export function getNetworkId(currencyId: string): string {
  switch (currencyId) {
    case "shimmer":
      return "14364762045254553490";
    case "iota":
      return "9374574019616453254";
    default:
      throw new Error("Invalid currency id in transaction");
  }
}
