import { BigNumber } from "bignumber.js";
import type { Account, AccountBridge, Operation } from "@ledgerhq/types-live";
import {
  createTransaction,
  updateTransaction,
  prepareTransaction,
} from "../js-transaction";
import signOperation from "../js-signOperation";
import type { Transaction, TransactionStatus } from "../types";
import { makeAccountBridgeReceive } from "../../../bridge/jsHelpers";
import { CurrencyNotSupported } from "@ledgerhq/errors";
import estimateMaxSpendable from "../js-estimateMaxSpendable";
import { TransactionPayload, Block } from "../api/types"; //xddxd
import { currencyBridge, sync } from "../js-synchronisation";
import { fetchSingleOutput } from "../api";
import { Bech32 } from "@iota/crypto.js";

const receive = makeAccountBridgeReceive();

export const txToOp = async (
  transaction: Block,
  id: string,
  address: string,
  timestamp: number
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

  for (let i = 0; i < inputs.length; i++) {
    const transactionId = inputs[i].transactionId;
    const senderOutput = (await fetchSingleOutput(transactionId)).output;
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
    id: `${id}-${type}`,
    hash: data.nonce, // TODO: Pass the transaction id instead
    type,
    value: new BigNumber(value),
    fee: new BigNumber(0),
    blockHash: data.nonce,
    blockHeight: 10, // so it's considered a confirmed transaction
    senders: senders,
    recipients,
    accountId: id,
    date: new Date(timestamp * 1000),
    extra: {},
  };

  return op;
};

const getTransactionStatus = (a: Account): Promise<TransactionStatus> =>
  Promise.reject(
    new CurrencyNotSupported("iota currency not supported", {
      currencyName: a.currency.name,
    })
  );

const outputCheck = (output: any): boolean => {
  if (
    output.type == 3 && // it's a BasicOutput
    output.unlockConditions.length == 1 && // no other unlockConditions
    output.unlockConditions[0].type == 0 // it's an AddressUnlockCondition
  ) {
    return true;
  } else return false;
};

const accountBridge: AccountBridge<Transaction> = {
  sync,
  createTransaction,
  updateTransaction,
  prepareTransaction,
  getTransactionStatus,
  estimateMaxSpendable,
  receive,
  signOperation,
  broadcast: () => {
    throw new Error("broadcast not implemented");
  },
};
export default {
  accountBridge,
  currencyBridge,
};
