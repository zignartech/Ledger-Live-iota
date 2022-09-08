import Prando from "prando";
import { BigNumber } from "bignumber.js";
import { genHex, genAddress } from "../../mock/helpers";
import { IotaAccount } from "./types";
import { Account, Operation, OperationType } from "@ledgerhq/types-live";

function setIotaResources(account: IotaAccount): IotaAccount {
  /** format iotaResources given the new delegations */
  account.iotaResources = {
    rewards: account.balance.multipliedBy(0.01),
    nbAssets: account.subAccounts?.length ?? 0,
  };
  return account;
}

function genBaseOperation(
  account: IotaAccount,
  rng: Prando,
  type: OperationType,
  index: number
): Operation {
  const { operations: ops } = account;
  const address = genAddress(account.currency, rng);
  const lastOp = ops[index];
  const date = new Date(
    (lastOp ? lastOp.date.valueOf() : Date.now()) -
      rng.nextInt(0, 100000000 * rng.next() * rng.next())
  );
  const hash = genHex(64, rng);

  /** generate given operation */
  return {
    id: String(`mock_op_${ops.length}_${type}_${account.id}`),
    hash,
    type,
    value: new BigNumber(0),
    fee: new BigNumber(0),
    senders: [address],
    recipients: [address],
    blockHash: genHex(64, rng),
    blockHeight:
      account.blockHeight -
      // FIXME: always the same, valueOf for arithmetics operation on date in typescript
      Math.floor((Date.now().valueOf() - date.valueOf()) / 900000),
    accountId: account.id,
    date,
    extra: {
      rewards: new BigNumber(0),
      memo: "memo",
    },
  };
}

function addOptIn(account: IotaAccount, rng: Prando): Account {
  /** select position on the operation stack where we will insert the new claim rewards */
  const opIndex = rng.next(0, 10);
  const opt = genBaseOperation(account, rng, "OPT_IN", opIndex);
  opt.extra = { ...opt.extra, rewards: new BigNumber(0), assetId: "Thether" };
  account.operations.splice(opIndex, 0, opt);
  account.operationsCount++;
  return account;
}

function addOptOut(account: IotaAccount, rng: Prando): Account {
  /** select position on the operation stack where we will insert the new claim rewards */
  const opIndex = rng.next(0, 10);
  const opt = genBaseOperation(account, rng, "OPT_OUT", opIndex);
  opt.extra = { ...opt.extra, rewards: new BigNumber(0), assetId: "Thether" };
  account.operations.splice(opIndex, 0, opt);
  account.operationsCount++;
  return account;
}

/**
 * add in specific Iota operations
 * @memberof iota/mock
 * @param {Account} account
 * @param {Prando} rng
 */
function genAccountEnhanceOperations(
  account: IotaAccount,
  rng: Prando
): Account {
  addOptIn(account, rng);
  addOptOut(account, rng);
  setIotaResources(account);
  return account;
}

/**
 * Update spendable balance for the account based on delegation data
 * @memberof iota/mock
 * @param {Account} account
 */
function postSyncAccount(account: IotaAccount): Account {
  const iotaResources = account.iotaResources || { rewards: undefined };
  const rewards = iotaResources.rewards || new BigNumber(0);
  account.spendableBalance = account.balance.plus(rewards);
  return account;
}

/**
 * post account scan data logic
 * clears account Iota resources if supposed to be empty
 * @memberof iota/mock
 * @param {IotaAccount} account
 */
function postScanAccount(
  account: IotaAccount,
  {
    isEmpty,
  }: {
    isEmpty: boolean;
  }
): Account {
  if (isEmpty) {
    account.iotaResources = {
      rewards: new BigNumber(0),
      nbAssets: account.subAccounts?.length ?? 0,
    };
    account.operations = [];
    account.subAccounts = [];
  }

  return account;
}

export default {
  genAccountEnhanceOperations,
  postSyncAccount,
  postScanAccount,
};
