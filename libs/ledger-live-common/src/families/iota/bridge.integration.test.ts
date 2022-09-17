import "../../__tests__/test-helpers/setup";
import { testBridge } from "../../__tests__/test-helpers/bridge";
import type { DatasetTest } from "@ledgerhq/types-live";
import type { Transaction } from "./types";

const dataset: DatasetTest<Transaction> = {
  implementations: ["js"],
  currencies: {
    iota: {
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
            id: `js:2:iota:ADDR:`,
            seedIdentifier: "",
            name: "Iota 1",
            derivationMode: "",
            index: 0,
            freshAddress: "",
            freshAddressPath: "44'/354'/0'/0/0'",
            freshAddresses: [],
            blockHeight: 0,
            operations: [],
            pendingOperations: [],
            currencyId: "iota",
            unitMagnitude: 8,
            lastSyncDate: "",
            balance: "2111000",
          },
          transactions: [
            // HERE WE WILL INSERT OUR test
          ],
        },
      ],
    },
  },
};

testBridge(dataset);