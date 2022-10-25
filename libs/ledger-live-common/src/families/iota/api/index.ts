import BigNumber from "bignumber.js";
import { getEnv } from "../../../env";
import network from "../../../network";
import type { Operation } from "@ledgerhq/types-live";
import { txToOp } from "../bridge/js";
import { BlockResponse, OutputResponse, OutputsResponse } from "./types";

const getIotaUrl = (route): string =>
  `${getEnv("API_IOTA_NODE")}${route || ""}`;
const getShimmerUrl = (route): string =>
  `${getEnv("API_SHIMMER_NODE")}${route || ""}`;

const fetchSingleTransaction = async (transactionId: string) => {
  const {
    data,
  }: {
    data;
  } = await network({
    method: "GET",
    url: getShimmerUrl(`/api/core/v2/transactions/${transactionId}/included-message`),
  });
  return data as BlockResponse;
};

const fetchBalance = async (address: string) => {
  const outputs = await fetchAllOutputs(address);
  let balance = new BigNumber(0);
  outputs.items.forEach(async (outputId) => {
    const output = await fetchSingleOutput(outputId);
    if (!output.metadata.isSpent) {
      balance = balance.plus(output.output.amount);
    }
  });
  return balance;
};

const fetchAllTransactions = async (address: string) => {
  const transactions: BlockResponse[] = [];

  const data = await fetchAllOutputs(address);
  data.items.forEach(async (outputId) => {
    transactions.push(await fetchSingleTransaction(outputId));
  });
  return transactions;
};

const fetchAllOutputs = async (address: string) => {
  const {
    data,
  }: {
    data;
  } = await network({
    method: "GET",
    url: getShimmerUrl(`/api/indexer/v1/outputs/basic?address=${address}`),
  });
  return data as OutputsResponse;
};

const fetchSingleOutput = async (outputId: string) => {
  const {
    data,
  }: {
    data;
  } = await network({
    method: "GET",
    url: getShimmerUrl(`/api/core/v2/outputs/${outputId}`),
  });
  return data as OutputResponse;
};

export const getAccount = async (address: string, accountId: string) => {
  const balance = await fetchBalance(address);
  return {
    blockHeight: undefined, // FIXME:
    balance,
    spendableBalance: balance,
    nonce: undefined, // FIXME:
    lockedBalance: undefined, // FIXME:
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
