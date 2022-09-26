import type { Account } from '@ledgerhq/types-live';
import type { GetAccountShape } from '../../bridge/jsHelpers';
import { makeSync, makeScanAccounts, mergeOps } from '../../bridge/jsHelpers';

import { encodeAccountId } from '../../account';

import { getAccount, getOperations } from './api';
import { getEnv } from '../../env';



const getAccountShape: GetAccountShape = async (info) => {
  const { address, currency, initialAccount, derivationMode } = info;
  const oldOperations = initialAccount?.operations || [];

  // Needed for incremental synchronisation
  const startAt = oldOperations.length
    ? (oldOperations[0].blockHeight || 0) + 1
    : 0;

  const accountId = encodeAccountId({
    type: 'js',
    version: '2',
    currencyId: currency.id,
    xpubOrAddress: address,
    derivationMode,
  });

  // get the current account balance state depending your api implementation
  const { blockHeight, balance, spendableBalance } = await getAccount(
    address,
    accountId
  );

  // Merge new operations with the previously synced ones
  const newOperations = await txToOps(id, address);
  const operations = mergeOps(oldOperations, newOperations);

  const shape = {
    id,
    balance,
    spendableBalance: balance,
    operationsCount: operations.length,
    blockHeight,
    myCoinResources: {
      nonce,
      additionalBalance,
    },
  };

  return { ...shape, operations };
};

const postSync = (initial: Account, parent: Account) => parent;

export const scanAccounts = makeScanAccounts({ getAccountShape });
export const sync = makeSync({ getAccountShape, postSync });

