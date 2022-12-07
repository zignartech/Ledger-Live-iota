import type { AccountBridge } from "@ledgerhq/types-live";
import {
  createTransaction,
  updateTransaction,
  prepareTransaction,
} from "../js-transaction";
import signOperation from "../js-signOperation";
import getTransactionStatus from "../js-getTransactionStatus";
import type { Transaction } from "../types";
import { makeAccountBridgeReceive } from "../../../bridge/jsHelpers";
import estimateMaxSpendable from "../js-estimateMaxSpendable";
import { currencyBridge, sync } from "../js-synchronisation";

const receive = makeAccountBridgeReceive();

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
