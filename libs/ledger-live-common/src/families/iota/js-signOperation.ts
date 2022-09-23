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
} from "@iota/iota.js";

import Iota from "./hw-app-iota";
import { getNetworkId } from "./utils";
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
import { Transaction } from "./types";
import { Blake2b } from "@iota/crypto.js/typings/hashes/blake2b";

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
    amount: transaction.amount.toNumber(),
  };

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
    undefined,
    undefined,
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
  const iota = new Iota(transport);
  iota._writeDataBlock(0, essenceFinal.buffer);
  iota._prepareSigning();
  iota._userConfirmEssence();

  // Create the unlock blocks
  const unlocks: UnlockTypes[] = [];

  for (const input of inputsSerialized) {
    const response = await iota._signSingle(input);
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
  transaction: Transaction
): Observable<SignOperationEvent> =>
  withDevice(deviceId)((transport) => {
    return new Observable((o) => {
      void (async function () {
        try {
          o.next({
            type: "device-signature-requested",
          });

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
