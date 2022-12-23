import estimateMaxSpendable from "./js-estimateMaxSpendable";
import { BigNumber } from "bignumber.js";
import type { Account, Address } from "@ledgerhq/types-live";
import type { Transaction } from "./types";
import { Bech32 } from "@iota/crypto.js";

export async function calculateAmount({
  account,
  transaction,
}: {
  account: Account;
  transaction: Transaction;
}): Promise<BigNumber> {
  //throw new Error(JSON.stringify(transaction));
  const amount =
    transaction.useAllAmount === true
      ? await estimateMaxSpendable({ account })
      : transaction.amount;
  return amount;
}

export const dustAllowanceOutputAmount = 0; // TODO: Implement function

export const getAddress = (a: Account): Address =>
  a.freshAddresses.length > 0
    ? a.freshAddresses[0]
    : { address: a.freshAddress, derivationPath: a.freshAddressPath };

export function getNetworkId(currencyId: string): string {
  switch (currencyId) {
    case "shimmer":
      return "14364762045254553490";
    case "iota":
      return "9374574019616453254";
    case "shimmer_testnet":
      return "8342982141227064571";
    default:
      throw new Error("Invalid currency id in transaction");
  }
}

export const uint8ArrayToAddress = (
  currencyId: string,
  uint8Array: Uint8Array
): string => {
  let address = "";
  switch (currencyId) {
    case "shimmer":
      address = Bech32.encode("smr", uint8Array);
      break;
    case "shimmer_testnet":
      address = Bech32.encode("rms", uint8Array);
      break;
    case "iota":
      address = Bech32.encode("iota", uint8Array);
      break;
    default:
      throw new Error(`currency ID error: "${currencyId}" is not a valid ID`);
  }
  return address;
};

export const addressToPubKeyHash = (address: string): string => {
  let uint8Array = Bech32.decode(address)?.data;
  if (uint8Array == undefined) {
    throw new Error(`Could not decode address: ${address}`);
  } else {
    uint8Array = uint8Array as Uint8Array;
  }
  return "0x" + Buffer.from(uint8Array.slice(1)).toString("hex");
};

export const decimalToHex = (d: number): string => {
  let hex = d.toString(16);
  while (hex.length < 2) {
    hex = "0" + hex;
  }
  return hex;
};

export const arrayToHex = (byteArray: number[] | Uint8Array): string => {
  let s = "0x";
  byteArray.forEach(function (byte) {
    s += ("0" + (byte & 0xff).toString(16)).slice(-2);
  });
  return s;
};

export const deviceResponseToUint8Array = (
  array: any,
  length: number
): Uint8Array => {
  const uint8Array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    uint8Array[i] = array[i];
  }
  return uint8Array;
};
