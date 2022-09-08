import type { BigNumber } from "bignumber.js";
import type {
  Account,
  AccountRaw,
  Operation,
  OperationRaw,
  TransactionCommon,
  TransactionCommonRaw,
  TransactionStatusCommon,
  TransactionStatusCommonRaw,
} from "@ledgerhq/types-live";

export const IotaOperationTypeEnum = {
  PAYMENT: 0,
  ASSET_OPT_IN: 7,
  ASSET_OPT_OUT: 8,
  ASSET_TRANSFER: 9,
};

export type IotaResources = {
  rewards: BigNumber;
  // Ledger Live only supports a limited list of ASA (defined here https://github.com/LedgerHQ/ledgerjs/blob/master/packages/cryptoassets/data/asa.js)
  // This is the actual number of ASA opted-in for the Iota account
  nbAssets: number;
};
export type IotaResourcesRaw = {
  rewards: string;
  nbAssets: number;
};
export type IotaOperationMode = "send" | "optIn" | "claimReward";

export type IotaTransaction = TransactionCommon & {
  family: "iota";
  mode: IotaOperationMode;
  fees: BigNumber | null | undefined;
  assetId: string | null | undefined;
  memo: string | null | undefined;
};
export type IotaTransactionRaw = TransactionCommonRaw & {
  family: "iota";
  mode: IotaOperationMode;
  fees: string | null | undefined;
  assetId: string | null | undefined;
  memo: string | null | undefined;
};
export type TransactionStatus = TransactionStatusCommon;
export type TransactionStatusRaw = TransactionStatusCommonRaw;
export type Transaction = IotaTransaction;
export type TransactionRaw = IotaTransactionRaw;
export type IotaOperation = Operation & {
  extra: IotaExtraTxInfo;
};
export type IotaOperationRaw = OperationRaw & {
  extra: IotaExtraTxInfo;
};
export type IotaExtraTxInfo = {
  rewards?: BigNumber;
  memo?: string;
  assetId?: string;
};
export type IotaAccount = Account & {
  iotaResources: IotaResources;
};
export type IotaAccountRaw = AccountRaw & {
  iotaResources: IotaResourcesRaw;
};
