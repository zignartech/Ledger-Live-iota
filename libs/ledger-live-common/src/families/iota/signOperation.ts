// Copyright 2020 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable unicorn/no-nested-ternary */
import { Blake2b, Ed25519 } from "@iota/crypto.js";
import { Converter, WriteStream } from "@iota/util.js";
import {
  serializeInput,
  serializeOutput,
  MAX_INDEXATION_KEY_LENGTH,
  MIN_INDEXATION_KEY_LENGTH,
  serializeTransactionEssence,
  SingleNodeClient,
  IClient,
  ED25519_ADDRESS_TYPE,
  ED25519_SIGNATURE_TYPE,
  INDEXATION_PAYLOAD_TYPE,
  IReferenceUnlockBlock,
  REFERENCE_UNLOCK_BLOCK_TYPE,
  ISigLockedDustAllowanceOutput,
  SIG_LOCKED_DUST_ALLOWANCE_OUTPUT_TYPE,
  IMessage,
  ISigLockedSingleOutput,
  SIG_LOCKED_SINGLE_OUTPUT_TYPE,
  ISignatureUnlockBlock,
  SIGNATURE_UNLOCK_BLOCK_TYPE,
  ITransactionEssence,
  TRANSACTION_ESSENCE_TYPE,
  ITransactionPayload,
  TRANSACTION_PAYLOAD_TYPE,
  IUTXOInput,
} from "@iota/iota.js";

import Iota from "./hw-app-iota";
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
  inputs: IUTXOInput[],
  outputs: {
    address: string;
    addressType: number;
    amount: number;
    isDustAllowance?: boolean;
  }[],
  indexation?: {
    key: Uint8Array | string;
    data?: Uint8Array | string;
  }
): Promise<ITransactionPayload> {
  if (!inputs || inputs.length === 0) {
    throw new Error("You must specify some inputs");
  }
  if (!outputs || outputs.length === 0) {
    throw new Error("You must specify some outputs");
  }

  let localIndexationKeyHex;

  if (indexation?.key) {
    localIndexationKeyHex =
      typeof indexation.key === "string"
        ? Converter.utf8ToHex(indexation.key)
        : Converter.bytesToHex(indexation.key);

    if (localIndexationKeyHex.length / 2 < MIN_INDEXATION_KEY_LENGTH) {
      throw new Error(
        `The indexation key length is ${
          localIndexationKeyHex.length / 2
        }, which is below the minimum size of ${MIN_INDEXATION_KEY_LENGTH}`
      );
    }

    if (localIndexationKeyHex.length / 2 > MAX_INDEXATION_KEY_LENGTH) {
      throw new Error(
        `The indexation key length is ${
          localIndexationKeyHex.length / 2
        }, which exceeds the maximum size of ${MAX_INDEXATION_KEY_LENGTH}`
      );
    }
  }

  const outputsWithSerialization: {
    output: ISigLockedDustAllowanceOutput | ISigLockedSingleOutput;
    serialized: string;
  }[] = [];

  for (const output of outputs) {
    if (output.addressType === ED25519_ADDRESS_TYPE) {
      const o: ISigLockedDustAllowanceOutput | ISigLockedSingleOutput = {
        type: output.isDustAllowance
          ? SIG_LOCKED_DUST_ALLOWANCE_OUTPUT_TYPE
          : SIG_LOCKED_SINGLE_OUTPUT_TYPE,
        address: {
          type: output.addressType,
          address: output.address,
        },
        amount: output.amount,
      };
      const writeStream = new WriteStream();
      serializeOutput(writeStream, o);
      outputsWithSerialization.push({
        output: o,
        serialized: writeStream.finalHex(),
      });
    } else {
      throw new Error(`Unrecognized output address type ${output.addressType}`);
    }
  }

  const inputsSerialized: {
    input: IUTXOInput;
    serialized: string;
  }[] = inputs.map((i) => {
    const writeStream = new WriteStream();
    serializeInput(writeStream, i);
    return {
      ...{ input: i },
      serialized: writeStream.finalHex(),
    };
  });

  // Lexicographically sort the inputs and outputs
  const sortedInputs = inputsSerialized.sort((a, b) =>
    a.serialized.localeCompare(b.serialized)
  );
  const sortedOutputs = outputsWithSerialization.sort((a, b) =>
    a.serialized.localeCompare(b.serialized)
  );

  const transactionEssence: ITransactionEssence = {
    type: TRANSACTION_ESSENCE_TYPE,
    inputs: sortedInputs.map((i) => i.input),
    outputs: sortedOutputs.map((o) => o.output),
    payload: localIndexationKeyHex
      ? {
          type: INDEXATION_PAYLOAD_TYPE,
          index: localIndexationKeyHex,
          data: indexation?.data
            ? typeof indexation.data === "string"
              ? Converter.utf8ToHex(indexation.data)
              : Converter.bytesToHex(indexation.data)
            : undefined,
        }
      : undefined,
  };

  const binaryEssence = new WriteStream();
  serializeTransactionEssence(binaryEssence, transactionEssence);
  const essenceFinal = binaryEssence.finalBytes();

  const essenceHash = Blake2b.sum256(essenceFinal);

  // write essence to the Ledger device data buffer and let the user confirm it.
  let iota = new Iota(transport);
  iota._writeDataBlock(0, essenceFinal.buffer);
  iota._userConfirmEssence();

  // Create the unlock blocks
  const unlockBlocks: (ISignatureUnlockBlock | IReferenceUnlockBlock)[] = [];

  for (const input of sortedInputs) {
    let response = await iota._signSingle(input);
    if (response.signature_type) {
      unlockBlocks.push({
        type: REFERENCE_UNLOCK_BLOCK_TYPE,
        reference: response.reference,
      });
    } else {
      unlockBlocks.push({
        type: SIGNATURE_UNLOCK_BLOCK_TYPE,
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
    unlockBlocks,
  };

  return transactionPayload;
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
const signOperation = (
  account: Account,
  deviceId: DeviceId,
  client: IClient | string,
  inputs: IUTXOInput[],
  outputs: {
    address: string;
    addressType: number;
    amount: number;
    isDustAllowance?: boolean;
  }[],
  indexation?: {
    key: Uint8Array | string;
    data?: Uint8Array | string;
  }
): Observable<SignOperationEvent> =>
  withDevice(deviceId)((transport) => {
    return new Observable((o) => {
      void (async function () {
        try {
          o.next({
            type: "device-signature-requested",
          });

          const localClient =
            typeof client === "string" ? new SingleNodeClient(client) : client;

          const transactionPayload = await buildTransactionPayload(
            account,
            transport,
            inputs,
            outputs,
            indexation
          );

          const message: IMessage = {
            payload: transactionPayload,
          };

          await localClient.messageSubmit(message);

          o.next({
            type: "device-signature-granted",
          });

          let recipients: string[] = [];
          let value: number = 0;
          let signature: string = "";
          for (const output of outputs) {
            // we are assuming one address per account. Remainders will not be considered in the amount nor recipients.
            if (
              !output.isDustAllowance &&
              (output.address != account.freshAddress || outputs.length == 0)
            ) {
              value += output.amount;
              recipients.push(output.address);
            }
          }
          for (const unlockBlock of transactionPayload.unlockBlocks) {
            if (unlockBlock.type == SIG_LOCKED_SINGLE_OUTPUT_TYPE) {
              // we are assuming one address per account. This way only one input have a Signature Unlock Block
              signature = unlockBlock.signature.signature;
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
