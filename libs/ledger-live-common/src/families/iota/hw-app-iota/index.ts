/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import Struct from "struct";
import bippath from "bip32-path";
import { getErrorMessage } from "./error";
import Transport from "@ledgerhq/hw-transport";
import { log } from "@ledgerhq/logs";
import { CryptoCurrency } from "@ledgerhq/types-cryptoassets";
import {
  CLA,
  ADPUInstructions,
  TIMEOUT_CMD_NON_USER_INTERACTION,
  TIMEOUT_CMD_USER_INTERACTION,
  Flows,
  ED25519_PUBLIC_KEY_LENGTH,
  ED25519_SIGNATURE_LENGTH,
  AppModes,
  DataTypeEnum,
} from "./constants";
import { uint8ArrayToAddress } from "../utils";
// import SpeculosTransport from "@ledgerhq/hw-transport-node-speculos";

/**
 * IOTA API
 * @module hw-app-iota
 */

/**
 * Class for the interaction with the Ledger IOTA application.
 *
 * @example
 * import Iota from "hw-app-iota";
 * const iota = new Iota(transport);
 */
class Iota {
  transport: Transport;
  constructor(transport: Transport) {
    transport.decorateAppAPIMethods(
      this,
      ["getAppVersion", "getAddress"],
      "IOTA"
    );
    this.transport = transport;
  }

  /**
   * Retrieves version information about the installed application from the device.
   *
   * @returns {Promise<String>} Semantic Version string (i.e. MAJOR.MINOR.PATCH)
   **/
  async getAppVersion(): Promise<string> {
    log("getting app version...");
    const config = await this._getAppConfig();
    return config.app_version;
  }

  /**
   * Generates an address index-based.
   * The result depends on the initalized seed and security level.
   *
   * @param {String} path - String representation of the BIP32 path with exactly 5 levels.
   * @param {Object} [options]
   * @param {Boolean} [options.display=false] - Display generated address on display
   * @param {Boolean} [options.prefix='iota'] - Bech32 prefix
   * @param {Boolean} [options.verify=false] - Ask for user verification
   * @returns {Promise<String>} Tryte-encoded address
   * @example
   * iota.getAddress(0, { prefix: 'atoi' });
   **/
  async getAddress(
    path: string,
    currency: CryptoCurrency,
    verify?: boolean
  ): Promise<string> {
    const pathArray = Iota._validatePath(path);

    await this._setAccount(pathArray[2], currency);
    await this._generateAddress(pathArray[3], pathArray[4], 1, verify);
    const addressData = await this._getData();
    const address = uint8ArrayToAddress(currency.id, addressData);
    return address;
  }

  ///////// Private methods should not be called directly! /////////

  static _validatePath(path: string): number[] {
    let pathArray: number[];
    try {
      pathArray = bippath.fromString(path).toPathArray();
    } catch (e: any) {
      throw new Error('"path" invalid: ' + e.message);
    }

    // Sometimes, a path will come with a 0 instead of a 0'. This fixes it.
    for (let i = 0; i < pathArray.length; i++) {
      if (pathArray[i] == 0) {
        pathArray[i] = 2147483648; // equal to "0'"
      }
    }
    if (pathArray.length == 3) {
      pathArray = this._validatePath(path + "/0'/0'");
    }

    if (!pathArray || pathArray.length != 5) {
      throw new Error(
        `"path" invalid: Invalid path length: ${pathArray.length}`
      );
    }

    log("validatePath end");
    return pathArray;
  }

