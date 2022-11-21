import { Account, Operation, SignedOperation } from "@ledgerhq/types-live";
import { SingleNodeClient } from "@iota/iota.js";
import { getUrl } from "./api";
/*
export default async function broadcast({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  account,
  signedOperation,
}: {
  account: Account;
  signedOperation: SignedOperation;
}): Promise<Operation> {
  const { signature, operation } = signedOperation;
  const API_ENDPOINT = getUrl(account.currency.id, "");
  const client = new SingleNodeClient(API_ENDPOINT);
  const messageId = await client.blockSubmit(operation.);
}*/
