import Struct from 'struct';
import bippath from 'bip32-path';
import bech32 from 'bech32';
import { getErrorMessage } from './error';
import Transport from '@ledgerhq/hw-transport';
import { _0Xbtc } from '../../../data/icons/react';
import { log } from "@ledgerhq/logs";
import { u8 } from '@polkadot/types';

/**
 * Shimmer API
 * @module hw-app-shimmer
 */

const CLA = 0x7b;
const Commands = {
  INS_NO_OPERATION: 0x00,

  INS_GET_APP_CONFIG: 0x10,
  INS_SET_ACCOUNT: 0x11,

  INS_GET_DATA_BUFFER_STATE: 0x80,
  INS_WRITE_DATA_BLOCK: 0x81,
  INS_READ_DATA_BLOCK: 0x82,
  INS_CLEAR_DATA_BUFFER: 0x83,

  INS_SHOW_FLOW: 0x90,

  INS_PREPARE_SIGNING: 0xa0,
  INS_GEN_ADDRESS: 0xa1,
  INS_USER_CONFIRM_ESSENCE: 0xa3,
  INS_SIGN_SINGLE: 0xa4,

  INS_RESET: 0xff,
};
const TIMEOUT_CMD_NON_USER_INTERACTION = 10000;
const TIMEOUT_CMD_USER_INTERACTION = 150000;

const ED25519_PUBLIC_KEY_LENGTH = 32;
const ED25519_SIGNATURE_LENGTH = 64;

const Flows = {
  FlowMainMenu: 0,
  FlowGeneratingAddresses: 1,
  FlowGenericError: 2,
  FlowRejected: 3,
  FlowSignedSuccessfully: 4,
  FlowSigning: 5,
}

/**
 * Class for the interaction with the Ledger Shimmer application.
 *
 * @example
 * import Shimmer from "hw-app-shimmer";
 * const shimmer = new Shimmer(transport);
 */
class Shimmer {
  transport: Transport;
  constructor(transport) {
    transport.decorateAppAPIMethods(this, ['getAppVersion'], 'SMR_network');

    this.transport = transport;
  }

