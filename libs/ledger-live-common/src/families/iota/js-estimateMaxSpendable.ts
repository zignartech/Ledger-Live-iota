import BigNumber from "bignumber.js";
import { dustAllowanceOutputAmount } from "./utils";
import type { AccountLike } from "@ledgerhq/types-live";

export default function estimateMaxSpendable({
  account,
}: {
  account: AccountLike;
}): Promise<BigNumber> {
  const balance = account.balance;

  const maxSpendable = balance.minus(dustAllowanceOutputAmount);

  return Promise.resolve(maxSpendable);
}
