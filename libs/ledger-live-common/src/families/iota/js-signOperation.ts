// Copyright 2020 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Converter, WriteStream } from "@iota/util.js";
import {
  serializeOutput,
  serializeTransactionEssence,
  ED25519_ADDRESS_TYPE,
  ED25519_SIGNATURE_TYPE,
  IBasicOutput,
  ITransactionEssence,
  TRANSACTION_ESSENCE_TYPE,
  ITransactionPayload,
  TRANSACTION_PAYLOAD_TYPE,
  BASIC_OUTPUT_TYPE,
  ADDRESS_UNLOCK_CONDITION_TYPE,
  TRANSACTION_ID_LENGTH,
  IUTXOInput,
  UnlockTypes,
  REFERENCE_UNLOCK_TYPE,
  SIGNATURE_UNLOCK_TYPE,
  OutputTypes,
  Bech32Helper,
  IndexerPluginClient,
  UTXO_INPUT_TYPE,
  SingleNodeClient,
  IClient,
} from "@iota/iota.js";
import { Blake2b } from "@iota/crypto.js";

import Iota from "./hw-app-iota";
import { getNetworkId } from "./utils";
import { Transaction } from "./types";

import {
  Account,
  SignOperationEvent,
  DeviceId,
  Operation,
} from "@ledgerhq/types-live";
import { withDevice } from "../../hw/deviceAccess";
import { Observable } from "rxjs";
import BigNumber from "bignumber.js";
import Transport from "@ledgerhq/hw-transport";
import { log } from "@ledgerhq/logs";

const API_ENDPOINTS = {
  IOTA_MAINNET: "",
  IOTA_ALPHANET: "https://api.alphanet.iotaledger.net/",
  SHIMMER_MAINNET: "",
  SHIMMER_TESTNET: "https://api.testnet.shimmer.network/",
};

async function buildOptimisticOperation({
  account,
  value,
  recipients,
  senders,
}: {
  account: Account;
  value: BigNumber;
  recipients: string[];
  senders: string[];
}): Promise<Operation> {
  const operation: Operation = {
    id: `${account.id}--OUT`,
    hash: "",
    type: "OUT",
    value: value,
    fee: new BigNumber(0),
    blockHash: null,
    blockHeight: null,
    senders: senders,
    recipients: recipients,
    accountId: account.id,
    date: new Date(),
    extra: {},
  };

  return operation;
}

/**
 * Build a transaction payload.
 * @param inputsAndSignatureKeyPairs The inputs with the signature key pairs needed to sign transfers.
 * @param outputs The outputs to send.
 * @param indexation Optional indexation data to associate with the transaction.
 * @param indexation.key Indexation key.
 * @param indexation.data Optional index data.
 * @returns The transaction payload.
 */
