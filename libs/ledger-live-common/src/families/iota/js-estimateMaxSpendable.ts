import BigNumber from "bignumber.js";
import type { Account, AccountLike } from "@ledgerhq/types-live";
import type { Transaction } from "./types";

export default function estimateMaxSpendable({
  account,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parentAccount,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transaction,
}: {
  account: AccountLike;
  parentAccount?: Account | null | undefined;
  transaction?: Transaction | null | undefined;
}): Promise<BigNumber> {
  const balance = account.balance;

  return Promise.resolve(balance);
}
