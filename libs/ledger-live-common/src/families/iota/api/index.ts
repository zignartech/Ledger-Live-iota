import BigNumber from "bignumber.js";
import { getEnv } from "../../../env";
import network from "../../../network";
import type { Operation } from "@ledgerhq/types-live";
import {
  Block,
  OutputResponse,
  OutputsResponse,
  TransactionPayload,
} from "./types";
import { Bech32 } from "@iota/crypto.js";

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
  const transactionIds: string[] = [];

  const outputs = await fetchAllOutputs(address);
  for (let i = 0; i < outputs.items.length; i++) {
    transactions.push(await fetchSingleTransaction(outputs.items[i]));
    const num = Number(await fetchTimestamp(outputs.items[i]));
    timestamps.push(num);
    transactionIds.push(outputs.items[i]);
  }
  return { transactions, timestamps, transactionIds };
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

export const fetchSingleOutput = async (
  outputId: string
): Promise<OutputResponse> => {
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

export const getOperations = async (
  id: string,
  address: string
): Promise<Operation[]> => {
  const operations: Operation[] = [];
  const { transactions, timestamps, transactionIds } =
    await fetchAllTransactions(address);
  for (let i = 0; i < transactions.length; i++) {
    const operation = await txToOp(
      transactions[i],
      id,
      address,
      timestamps[i],
      transactionIds[i]
    );
    if (operation) {
      operations.push(operation);
    }
  }
  return operations;
};

const txToOp = async (
  transaction: Block,
  id: string,
  address: string,
  timestamp: number,
  transactionId: string
): Promise<any> => {
  const data = transaction ? transaction : null;
  if (!data || !data.payload || data.payload?.type != 6) {
    return null;
  }

  // define the outputs and inputs of the transaction / block
  const payload = data.payload as TransactionPayload;
  const essence = payload.essence;
  const outputs = essence.outputs;
  const inputs = essence.inputs;

  const recipients: string[] = [];
  const senders: string[] = [];
  let value = 0;
  let type: "IN" | "OUT" = "IN"; // default is IN. If the address is found in an input, it will be changed to "OUT"

  // senders logic
  for (let i = 0; i < inputs.length; i++) {
    const transactionId = inputs[i].transactionId;
    const outputIndex = "0" + inputs[i].transactionOutputIndex;
    const senderOutput = (await fetchSingleOutput(transactionId + outputIndex))
      .output;
    const senderUnlockCondition: any = senderOutput.unlockConditions[0];
    const senderPubKeyHash: any = senderUnlockCondition.address.pubKeyHash;
    const senderUint8Array = Uint8Array.from(
      senderPubKeyHash
        .match(/.{1,2}/g) // magic
        .map((byte: string) => parseInt(byte, 16))
    );
    // the address of the sender
    const sender = Bech32.encode("smr", senderUint8Array);
    senders.push(sender);
    if (sender == address) type = "OUT";
  }

  // receivers logic
  for (let o = 0; o < outputs.length; o++) {
    if (outputCheck(outputs[o])) {
      const recipientUnlockCondition: any = outputs[o].unlockConditions[0];
      const recipientPubKeyHash: any =
        recipientUnlockCondition.address.pubKeyHash;
      const recipientUint8Array = Uint8Array.from(
        recipientPubKeyHash
          .match(/.{1,2}/g) // magic
          .map((byte: string) => parseInt(byte, 16))
      );
      // the address of the recipient
      const recipient = Bech32.encode("smr", recipientUint8Array);

      // In case the transaction is incoming:
      // add to the value all amount coming into the address.
      // If the transaction is outgoing:
      // add to the value all amount going to other addresses.
      const amount: number = +outputs[o].amount;
      if (type == "IN" && recipient == address) value += amount;
      else if (type == "OUT" && recipient != address) value += amount; // otherwise, it means that it's a remainder and doesn't count into the value

      recipients.push(recipient);
    }
  }

  const op: Operation = {
    id: `${transactionId}-${type}`,
    hash: transactionId, // TODO: Pass the transaction id instead
    type,
    value: new BigNumber(value),
    fee: new BigNumber(0),
    blockHash: "",
    blockHeight: 10, // so it's considered a confirmed transaction
    senders,
    recipients,
    accountId: id,
    date: new Date(timestamp * 1000),
    extra: {},
  };

  return op;
};

const outputCheck = (output: any): boolean => {
  if (
    output.type == 3 && // it's a BasicOutput
    output.unlockConditions.length == 1 && // no other unlockConditions
    output.unlockConditions[0].type == 0 // it's an AddressUnlockCondition
  ) {
    return true;
  } else return false;
};
