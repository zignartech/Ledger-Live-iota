import {
  AmountRequired,
  NotEnoughBalance,
  InvalidAddressBecauseDestinationIsAlsoSource,
  RecipientRequired,
} from "@ledgerhq/errors";
import type { Transaction, TransactionStatus } from "./types";
import type { Account } from "@ledgerhq/types-live";
import { calculateAmount } from "./utils";
import BigNumber from "bignumber.js";

export default async function getTransactionStatus(
  account: Account,
  transaction: Transaction
): Promise<TransactionStatus> {
  const errors: Record<string, Error> = {};

  if (!transaction.recipient || transaction.recipient.length === 0) {
    errors.recipient = new RecipientRequired("");
  } else {
    if (account.freshAddress === transaction.recipient) {
      errors.recipient = new InvalidAddressBecauseDestinationIsAlsoSource("");
    }
  }

  const amount = await calculateAmount({
    transaction,
    account,
  });

  if (transaction.amount.eq(0) && !transaction.useAllAmount) {
    errors.amount = new AmountRequired();
  } else if (account.balance.isLessThan(amount)) {
    errors.amount = new NotEnoughBalance(`balance: ${account.balance}`);
  }

  return {
    amount,
    errors,
    estimatedFees: new BigNumber(0),
    totalSpent: amount,
    warnings: {},
  };
}
