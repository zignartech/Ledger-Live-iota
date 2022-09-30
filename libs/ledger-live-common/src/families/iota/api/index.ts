import BigNumber from "bignumber.js";
import { getEnv } from "../../../env";
import network from "../../../network";
import type { Operation } from "@ledgerhq/types-live";
import { txToOp } from "../bridge/js";
import { MessageResponse, OutputsAddressResponse } from "./types";

const getIotaUrl = (route): string =>
  `${getEnv("API_IOTA_NODE")}${route || ""}`;

const fetchSingleTransaction = async (transactionId: string) => {
  const {
    data,
  }: {
    data;
  } = await network({
    method: "GET",
    url: getIotaUrl(`/api/v1/transactions/${transactionId}/included-message`),
  });
  return data as MessageResponse;
};

const fetchBalance = async (address: string) => {
  const {
    data,
  }: {
    data;
  } = await network({
    method: "GET",
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
    method: "GET",
    url: getIotaUrl(`/api/v1/addresses/${address}/outputs`),
  });
  const output = data as OutputsAddressResponse;
  const transactions: MessageResponse[] = [];
  output.data.outputIds.forEach(async (outputId) => {
    transactions.push(await fetchSingleTransaction(outputId));
  });
  return transactions;
};
export const getAccount = async (address: string, accountId: string) => {
  const balanceInfo = await fetchBalance(address);
  const balance = new BigNumber(balanceInfo.balance);
  const spendableBalance = new BigNumber(balanceInfo.balance); //TODO: subtract dust protection outputs
  return {
    blockHeight: balanceInfo.at?.height
      ? Number(balanceInfo.at.height)
      : undefined,
    balance,
    spendableBalance,
    nonce: Number(balanceInfo.nonce),
    lockedBalance: new BigNumber(balanceInfo.miscFrozen),
  };
};

export const getOperations = async (id: string, address: string) => {
  const operations: Operation[] = [];
  const transactions = await fetchAllTransactions(address);
  transactions.forEach((transaction) => {
    const operation = txToOp(transaction, id, address);
    if (operation) {
      operations.push(operation);
    }
  });
  return operations;
};
