import { BigNumber } from "bignumber.js";
import type { IotaOperationMode } from "./types";
import { getAccount } from "./api";

export const IOTA_MAX_MEMO_SIZE = 32;
export const IOTA_MIN_ACCOUNT_BALANCE = 100000;

export const recipientHasAsset = async (
  recipientAddress: string,
  assetId: string
): Promise<boolean> => {
  const recipientAccount = await getAccount(recipientAddress);
  return recipientAccount.assets.map((a) => a.assetId).includes(assetId);
};

export const isAmountValid = async (
  recipientAddress: string,
  amount: BigNumber
): Promise<boolean> => {
  const recipientAccount = await getAccount(recipientAddress);
  return recipientAccount.balance.isZero()
    ? amount.gte(IOTA_MIN_ACCOUNT_BALANCE)
    : true;
};

export const computeIotaMaxSpendable = ({
  accountBalance,
  nbAccountAssets,
  mode,
}: {
  accountBalance: BigNumber;
  nbAccountAssets: number;
  mode: IotaOperationMode;
}): BigNumber => {
  const minBalance = computeMinimumIotaBalance(mode, nbAccountAssets);
  const maxSpendable = accountBalance.minus(minBalance);
  return maxSpendable.gte(0) ? maxSpendable : new BigNumber(0);
};

const computeMinimumIotaBalance = (
  mode: IotaOperationMode,
  nbAccountAssets: number
): BigNumber => {
  const base = 100000; // 0.1 Iota = 100000 mIota
  const currentAssets = nbAccountAssets;
  const newAsset = mode === "optIn" ? 1 : 0;
  return new BigNumber(base * (1 + currentAssets + newAsset));
};
