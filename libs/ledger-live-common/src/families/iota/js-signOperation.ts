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
  IndexerPluginClient,
  UTXO_INPUT_TYPE,
  SingleNodeClient,
  IClient,
  DEFAULT_PROTOCOL_VERSION,
  IBlock,
} from "@iota/iota.js";
import { Blake2b } from "@iota/crypto.js";

import Iota from "./hw-app-iota";
import { addressToPubKeyHash, decimalToHex, getNetworkId } from "./utils";
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
import { getUrl } from "./api";

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
): Promise<{ transactionPayload: ITransactionPayload; parents: string[] }> {
  const networkId = getNetworkId(account.currency.id);

  // Start with finding the outputs. They need to have
  // a specific structure
  const outputsWithSerialization: {
    output: IBasicOutput;
    serializedBytes: Uint8Array;
    serializedHex: string;
  }[] = [];

  const pubKeyHash = addressToPubKeyHash(transaction.recipient);
  const o: IBasicOutput = {
    type: BASIC_OUTPUT_TYPE,
    amount: transaction.amount.toString(),
    nativeTokens: [],
    unlockConditions: [
      {
        type: ADDRESS_UNLOCK_CONDITION_TYPE,
        address: {
          type: ED25519_ADDRESS_TYPE,
          pubKeyHash: pubKeyHash as string,
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

  // Find the inputs. For this, we need to use a Client
  // that depends on the cryptocurrency we are sending.
  const iota = new Iota(transport);
  const api_endpoint = getUrl(account.currency.id, "");
  const client = new SingleNodeClient(api_endpoint);

  const output = {
    address: transaction.recipient,
    amount: transaction.amount,
  };
  const { inputs, parents } = await calculateInputs(account, client, [output]);

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
    //outputs: [output as IBasicOutput],
    payload: undefined,
  };

  const binaryEssence = new WriteStream();
  serializeTransactionEssence(binaryEssence, transactionEssence);
  const essenceFinal = Buffer.from(binaryEssence.finalBytes());

  // write essence to the Ledger device data buffer and let the user confirm it.
  await iota._writeDataBuffer(essenceFinal);
  await iota._prepareSigning(0, 0, 0, 0); //TODO: Fill correct values when remainder exists
  await iota._userConfirmEssence();

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

  return { transactionPayload, parents };
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
): Promise<{
  inputs: {
    input: IUTXOInput;
    address: string;
    consumingOutput: OutputTypes;
  }[];
  parents: string[];
}> {
  const localClient =
    typeof client === "string" ? new SingleNodeClient(client) : client;

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
  const parents: string[] = [];
  let finished = false;
  let zeroBalance = 0;

  do {
    const address = account.freshAddress;
    const indexerPlugin = new IndexerPluginClient(client);
    const addressOutputIds = await indexerPlugin.basicOutputs({
      addressBech32: address,
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

            const parent =
              input.transactionId + decimalToHex(input.transactionOutputIndex);
            parents.push(parent);

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

  return { inputs, parents };
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

          const { transactionPayload, parents } = await buildTransactionPayload(
            account,
            transport,
            transaction
          );

          o.next({
            type: "device-signature-granted",
          });

          const recipients: string[] = [transaction.recipient];
          const value = transaction.amount;
          const block: IBlock = {
            protocolVersion: DEFAULT_PROTOCOL_VERSION,
            parents: parents,
            payload: transactionPayload,
            nonce: "0",
          };
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
              signature: JSON.stringify(block),
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
