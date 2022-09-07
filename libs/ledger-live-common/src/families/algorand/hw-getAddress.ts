import Algorand from "@ledgerhq/hw-app-algorand";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (transport, { path, verify }) => {
  const algorand = new Algorand(transport);
  const r = await algorand.getAddress(path, verify || false);
  return {
    address: r.address,
    publicKey: r.publicKey,
    path,
  };
};

export default resolver;
