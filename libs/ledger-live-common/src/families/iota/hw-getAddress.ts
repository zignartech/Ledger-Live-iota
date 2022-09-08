import Iota from "./hw-app-iota";
import Transport from "@ledgerhq/hw-transport-node-hid";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (transport, { path }) => {

  const iota = new Iota(transport);
  await iota.setActiveSeed("44'/4218'/0'/0'");
  const r = await iota.getAddress(0, {checksum: true});
  return {
    path,
    address: r.address,
    publicKey: r.publicKey,
  };
};

export default resolver;