  /**
   * Retrieves version information about the installed application from the device.
   *
   * @returns {Promise<String>} Semantic Version string (i.e. MAJOR.MINOR.PATCH)
   **/
  async getAppVersion() {
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
   * @param {Boolean} [options.prefix='smr'] - Bech32 prefix
   * @returns {Promise<String>} Tryte-encoded address
   * @example
   * shimmer.getAddress(0, { prefix: 'rms' });
   **/
  async getAddress(path, options) {
    const pathArray = Shimmer._validatePath(path);

    const display = options.display || false;
    const prefix = options.prefix || 'smr';

    await this._setAccount(pathArray[2]);
    await this._generateAddress(pathArray[3], pathArray[4], 1, display);

    const addressData = await this._getData();
    return bech32.encode(prefix, bech32.toWords(addressData));
  }

  ///////// Private methods should not be called directly! /////////

  static _validatePath(path) {
    let pathArray;
    try {
      pathArray = bippath.fromString(path).toPathArray();
    } catch (e: any) {
      throw new Error('"path" invalid: ' + e.message);
    }

    if (!pathArray || pathArray.length != 5) {
      throw new Error('"path" invalid: ' + 'Invalid path length');
    }

    return pathArray;
  }

  async _setAccount(account) {
    const setAccountInStruct = new Struct().word32Ule('account');

    setAccountInStruct.allocate();
    setAccountInStruct.fields.account = account;

    await this._sendCommand(
      Commands.INS_SET_ACCOUNT,
      0,
      0,
      setAccountInStruct.buffer(),
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _getDataBufferState() {
    const response = await this._sendCommand(
      Commands.INS_GET_DATA_BUFFER_STATE,
      0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );

    const getDataBufferStateOutStruct = new Struct()
      .word16Ule('data_length')
      .word8('data_type')
      .word8('data_block_size')
      .word8('data_block_count');
    getDataBufferStateOutStruct.setBuffer(response);

    const fields = getDataBufferStateOutStruct.fields;
    return {
      data_length: fields.data_length,
      data_type: fields.data_type,
      data_block_size: fields.data_block_size,
      data_block_count: fields.data_block_count,
    };
  }

  async _readDataBlock(block, size) {
    const response = await this._sendCommand(
      Commands.INS_READ_DATA_BLOCK,
      block,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );

    const readDataBlockOutStruct = new Struct().array('data', size, 'word8');
    readDataBlockOutStruct.setBuffer(response);
    const fields = readDataBlockOutStruct.fields;

    const data = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      data[i] = fields.data[i];
    }
    return data;
  }

  async _writeDataBlock(blockNr, data) {
    await this._sendCommand(
      Commands.INS_PREPARE_SIGNING,
      blockNr,
      0,
      data,
      TIMEOUT_CMD_USER_INTERACTION
    );
  }

  async _getData() {
    const state = await this._getDataBufferState();

    const blocks = Math.ceil(state.data_length / state.data_block_size);
    const data = new Uint8Array(blocks * state.data_block_size);

    let offset = 0;
    for (let i = 0; i < blocks; i++) {
      const block = await this._readDataBlock(i, state.data_block_size);
      data.set(block, offset);
      offset += block.length;
    }
    return data.subarray(0, state.data_length);
  }

  async _showMainFlow() {
    await this._sendCommand(
      Commands.INS_SHOW_FLOW,
      Flows.FlowMainMenu,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showGeneratingAddressesFlow() {
    await this._sendCommand(
      Commands.INS_SHOW_FLOW,
      Flows.FlowGeneratingAddresses,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showGenericErrorFlow() {
    await this._sendCommand(
      Commands.INS_SHOW_FLOW,
      Flows.FlowGenericError,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showRejectedFlow() {
    await this._sendCommand(
      Commands.INS_SHOW_FLOW,
      Flows.FlowRejected,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showSignedSuccessfullyFlow() {
    await this._sendCommand(
      Commands.INS_SHOW_FLOW,
      Flows.FlowSignedSuccessfully,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _showSigningFlow() {
    await this._sendCommand(
      Commands.INS_SHOW_FLOW,
      Flows.FlowSigning,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _prepareSigning(ramainderIdx, bip32Idx, bip32Change, p2) {
    const prepareSigningInStruct = new Struct()
      .word32Ule('remainder_index')
      .word32Ule('remainder_bip32_index')
      .word32Ule('remainder_bip32_change');

      prepareSigningInStruct.allocate();
      prepareSigningInStruct.fields.bip32_index = ramainderIdx;
      prepareSigningInStruct.fields.remainder_bip32_index = bip32Idx;
      prepareSigningInStruct.fields.remainder_bip32_change = bip32Change;

    await this._sendCommand(
      Commands.INS_PREPARE_SIGNING,
      1,
      p2,
      prepareSigningInStruct.buffer(),
      TIMEOUT_CMD_USER_INTERACTION
    );
  }

  async _generateAddress(change, index, count, display = false) {
    const generateAddressInStruct = new Struct()
      .word32Ule('bip32_index')
      .word32Ule('bip32_change')
      .word32Ule('count');

    generateAddressInStruct.allocate();
    generateAddressInStruct.fields.bip32_index = index;
    generateAddressInStruct.fields.bip32_change = change;
    generateAddressInStruct.fields.count = count;

    await this._sendCommand(
      Commands.INS_GEN_ADDRESS,
      display ? 0x01 : 0x00,
      0,
      generateAddressInStruct.buffer(),
      TIMEOUT_CMD_USER_INTERACTION
    );
  }

  async _userConfirmEssence() {
    this._sendCommand(
      Commands.INS_USER_CONFIRM_ESSENCE,
      0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _signSingle(index) {
    const response = await this._sendCommand(
      Commands.INS_SIGN_SINGLE,
      index,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
    const signatureType = response.at(0);
    let data = new Struct();
    switch (signatureType) {
      case 0:
        data
          .word8('signature_type')
          .word8('unknown') // TODO: replace with correct block name
          .array('ed25519_public_key', ED25519_PUBLIC_KEY_LENGTH, 'word8')
          .array('ed25519_signature', ED25519_SIGNATURE_LENGTH, 'word8');
        break;
      case 1: 
        data
          .word8('signature_type')
          .array('data', 2, 'word8') // TODO: replace with correct block name
        break;
      default:
        throw new Error('packable error: ' + 'Invalid variant');
        // TODO: return the error
    }
    return data;
  }

  async _getAppConfig() {
    const response = await this._sendCommand(
      Commands.INS_GET_APP_CONFIG,
      0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );

    const getAppConfigOutStruct = new Struct()
      .word8('app_version_major')
      .word8('app_version_minor')
      .word8('app_version_patch')
      .word8('app_flags')
      .word8('device')
      .word8('debug');
    getAppConfigOutStruct.setBuffer(response);

    const fields = getAppConfigOutStruct.fields;
    return {
      app_version:
        fields.app_version_major +
        '.' +
        fields.app_version_minor +
        '.' +
        fields.app_version_patch,
      app_flags: fields.app_flags,
      device: fields.device,
      debug: fields.debug,
    };
  }

  async _reset(partial = false) {
    await this._sendCommand(
      Commands.INS_RESET,
      partial ? 1 : 0,
      0,
      undefined,
      TIMEOUT_CMD_NON_USER_INTERACTION
    );
  }

  async _sendCommand(ins, p1, p2, data, timeout) {
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

export default Shimmer;

export { TIMEOUT_CMD_NON_USER_INTERACTION, Commands }