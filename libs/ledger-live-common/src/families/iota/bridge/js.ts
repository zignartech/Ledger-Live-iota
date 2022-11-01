import { BigNumber } from "bignumber.js";
import { log } from "@ledgerhq/logs";
import type { Account, AccountBridge, Operation } from "@ledgerhq/types-live";
import {
  createTransaction,
  updateTransaction,
  prepareTransaction,
} from "../js-transaction";
import signOperation from "../js-signOperation";
import type { Transaction, TransactionStatus } from "../types";
import { getCryptoCurrencyById } from "../../../currencies";
import network from "../../../network";
import { makeAccountBridgeReceive } from "../../../bridge/jsHelpers";
import { CurrencyNotSupported } from "@ledgerhq/errors";
import estimateMaxSpendable from "../js-estimateMaxSpendable";
import { TransactionPayload, BlockResponse, Block } from "../api/types"; //xddxd
import { currencyBridge, sync } from "../js-synchronisation";
import { Ed25519 } from "@cosmjs/crypto";
import { Ed25519Address } from "@iota/iota.js";

const receive = makeAccountBridgeReceive();

export const txToOp = (transaction: Block, id: string, address: string) => {
  const data = transaction ? transaction : null;
  if (!data || !data.payload || data.payload?.type != 6) {
    return null;
  }
  /*
    Example of data:
    {
      "protocolVersion": 2,
      "parents": [
        "0x174e3151f6ce2cfb7f00829ac4a96a35caa2078cc20eba99359867cd21aad0d6",
        "0x5807bb4ad068e6cdadd103218e4e24ed55b62c985d4f64e97808d9f09180f89c",
        "0x7a09324557e9200f39bf493fc8fd6ac43e9ca750c6f6d884cc72386ddcb7d695",
        "0xde9e9d780ba7ebeebc38da16cb53b2a8991d38eee94bcdc3f3ef99aa8c345652"
      ],
      "payload": {
        "type": 6,
        "essence": {
          "type": 1,
          "networkId": "1337133713371337",
          "inputsCommitment": "0x0e6c2998f5177834ecb3bae1596d5056af76e487386eecb19727465b4be86a79",
          "inputs": [
            {
              "type": 0,
              "transactionId": "0xaf7579fb57746219561072c2cc0e4d0fbb8d493d075bd21bf25ae81a450c11ef",
              "transactionOutputIndex": 0
            }
          ],
          "outputs": [
            {
              "type": 3,
              "unlockConditions": {
                "type": 0,
                "address": {
                  "type": 0,
                  "pubKeyHash": "0xa18996d96163405e3c0eb13fa3459a07f68a89e8cf7cc239c89e7192344daa5b"
                }
              },
              "amount": "1000000"
            }
          ],
          "payload": {
            "type": 2,
            "index": "0x454f59",
            "data": ""
          }
        },
        "unlocks": [
          {
            "type": 0,
            "signature": {
              "type": 0,
              "publicKey": "0xee26ac07834c603c22130fced361ca58552b0dbfc63e4b73ba24b3b59d9f4050",
              "signature": "0x0492a353f96883c472e2686a640e77eda30be8fcc417aa9fc1c15eae854661e0253287be6ea68f649f19ca590de0a6c57fb88635ef0e013310e0be2b83609503"
            }
          }
        ]
      },
      "nonce": "17293822569102719312"
    }
  */
  const payload = data.payload as TransactionPayload;
  const essence = payload.essence;
  const inputs = essence.inputs;
  const outputs = essence.outputs;
  const input = inputs[0];
  const output = outputs[0];
  const value = output.amount;
  const type = input.transactionId === id ? "OUT" : "IN";
  const blockHeight = 10; // FIXME: and this?

  const op: Operation = {
    id: `${id}-${type}`,
    hash: "",
    type,
    value: new BigNumber(value),
    fee: new BigNumber(0),
    blockHash: "",
    blockHeight: blockHeight,
    senders: [input.transactionId],
    recipients: [address], //((output.unlockConditions as AddressUnlockCondition).address as Ed25519Address).toAddress(],
    accountId: id,
    date: new Date(),
    extra: {},
  };

  /*throw new Error(
    op.accountId +
      "\n" +
      op.blockHash +
      "\n" +
      op.blockHeight?.toString +
      "\n" +
      op.date.toString +
      "\n" +
      op.fee.toString +
      "\n" +
      op.hash +
      "\n" +
      op.id +
      "\n" +
      op.recipients[0] +
      "\n" +
      op.senders[0] +
      "\n" +
      op.type.toString +
      "\n" +
      op.value.toString
  );*/

  return op;
};

const API_ENDPOINTS = {
  IOTA_MAINNET: "",
  IOTA_ALPHANET: "https://api.alphanet.iotaledger.net/",
  SHIMMER_MAINNET: "",
  SHIMMER_TESTNET: "https://api.testnet.shimmer.network/",
};

async function fetch(path: string) {
  const url = API_ENDPOINTS.SHIMMER_TESTNET + path;
  const { data } = await network({
    method: "GET",
    url,
  });
  log("http", url);
  return data;
}

export async function fetchBlockHeight() {
  const data = await fetch("/api/main_net/v1/get_height");
  return data.height;
}

const getTransactionStatus = (a: Account): Promise<TransactionStatus> =>
  Promise.reject(
    new CurrencyNotSupported("iota currency not supported", {
      currencyName: a.currency.name,
    })
  );

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
