import { BigNumber } from "bignumber.js";
import flatMap from "lodash/flatMap";
import { log } from "@ledgerhq/logs";
import type {
  Account,
  AccountBridge,
  CurrencyBridge,
  Operation,
} from "@ledgerhq/types-live";
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
import { MessageResponse, TransactionPayload, Message } from "../api/types"; //xddxd
import { sync } from "../js-synchronisation";

const receive = makeAccountBridgeReceive();

const iotaUnit = getCryptoCurrencyById("iota").units[0];

export const txToOp =
  (transaction: MessageResponse, id: string, address: string) => {
    const data = transaction.data.allOf && transaction.data.allOf[0] ? transaction.data.allOf[0] : null;
    if (!data) {
      return null;
    }
    /*
    Example of data:
    {
      "data": {
        "networkId": "7712883261355838377",
        "parentMessageIds": [
          "174e3151f6ce2cfb7f00829ac4a96a35caa2078cc20eba99359867cd21aad0d6",
          "5807bb4ad068e6cdadd103218e4e24ed55b62c985d4f64e97808d9f09180f89c",
          "7a09324557e9200f39bf493fc8fd6ac43e9ca750c6f6d884cc72386ddcb7d695",
          "de9e9d780ba7ebeebc38da16cb53b2a8991d38eee94bcdc3f3ef99aa8c345652"
        ],
        "payload": {
          "type": 0,
          "essence": {
            "type": 0,
            "inputs": [
              {
                "type": 0,
                "transactionId": "af7579fb57746219561072c2cc0e4d0fbb8d493d075bd21bf25ae81a450c11ef",
                "transactionOutputIndex": 0
              }
            ],
            "outputs": [
              {
                "type": 0,
                "address": {
                  "type": 0,
                  "address": "a18996d96163405e3c0eb13fa3459a07f68a89e8cf7cc239c89e7192344daa5b"
                },
                "amount": 1000000
              }
            ],
            "payload": {
              "type": 2,
              "index": "454f59",
              "data": ""
            }
          },
          "unlockBlocks": [
            {
              "type": 0,
              "signature": {
                "type": 0,
                "publicKey": "ee26ac07834c603c22130fced361ca58552b0dbfc63e4b73ba24b3b59d9f4050",
                "signature": "0492a353f96883c472e2686a640e77eda30be8fcc417aa9fc1c15eae854661e0253287be6ea68f649f19ca590de0a6c57fb88635ef0e013310e0be2b83609503"
              }
            }
          ]
        },
        "nonce": "17293822569102719312"
      }
    }
     */
    const realData = data as Message;
    const payload = realData.payload as TransactionPayload;
    const essence = payload.essence;
    const inputs = essence.inputs;
    const outputs = essence.outputs;
    const input = inputs[0];
    const output = outputs[0];
    const value = output.amount;
    const type = address === output.address.address ? "IN" : "OUT";
    const hash = "10"; // FIXME: what is this?
    const blockHash = "15"; FIXME: // and this?
    const blockHeight = 0; // FIXME: and this?

    const op: Operation = {
      id: `${id}-${hash}-${type}`,
      hash,
      type,
      value: new BigNumber(value),
      fee: new BigNumber(0),
      blockHash,
      blockHeight: blockHeight,
      senders: [input.transactionId],
      recipients: [address],
      accountId: id,
      date: new Date(),
      extra: {},
  };

  return op;
}

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

async function fetchBalances(addr: string) {
  const data = await fetch(`/api/main_net/v1/get_balance/${addr}`);
  return data.balance;
}

export async function fetchBlockHeight() {
  const data = await fetch("/api/main_net/v1/get_height");
  return data.height;
}

async function fetchTxs(
  addr: string,
  shouldFetchMoreTxs: (arg0: Operation[]) => boolean
) {
  let i = 0;

  const load = () =>
    fetch(`/api/main_net/v1/get_address_abstracts/${addr}/${i + 1}`);

  let payload = await load();
  let txs = [];

  while (payload && i < payload.total_pages && shouldFetchMoreTxs(txs)) {
    txs = txs.concat(payload.entries);
    i++;
    payload = await load();
  }

  return txs;
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
};