export async function buildTransactionPayload(
  account: Account,
  transport: Transport,
  transaction: Transaction
): Promise<ITransactionPayload> {
  const networkId = getNetworkId(account.currency.id);

  const outputsWithSerialization: {
    output: IBasicOutput;
    serializedBytes: Uint8Array;
    serializedHex: string;
  }[] = [];

  const output = {
    address: transaction.recipient,
    amount: transaction.amount,
  };

  const iota = new Iota(transport);

  const client = new SingleNodeClient(API_ENDPOINTS.SHIMMER_TESTNET);

  const inputs = await calculateInputs(account, client, [output]);

  const o: IBasicOutput = {
    type: BASIC_OUTPUT_TYPE,
    amount: output.amount.toString(),
    nativeTokens: [],
    unlockConditions: [
      {
        type: ADDRESS_UNLOCK_CONDITION_TYPE,
        address: {
          type: ED25519_ADDRESS_TYPE,
          pubKeyHash: output.address,
        },
      },
    ],
    features: [],
  };
  const writeStream = new WriteStream();
  serializeOutput(writeStream, o);
  const finalBytes = writeStream.finalBytes();
  outputsWithSerialization.push({
    output: o,
    serializedBytes: finalBytes,
    serializedHex: Converter.bytesToHex(finalBytes),
  });

  const inputsSerialized: {
    input: IUTXOInput;
    consumingOutputBytes: Uint8Array;
    inputIdHex: string;
  }[] = inputs.map((i) => {
    // falta crear los inputs
    const writeStreamId = new WriteStream();
    writeStreamId.writeFixedHex(
      "transactionId",
      TRANSACTION_ID_LENGTH,
      i.input.transactionId
    );
    writeStreamId.writeUInt16(
      "transactionOutputIndex",
      i.input.transactionOutputIndex
    );
    const writeStream = new WriteStream();
    serializeOutput(writeStream, i.consumingOutput);
    return {
      ...i,
      inputIdHex: writeStreamId.finalHex(),
      consumingOutputBytes: writeStream.finalBytes(),
    };
  });

  const inputsCommitmentHasher = new Blake2b(Blake2b.SIZE_256);
  for (const input of inputsSerialized) {
    inputsCommitmentHasher.update(Blake2b.sum256(input.consumingOutputBytes));
  }
  const inputsCommitment = Converter.bytesToHex(
    inputsCommitmentHasher.final(),
    true
  );

  const transactionEssence: ITransactionEssence = {
    type: TRANSACTION_ESSENCE_TYPE,
    networkId,
    inputs: inputsSerialized.map((i) => i.input),
    inputsCommitment,
    outputs: outputsWithSerialization.map((o) => o.output),
    payload: undefined,
  };

  const binaryEssence = new WriteStream();
  serializeTransactionEssence(binaryEssence, transactionEssence);
  const essenceFinal = binaryEssence.finalBytes();

  // write essence to the Ledger device data buffer and let the user confirm it.
  iota._writeDataBlock(0, essenceFinal.buffer);
  iota._prepareSigning(0, 0, 0, 0); //TODO: Fill correct values when remainder exists
  iota._userConfirmEssence();

  // Create the unlock blocks
  const unlocks: UnlockTypes[] = [];

  for (let index = 0; index < inputsSerialized.length; index++) {
    const response = await iota._signSingle(index);
    if (response.signature_type) {
      unlocks.push({
        type: REFERENCE_UNLOCK_TYPE,
        reference: response.reference,
      });
    } else {
      unlocks.push({
        type: SIGNATURE_UNLOCK_TYPE,
        signature: {
          type: ED25519_SIGNATURE_TYPE,
          publicKey: response.ed25519_public_key,
          signature: response.ed25519_signature,
        },
      });
    }
  }

  const transactionPayload: ITransactionPayload = {
    type: TRANSACTION_PAYLOAD_TYPE,
    essence: transactionEssence,
    unlocks,
  };

  return transactionPayload;
}

/**
 * Calculate the inputs from the seed and basePath.
 * @param client The client or node endpoint to calculate the inputs with.
 * @param initialAddressState The initial address state for calculating the addresses.
 * @param nextAddressPath Calculate the next address for inputs.
 * @param outputs The outputs to send.
 * @param zeroCount Abort when the number of zero balances is exceeded.
 * @returns The id of the block created and the contructed block.
 */
export async function calculateInputs(
  account: Account,
  client: IClient | string,
  outputs: { address: string; amount: BigNumber }[],
  zeroCount = 5
): Promise<
  {
    input: IUTXOInput;
    address: string;
    consumingOutput: OutputTypes;
  }[]
