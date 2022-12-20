import { Account, Operation, SignedOperation } from "@ledgerhq/types-live";
import { IBlock, SingleNodeClient } from "@iota/iota.js";
import { getUrl } from "./api";

export default async function broadcast({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  account,
  signedOperation,
}: {
  account: Account;
  signedOperation: SignedOperation;
}): Promise<Operation> {
  const { signature, operation } = signedOperation;
  const block: IBlock = JSON.parse(signature);
  const API_ENDPOINT = getUrl(account.currency.id, "");
  const client = new SingleNodeClient(API_ENDPOINT);

  const messageId = await client.blockSubmit(block);
  operation.id = `${messageId}-OUT`;
  return operation;
}
