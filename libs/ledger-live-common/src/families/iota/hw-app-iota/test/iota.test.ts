import { Bip32Path } from "@iota/crypto.js";
import {
    Bech32Helper,
    Ed25519Address,
    Ed25519Seed,
    ED25519_ADDRESS_TYPE,
    getBalance,
    getUnspentAddress,
    getUnspentAddresses,
    IKeyPair,
    ISigLockedSingleOutput,
    IUTXOInput,
    sendAdvanced,
    SIG_LOCKED_SINGLE_OUTPUT_TYPE,
    SingleNodeClient,
    UTXO_INPUT_TYPE
} from "@iota/iota.js";
import { Converter } from "@iota/util.js";
import fs from 'fs';
import path from 'path';
import { IReferenceUnlockBlock, REFERENCE_UNLOCK_BLOCK_TYPE } from "@iota/iota.js";
import { ISignatureUnlockBlock, SIGNATURE_UNLOCK_BLOCK_TYPE } from "@iota/iota.js";

import Iota from '../index';

import {
  RecordStore,
  openTransportReplayer,
} from '@ledgerhq/hw-transport-mocker';

const API_ENDPOINT = "https://api.lb-0.h.chrysalis-devnet.iota.cafe";

const BIP32_PATH = "44'/1'/0'/0'/0'";

const OUTPUT_ADDRESS = "atoi1qzq9k888j9qmd735lfcpcn3r82umtysaj8uqa25kgprdaluxqmfpyqhtwk0";

const NOW = () => 1000;

const EXPECTED_RESULTS = {
  address: "",
  version: '0.5.0',
  maxBundleSize: 8,
};

describe('Iota', function () {
  let transport;
  let iota;

  beforeEach(async function () {
    const recordingName = this.currentTest.fullTitle().replace(/[^\w]+/g, '_');
    const recordingFileName = path.join(
      path.resolve(),
      'test',
      'recordings',
      recordingName + '.txt'
    );

    // read only if recording exists
    const recording = fs.existsSync(recordingFileName)
      ? fs.readFileSync(recordingFileName, 'utf-8')
      : '';
    const recordStore = RecordStore.fromString(recording);
    transport = await openTransportReplayer(recordStore);
    iota = new Iota(transport);
  });

  afterEach(async function () {
    await transport.close();
  });

  /*describe('#getAddress', function () {
    it('without checksum', async function () {
      await iota.setActiveSeed(BIP32_PATH, 2);
      const address = await iota.getAddress(0);

      expect(address).to.equal(EXPECTED_RESULTS.address);
    });

    it('with checksum', async function () {
      await iota.setActiveSeed(BIP32_PATH, 2);
      const address = await iota.getAddress(0, { checksum: true });

      expect(address).to.equal(addChecksum(EXPECTED_RESULTS.address));
    });

    it('not initialized', async function () {
      await expect(iota.getAddress(0)).to.be.rejectedWith(Error, 'initialized');
    });
  });*/

  describe('#getAppVersion', function () {
    it('can get version', async function () {
      const version = await iota.getAppVersion();

      expect(version).toEqual(EXPECTED_RESULTS.version);
    });
  });

  describe('#prepareTransfers', function () {
    test("createTransaction", async () => {
      const client = new SingleNodeClient(API_ENDPOINT);

    const nodeInfo = await client.info();


    console.log("Genesis");

    const genesisPath = new Bip32Path("m/44'/4218'/0'/0'/0'");


    // Get the address for the path seed which is actually the Blake2b.sum256 of the public key
    const genesisWalletAddress = iota.getAddress(BIP32_PATH, { prefix: 'atoi' });
    console.log("\tAddress Bech32", genesisWalletAddress);


    // Because we are using the genesis address we must use send advanced as the input address is
    // not calculated from a Bip32 path, if you were doing a wallet to wallet transfer you can just use send
    // which calculates all the inputs/outputs for you
    const genesisAddressOutputs = await client.addressEd25519Outputs(genesisWalletAddress);

    const inputsWithKeyPairs: {
        input: IUTXOInput;
        addressKeyPair: IKeyPair;
    }[] = [];

    let totalGenesis = 0;

    for (let i = 0; i < genesisAddressOutputs.outputIds.length; i++) {
        const output = await client.output(genesisAddressOutputs.outputIds[i]);
        if (!output.isSpent) {
            inputsWithKeyPairs.push({
                input: {
                    type: UTXO_INPUT_TYPE,
                    transactionId: output.transactionId,
                    transactionOutputIndex: output.outputIndex
                },
                addressKeyPair: genesisWalletKeyPair
            });
            if (output.output.type === SIG_LOCKED_SINGLE_OUTPUT_TYPE) {
                totalGenesis += (output.output as ISigLockedSingleOutput).amount;
            }
        }
    }

    const amountToSend = 10000000;

    const outputs: {
        address: string;
        addressType: number;
        amount: number;
    }[] = [
        // This is the transfer to the new address
        {
            address: OUTPUT_ADDRESS,
            addressType: ED25519_ADDRESS_TYPE,
            amount: amountToSend
        },
        // Sending remainder back to genesis
        {
            address: genesisWalletAddressHex,
            addressType: ED25519_ADDRESS_TYPE,
            amount: totalGenesis - amountToSend
        }
    ];

    const { messageId } = await sendAdvanced(client, inputsWithKeyPairs, outputs, {
        key: Converter.utf8ToBytes("WALLET"),
        data: Converter.utf8ToBytes("Not trinity")
    });

    console.log("Created Message Id", messageId);

    const newAddressBalance = await getBalance(client, walletSeed, 0);
    console.log("Wallet 1 Address Balance", newAddressBalance);

    const unspentAddress = await getUnspentAddress(client, walletSeed, 0);
    console.log("Wallet 1 First Unspent Address", unspentAddress);

    const allUspentAddresses = await getUnspentAddresses(client, walletSeed, 0);
    console.log("Wallet 1 Unspent Addresses", allUspentAddresses);
    });
  });
});

function genesisWalletAddressHex(genesisWalletAddressHex: any) {
  throw new Error("Function not implemented.");
}


function walletSeed(client: SingleNodeClient, walletSeed: any, arg2: number) {
  throw new Error("Function not implemented.");
}
