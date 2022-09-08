import { BigNumber } from "bignumber.js";
import type { Account, AccountLike } from "@ledgerhq/types-live";
import { getMainAccount } from "../../account";
import type { IotaAccount, IotaTransaction } from "./types";
import { computeIotaMaxSpendable } from "./logic";
import { createTransaction } from "./js-prepareTransaction";
import { getAbandonSeedAddress } from "@ledgerhq/cryptoassets";
import { getEstimatedFees } from "./js-getFeesForTransaction";

export const estimateMaxSpendable = async ({
  account,
  parentAccount,
  transaction,
}: {
  account: AccountLike;
  parentAccount?: Account | null | undefined;
  transaction?: IotaTransaction | null | undefined;
}): Promise<BigNumber> => {
  const mainAccount = getMainAccount(account, parentAccount) as IotaAccount;
  const { iotaResources } = mainAccount;
  if (!iotaResources) {
    throw new Error("Iota account expected");
  }

  const tx = {
    ...createTransaction(),
    subAccountId: account.type === "Account" ? null : account.id,
    ...transaction,
    recipient:
      transaction?.recipient || getAbandonSeedAddress(mainAccount.currency.id),
    useAllAmount: true,
  };

  const tokenAccount =
    tx.subAccountId &&
    mainAccount.subAccounts &&
    mainAccount.subAccounts.find((ta) => ta.id === tx.subAccountId);

  if (tokenAccount) {
    return tokenAccount.balance;
  } else {
    const fees = await getEstimatedFees(mainAccount, tx);

    let maxSpendable = computeIotaMaxSpendable({
      accountBalance: mainAccount.balance,
      nbAccountAssets: iotaResources.nbAssets,
      mode: tx.mode,
    });

    maxSpendable = maxSpendable.minus(fees);

    return maxSpendable.gte(0) ? maxSpendable : new BigNumber(0);
  }
};
