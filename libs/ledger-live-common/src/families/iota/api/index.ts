import { Account } from '@ledgerhq/types-live';
import axios, { AxiosResponse } from 'axios';
import BigNumber from 'bignumber.js';
import { getEnv } from '../../../env';
import network from '../../../network';

const getIotaUrl = (route): string =>
  `${getEnv('API_IOTA_NODE')}${route || ''}`;

const fetchBalance = async (address: string) => {
  const {
    data,
  }: {
    data;
  } = await network({
    method: 'GET',
    url: getIotaUrl(`/api/v1/addresses/${address}`),
  });
  return data;
};

const fetchAllTransactions = async (address: string) => {
    const {
        data,
    }: {
        data;
    } = await network({
        method: 'GET',
        url: getIotaUrl(`/api/v1/addresses/${address}/outputs`),
    });
    return data;
}
export const getAccount = async (address: string, accountId: string) => {
  const balanceInfo = await fetchBalance(address);
  const balance = new BigNumber(balanceInfo.balance);
  const spendableBalance = new BigNumber(balanceInfo.balance);
  return {
    blockHeight: balanceInfo.at?.height ? Number(balanceInfo.at.height) : null,
    balance,
    spendableBalance,
    nonce: Number(balanceInfo.nonce),
    lockedBalance: new BigNumber(balanceInfo.miscFrozen),
  };
};

export const getOperations = async (
  id: string,
  address: string,
  startAt: number
) => {
  const operations = [];
  const transactions = await getTransactions(address, startAt);
  transactions.forEach((transaction) => {
    const operation: Operation = {
      id,
      hash: transaction.hash,
      type: transaction.type,
      value: transaction.value,
      fee: transaction.fee,
      blockHeight: transaction.blockHeight,
      blockHash: transaction.blockHash,
      senders: transaction.senders,
      recipients: transaction.recipients,
      accountId: id,
    };
    operations.push(operation);
  });
  return operations;
};
