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
import { parseCurrencyUnit, getCryptoCurrencyById } from "../../../currencies";
import network from "../../../network";
import { makeSync, makeScanAccounts } from "../../../bridge/jsHelpers";
import { makeAccountBridgeReceive } from "../../../bridge/jsHelpers";
import { CurrencyNotSupported } from "@ledgerhq/errors";
import estimateMaxSpendable from "../js-estimateMaxSpendable";

const receive = makeAccountBridgeReceive();

const iotaUnit = getCryptoCurrencyById("iota").units[0];

export const txToOps =
  ({ id, address }) =>
  (tx: Record<string, any>): Operation[] => {
    const ops: Operation[] = [];
    const hash = tx.txid;
    const date = new Date(tx.time * 1000);
    const value = parseCurrencyUnit(iotaUnit, tx.amount);
    const from = tx.address_from;
    const to = tx.address_to;
    const sending = address === from;
    const receiving = address === to;

    if (sending) {
      ops.push({
        id: `${id}-${hash}-OUT`,
        hash,
        type: "OUT",
        value: value,
        fee: new BigNumber(0),
        blockHeight: tx.block_height,
        blockHash: null,
        accountId: id,
        senders: [from],
        recipients: [to],
        date,
        extra: {},
      });
    }

    if (receiving) {
      ops.push({
        id: `${id}-${hash}-IN`,
        hash,
        type: "IN",
        value,
        fee: new BigNumber(0),
        blockHeight: tx.block_height,
        blockHash: null,
        accountId: id,
        senders: [from],
        recipients: [to],
        date,
        extra: {},
      });
    }

    return ops;
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

const getAccountShape = async (info) => {
  const blockHeight = await fetchBlockHeight();
  const balances = await fetchBalances(info.address);

  if (balances.length === 0) {
    return {
      balance: new BigNumber(0),
    };
  }

  const balanceMatch = balances.find((b) => b.asset_hash === "");
  const balance = balanceMatch
    ? parseCurrencyUnit(iotaUnit, String(balanceMatch.amount))
    : new BigNumber(0);
  const txs = await fetchTxs(info.address, (txs) => txs.length < 1000);
  const operations = flatMap(txs, txToOps(info));
  return {
    balance,
    operations,
    blockHeight,
  };
};

const scanAccounts = makeScanAccounts({ getAccountShape });
const sync = makeSync({ getAccountShape });
const currencyBridge: CurrencyBridge = {
  preload: () => Promise.resolve({}),
  hydrate: () => {},
  scanAccounts,
};

const getTransactionStatus = (a: Account): Promise<TransactionStatus> =>
  Promise.reject(
    new CurrencyNotSupported("iota currency not supported", {
      currencyName: a.currency.name,
    })
  );

const accountBridge: AccountBridge<Transaction> = {
  createTransaction,
  updateTransaction,
  prepareTransaction,
  getTransactionStatus,
  estimateMaxSpendable,
  sync,
  receive,
  signOperation,
  broadcast: () => {
    throw new Error("broadcast not implemented");
  },
};
export default {
  currencyBridge,
  accountBridge,
};