> {
  const localClient =
    typeof client === "string" ? new SingleNodeClient(client) : client;

  const protocolInfo = await localClient.protocolInfo();

  let requiredBalance: BigNumber = new BigNumber(0);
  for (const output of outputs) {
    requiredBalance = requiredBalance.plus(output.amount);
  }

  let consumedBalance: BigNumber = new BigNumber(0);
  const inputs: {
    input: IUTXOInput;
    address: string;
    consumingOutput: OutputTypes;
  }[] = [];
  let finished = false;
  let zeroBalance = 0;

  do {
    const address = account.freshAddress;
    const addressBytes = Converter.utf8ToBytes(address);

    const indexerPlugin = new IndexerPluginClient(client);
    const addressOutputIds = await indexerPlugin.basicOutputs({
      addressBech32: Bech32Helper.toBech32(
        ED25519_ADDRESS_TYPE,
        addressBytes,
        protocolInfo.bech32Hrp
      ),
    });

    if (addressOutputIds.items.length === 0) {
      zeroBalance++;
      if (zeroBalance >= zeroCount) {
        finished = true;
      }
    } else {
      for (const addressOutputId of addressOutputIds.items) {
        const addressOutput = await localClient.output(addressOutputId);

        if (
          !addressOutput.metadata.isSpent &&
          consumedBalance.isLessThan(requiredBalance)
        ) {
          if (new BigNumber(addressOutput.output.amount).isEqualTo(0)) {
            zeroBalance++;
            if (zeroBalance >= zeroCount) {
              finished = true;
            }
          } else {
            consumedBalance = consumedBalance.plus(addressOutput.output.amount);

            const input: IUTXOInput = {
              type: UTXO_INPUT_TYPE,
              transactionId: addressOutput.metadata.transactionId,
              transactionOutputIndex: addressOutput.metadata.outputIndex,
            };

            inputs.push({
              input,
              address,
              consumingOutput: addressOutput.output,
            });

            if (consumedBalance >= requiredBalance) {
              // We didn't use all the balance from the last input
              // so return the rest to the same address.
              if (
                consumedBalance.minus(requiredBalance).isGreaterThan(0) &&
                addressOutput.output.type === BASIC_OUTPUT_TYPE
              ) {
                const addressUnlockCondition =
                  addressOutput.output.unlockConditions.find(
                    (u) => u.type === ADDRESS_UNLOCK_CONDITION_TYPE
                  );
                if (
                  addressUnlockCondition &&
                  addressUnlockCondition.type ===
                    ADDRESS_UNLOCK_CONDITION_TYPE &&
                  addressUnlockCondition.address.type === ED25519_ADDRESS_TYPE
                ) {
                  outputs.push({
                    amount: consumedBalance.minus(requiredBalance),
                    address: addressUnlockCondition.address.pubKeyHash,
                  });
                }
              }
              finished = true;
            }
          }
        }
      }
    }
  } while (!finished);

  if (consumedBalance < requiredBalance) {
    throw new Error(
      "There are not enough funds in the inputs for the required balance"
    );
  }

  return inputs;
}

/**
 * Send a transfer from the balance on the seed.
 * @param client The client or node endpoint to send the transfer with.
 * @param inputsAndSignatureKeyPairs The inputs with the signature key pairs needed to sign transfers.
 * @param outputs The outputs to send.
 * @param indexation Optional indexation data to associate with the transaction.
 * @param indexation.key Indexation key.
 * @param indexation.data Optional index data.
 * @returns The id of the message created and the remainder address if one was needed.
 */
const signOperation = ({
  account,
  transaction,
  deviceId,
}: {
  account: Account;
  transaction: Transaction;
  deviceId: DeviceId;
}): Observable<SignOperationEvent> =>
  withDevice(deviceId)((transport) => {
    return new Observable((o) => {
      void (async function () {
        try {
          o.next({
            type: "device-signature-requested",
          });
          log("building transaction payload...");

          const transactionPayload = await buildTransactionPayload(
            account,
            transport,
            transaction
          );

          o.next({
            type: "device-signature-granted",
          });

          const recipients: string[] = [];
          const value = transaction.amount;

          let signature = "";
          for (const unlock of transactionPayload.unlocks) {
            if (unlock.type == SIGNATURE_UNLOCK_TYPE) {
              // we are assuming one address per account. This way only one input have a Signature Unlock Block
              signature = unlock.signature.signature;
              break;
            }
          }

          const operation = await buildOptimisticOperation({
            account: account,
            value: new BigNumber(value),
            recipients: recipients,
            senders: [account.freshAddress], // we are assuming one address per account.
          });
          o.next({
            type: "signed",
            signedOperation: {
              operation,
              signature: signature,
              expirationDate: null,
            },
          });
          o.complete();
        } catch (err) {
          o.error(err);
        }
      })();
    });
  });

export default signOperation;
