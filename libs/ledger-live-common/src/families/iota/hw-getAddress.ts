import Iota from "@ledgerhq/hw-app-iota";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (transport, { path, verify }) => {
  const iota = new Iota(transport);
  const r = await iota.getAddress(path, verify || false);
  return {
    address: r.address,
    publicKey: r.publicKey,
    path,
  };
};

export default resolver;
