import type {
  TransactionCommon,
  TransactionCommonRaw,
  TransactionStatusCommon,
  TransactionStatusCommonRaw,
} from "@ledgerhq/types-live";

export type NetworkInfo = {
  family: "iota";
};
export type NetworkInfoRaw = {
  family: "iota";
};
export type Transaction = TransactionCommon & {
  family: "iota";
};
export type TransactionRaw = TransactionCommonRaw & {
  family: "iota";
};
export type TransactionStatus = TransactionStatusCommon;
export type TransactionStatusRaw = TransactionStatusCommonRaw;
