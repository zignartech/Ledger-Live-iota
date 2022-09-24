import "../../__tests__/test-helpers/setup";
import { testBridge } from "../../__tests__/test-helpers/bridge";
import type { CurrenciesData, DatasetTest } from "@ledgerhq/types-live";
import type { Transaction } from "./types";
import {
  NotEnoughBalance,
  InvalidAddressBecauseDestinationIsAlsoSource,
  AmountRequired,
} from "@ledgerhq/errors";
import { fromTransactionRaw } from "./transaction";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const shimmer: CurrenciesData<Transaction> = {
  scanAccounts: [
    {
      name: "iota seed 1",
      apdus: `
        => 100112344221c00002200000000000000000000000
        <= 213321ac21234122100000000000000000
        => 100112344221c00002200000800000008000000080
        <= 213321ac21234122100000000000000000
        => 100112344221c00002210000800000008000000080
        <= 213321ac21234122100000000000000000
        => 100112344221c00002220000800000008000000080
        <= 213321ac21234122100000000000000000
        => 100112344221c00002230000800000008000000080
        `,
    },
  ],
  accounts: [
    {
      raw: {
        id: `js:2:iota:rms1qpfus7ur3dj0pkng8eufclupmmzm2m99q5uu05hwf9qgmtjfhkjfcyz8ms3`,
        seedIdentifier: "",
        name: "Iota 1",
        derivationMode: "",
        index: 0,
        freshAddress:
          "rms1qpfus7ur3dj0pkng8eufclupmmzm2m99q5uu05hwf9qgmtjfhkjfcyz8ms3",
        freshAddressPath: "2c'/1'/0'/0'/0'",
        freshAddresses: [],
        blockHeight: 0,
        operations: [],
        pendingOperations: [],
        currencyId: "shimmer",
        unitMagnitude: 6,
        lastSyncDate: "",
        balance: "2111000",
      },
      transactions: [
        {
          name: "Recipient and sender must not be the same",
          transaction: fromTransactionRaw({
            family: "iota",
            recipient:
              "rms1qpfus7ur3dj0pkng8eufclupmmzm2m99q5uu05hwf9qgmtjfhkjfcyz8ms3",
            amount: "1000000",
          }),
          expectedStatus: {
            errors: {
              recipient: new InvalidAddressBecauseDestinationIsAlsoSource(),
            },
            warnings: {},
          },
        },
        {
          name: "Amount Required",
          transaction: fromTransactionRaw({
            family: "iota",
            recipient:
              "rms1qpfus7ur3dj0pkng8eufclupmmzm2m99q5uu05hwf9qgmtjfhkjfcyz8ms3",
            amount: "0",
          }),
          expectedStatus: {
            errors: {
              amount: new AmountRequired(),
            },
            warnings: {},
          },
        },
        {
          name: "Not enough balance",
          transaction: fromTransactionRaw({
            family: "iota",
            recipient:
              "rms1qpfus7ur3dj0pkng8eufclupmmzm2m99q5uu05hwf9qgmtjfhkjfcyz8ms3",
            amount: "1000000000000000",
          }),
          expectedStatus: {
            errors: {
              amount: new NotEnoughBalance(),
            },
            warnings: {},
          },
        },
      ],
    },
  ],
};

const dataset: DatasetTest<Transaction> = {
  implementations: ["js"],
  currencies: {
    shimmer,
  },
};

testBridge(dataset);
