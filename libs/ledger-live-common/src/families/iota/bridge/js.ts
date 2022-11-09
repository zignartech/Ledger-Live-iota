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

  const payload = data.payload as TransactionPayload;
  const essence = payload.essence;
  const outputs = essence.outputs;

  const recipients: string[] = [];
  const value = new BigNumber(0);

  const transactionInputId = essence.inputs[0].transactionId; // TODO: Do it as a list of inputs
  const senderOutput = (await fetchSingleOutput(transactionInputId)).output;
  const senderUnlockCondition: any = senderOutput.unlockConditions[0];
  const senderPubKeyHash: any = senderUnlockCondition.address.pubKeyHash;
  const senderUint8Array = Uint8Array.from(
    senderPubKeyHash
      .match(/.{1,2}/g) // magic
      .map((byte: string) => parseInt(byte, 16))
  );
  const sender = Bech32.encode("smr", senderUint8Array);

  const type = sender == address ? "OUT" : "IN";

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
      const recipient = Bech32.encode("smr", recipientUint8Array);

      if (recipient == sender) continue; // it means that it's a remainder and doesn't count as a transaction

      recipients.push(recipient);
      value.plus(outputs[o].amount);
    }
  }

  const op: Operation = {
    id: `${id}-${type}`,
    hash: data.nonce, // TODO: Pass the transaction id instead
    type,
    value,
    fee: new BigNumber(0),
    blockHash: data.nonce,
    blockHeight: 10, // so it's considered a confirmed transaction
    senders: [sender],
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
