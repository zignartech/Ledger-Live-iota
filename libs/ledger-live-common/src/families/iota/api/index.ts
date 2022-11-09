import BigNumber from "bignumber.js";
import { getEnv } from "../../../env";
import network from "../../../network";
import type { Operation } from "@ledgerhq/types-live";
import { txToOp } from "../bridge/js";
import { Block, OutputResponse, OutputsResponse } from "./types";

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
    url: getShimmerUrl(
      `/api/core/v2/transactions/${transactionId.slice(0, -4)}/included-block`
    ),
  });
  return data as Block;
};

const fetchTimestamp = async (outputId: string) => {
  const {
    data,
  }: {
    data;
  } = await network({
    method: "GET",
    url: getShimmerUrl(
      `/api/core/v2/outputs/${outputId.slice(0, -4)}/metadata`
    ),
  });
  return data.milestoneTimestampBooked;
};

const fetchBalance = async (address: string) => {
  const outputs = await fetchAllOutputs(address);
  let balance = new BigNumber(0);
  for (let i = 0; i < outputs.items.length; i++) {
    const output = await fetchSingleOutput(outputs.items[i]);
    if (!output.metadata.isSpent) {
      balance = balance.plus(new BigNumber(output.output.amount));
    }
  }
  return balance;
};

const fetchAllTransactions = async (address: string) => {
  const transactions: Block[] = [];
  const timestamps: number[] = [];

  const outputs = await fetchAllOutputs(address);
  for (let i = 0; i < outputs.items.length; i++) {
    transactions.push(await fetchSingleTransaction(outputs.items[i]));
    const num = Number(await fetchTimestamp(outputs.items[i]));
    timestamps.push(num);
  }
  return { transactions, timestamps };
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

export const fetchSingleOutput = async (outputId: string) => {
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

export const getAccount = async (address: string): Promise<any> => {
  const balance = await fetchBalance(address);
  return {
    blockHeight: 10, // FIXME:
    balance,
    spendableBalance: balance,
    nonce: undefined, // FIXME:
    lockedBalance: undefined, // FIXME:
  };
};

export const getOperations = async (id: string, address: string) => {
  const operations: Operation[] = [];
  const { transactions, timestamps } = await fetchAllTransactions(address);
  for (let i = 0; i < transactions.length; i++) {
    const operation = await txToOp(transactions[i], id, address, timestamps[i]);
    if (operation) {
      operations.push(operation);
    }
  }
  return operations;
};