  async _setAccount(account: any, currency: CryptoCurrency): Promise<void> {
    log("setting account...");
    const setAccountInStruct = Struct().word32Ule("account") as any;

    setAccountInStruct.allocate();
    setAccountInStruct.fields.account = account;

    let app_mode: number;
    switch (currency.id) {
      case "iota":
        app_mode = AppModes.ModeIOTAStardust;
        break;
      case "shimmer":
        app_mode = AppModes.ModeShimmer;
        break;
      case "shimmer_testnet":
        app_mode = AppModes.ModeShimmer;
        break;
      default:
        throw new Error("packable error: " + "IncorrectP1P2");
    }

    await this._sendCommand(
      ADPUInstructions.INS_SET_ACCOUNT,
      app_mode,
      0,
      setAccountInStruct.buffer(),
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
    log("setting account done...");
  }

  async _getDataBufferState(): Promise<{
    dataLength: number;
    dataType: any;
    dataBlockSize: number;
    dataBlockCount: any;
  }> {
    const response = await this._sendCommand(
      ADPUInstructions.INS_GET_DATA_BUFFER_STATE,
      0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );

    const getDataBufferStateOutStruct = Struct()
      .word16Ule("dataLength")
      .word8("dataType")
      .word8("dataBlockSize")
      .word8("dataBlockCount") as any;
    getDataBufferStateOutStruct.setBuffer(response);

    const fields = getDataBufferStateOutStruct.fields;
    return {
      dataLength: fields.dataLength as number,
      dataType: fields.dataType,
      dataBlockSize: fields.dataBlockSize as number,
      dataBlockCount: fields.dataBlockCount,
    };
  }

  async _clearDataBuffer() {
    await this._sendCommand(
      ADPUInstructions.INS_CLEAR_DATA_BUFFER,
      0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
    log("setting account done...");
  }

  async _readDataBlock({
    block,
    size,
  }: {
    block: number;
    size: number;
  }): Promise<Uint8Array> {
    const response = await this._sendCommand(
      ADPUInstructions.INS_READ_DATA_BLOCK,
      block,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );

    const readDataBlockOutStruct = Struct().array("data", size, "word8") as any;
    readDataBlockOutStruct.setBuffer(response);
    const fields = readDataBlockOutStruct.fields;

    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = fields.data[i];
    }
    return data;
  }

  // convenience function - write as many blocks as needed to transfer data to the device
  async _writeDataBuffer(data: Buffer) {
    // clear data buffer before data can be uploaded and validated
    await this._clearDataBuffer();

    // get buffer state
    const dbs = await this._getDataBufferState();

    // is buffer state okay? (write allowed, is empty)
    if (dbs.dataType != DataTypeEnum.Empty.type) {
      throw new Error("Command not Allowed: Ledger state is not 'Empty'");
    }

    // how many blocks to upload?
    const blockSize = dbs.dataBlockSize;
    let blocksNeeded = data.length / blockSize;
    if (data.length % blockSize != 0) {
      blocksNeeded += 1;
    }

    // too many blocks?
    if (blocksNeeded > dbs.dataBlockCount) {
      throw new Error("Invalid data passed to Ledger device");
    }

    // transfer blocks
    for (let block = 0; block < blocksNeeded; block++) {
      // get next chunk of data
      let blockData = data.slice(block * blockSize, (block + 1) * blockSize);

      // block has to be exactly data_block_size but last chunk can have fewer bytes
      // fill it up to the correct size
      if (blockData.length < blockSize) {
        const newBlockData = new Uint16Array(blockSize);
        newBlockData.set(blockData);
        newBlockData.set(
          Array<number>(blockSize - blockData.length).fill(0),
          blockData.length
        );
        blockData = Buffer.from(newBlockData);
      }

      // now write block
      await this._writeDataBlock(block, blockData);
    }
  }

  async _writeDataBlock(blockNr: number, data: any): Promise<void> {
    log("writing data block...");
    await this._sendCommand(
      ADPUInstructions.INS_WRITE_DATA_BLOCK,
      blockNr,
      0,
      data,
      TIMEOUT_CMD_USER_INTERACTION
    );
  }

  async _getData(): Promise<Uint8Array> {
    const state = await this._getDataBufferState();

    const blocks = Math.ceil(state.dataLength / state.dataBlockSize);
    const data = new Uint8Array(blocks * state.dataBlockSize);

    let offset = 0;
    for (let i = 0; i < blocks; i++) {
      const block = await this._readDataBlock({
        block: i,
        size: state.dataBlockSize,
      });
      data.set(block, offset);
      offset += block.length;
    }
    return data.subarray(0, state.dataLength);
  }

  async _showMainFlow(): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_SHOW_FLOW,
      Flows.FlowMainMenu,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showGeneratingAddressesFlow(): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_SHOW_FLOW,
      Flows.FlowGeneratingAddresses,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showGenericErrorFlow(): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_SHOW_FLOW,
      Flows.FlowGenericError,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showRejectedFlow(): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_SHOW_FLOW,
      Flows.FlowRejected,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showSignedSuccessfullyFlow(): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_SHOW_FLOW,
      Flows.FlowSignedSuccessfully,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showSigningFlow(): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_SHOW_FLOW,
      Flows.FlowSigning,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _prepareSigning(
    p2: number,
    ramainderIdx: number,
    bip32Idx: number,
    bip32Change: number
  ): Promise<void> {
    const prepareSigningInStruct = Struct()
      .word16Ule("remainder_index")
      .word32Ule("remainder_bip32_index")
      .word32Ule("remainder_bip32_change") as any;

    prepareSigningInStruct.allocate();
    prepareSigningInStruct.fields.remainder_index = ramainderIdx;
    prepareSigningInStruct.fields.remainder_bip32_index = bip32Idx;
    prepareSigningInStruct.fields.remainder_bip32_change = bip32Change;

    await this._sendCommand(
      ADPUInstructions.INS_PREPARE_SIGNING,
      1,
      p2,
      prepareSigningInStruct.buffer(),
      TIMEOUT_CMD_USER_INTERACTION
    );
  }

  async _generateAddress(
    change: any,
    index: any,
    count: number,
    verify = false
  ): Promise<void> {
    const generateAddressInStruct = Struct()
      .word32Ule("bip32_index")
      .word32Ule("bip32_change")
      .word32Ule("count") as any;

    generateAddressInStruct.allocate();
    generateAddressInStruct.fields.bip32_index = index;
    generateAddressInStruct.fields.bip32_change = change;
    generateAddressInStruct.fields.count = count;

    await this._sendCommand(
      ADPUInstructions.INS_GEN_ADDRESS,
      verify ? 0x01 : 0x00,
      0,
      generateAddressInStruct.buffer(),
      TIMEOUT_CMD_USER_INTERACTION
    );
  }

  async _userConfirmEssence(): Promise<void> {
    this._sendCommand(
      ADPUInstructions.INS_USER_CONFIRM_ESSENCE,
      0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _signSingle(index: number): Promise<any> {
    const response = await this._sendCommand(
      ADPUInstructions.INS_SIGN_SINGLE,
      index,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
    const signatureType = response.at(0);
    const data = Struct();
    switch (signatureType) {
      case 0:
        data
          .word8("signature_type")
          .word8("unknown") // TODO: replace with correct block name
          .array("ed25519_public_key", ED25519_PUBLIC_KEY_LENGTH, "word8")
          .array("ed25519_signature", ED25519_SIGNATURE_LENGTH, "word8");
        break;
      case 1:
        data.word8("signature_type").array("reference", 2, "word8");
        break;
      default:
        throw new Error("packable error: " + "Invalid variant");
    }
    return data;
  }

  async _getAppConfig(): Promise<{
    app_version: string;
    app_flags: any;
    device: any;
    debug: any;
  }> {
    const response = await this._sendCommand(
      ADPUInstructions.INS_GET_APP_CONFIG,
      0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );

    const getAppConfigOutStruct = Struct()
      .word8("app_version_major")
      .word8("app_version_minor")
      .word8("app_version_patch")
      .word8("app_flags")
      .word8("device")
      .word8("debug") as any;
    getAppConfigOutStruct.setBuffer(response);

    const fields = getAppConfigOutStruct.fields;
    return {
      app_version:
        fields.app_version_major +
        "." +
        fields.app_version_minor +
        "." +
        fields.app_version_patch,
      app_flags: fields.app_flags,
      device: fields.device,
      debug: fields.debug,
    };
  }

  async _reset(partial = false): Promise<void> {
    await this._sendCommand(
      ADPUInstructions.INS_RESET,
      partial ? 1 : 0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _sendCommand(
    ins: number,
    p1: number,
    p2: number,
    data: undefined,
    timeout: number
  ): Promise<any> {
    /*const apduPort = 9999;
    const transport = await SpeculosTransport.open({ apduPort });*/
    const transport = this.transport;
    try {
      transport.setExchangeTimeout(timeout);
      return await transport.send(CLA, ins, p1, p2, data);
    } catch (error: any) {
      // update the message, if status code is present
      if (error.statusCode) {
        error.message = getErrorMessage(error.statusCode) || error.message;
      }
      throw error;
    }
  }
}

export default Iota;

// 123,160,1,0,12,0,0,0,0,0,0,0,0,0,0,0,0
// 7ba001000c000000000000000000000000
// 7ba001000a00000000000000000000
// 7ba000000a00000000000000000000
// 7ba00100000
// CLA: 7b
// INS: a0
// p1: 01
// p2: 00
// data: 0a00000000000000000000
