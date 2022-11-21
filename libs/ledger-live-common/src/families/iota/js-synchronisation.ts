import type { Account, CurrencyBridge } from "@ledgerhq/types-live";
import type { GetAccountShape } from "../../bridge/jsHelpers";
import { makeSync, makeScanAccounts, mergeOps } from "../../bridge/jsHelpers";

import { encodeAccountId } from "../../account";

import { getAccount, getOperations } from "./api";

const getAccountShape: GetAccountShape = async (info) => {
  const { address, currency, initialAccount, derivationMode } = info;
  const oldOperations = initialAccount?.operations || [];

  const accountId = encodeAccountId({
    type: "js",
    version: "2",
    currencyId: currency.id,
    xpubOrAddress: address,
    derivationMode,
  });

  // get the current account balance state depending your api implementation
  const { blockHeight, balance, spendableBalance } = await getAccount(
    currency.id,
    address
  );
  // Merge new operations with the previously synced ones
  const newOperations = await getOperations(accountId, currency.id, address);
  const operations = mergeOps(oldOperations, newOperations);

  const shape = {
    balance,
    spendableBalance,
    operationsCount: operations.length,
    blockHeight,
    id: accountId,
  };

  return { ...shape, operations };
};

const postSync = (initial: Account, parent: Account) => parent;

export const scanAccounts = makeScanAccounts({ getAccountShape });
export const sync = makeSync({ getAccountShape, postSync });

export const currencyBridge: CurrencyBridge = {
  preload: () => Promise.resolve({}),
  hydrate: () => {},
  scanAccounts,
};
