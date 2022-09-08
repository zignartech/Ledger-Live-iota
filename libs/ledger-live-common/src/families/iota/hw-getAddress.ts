import Iota from "./hw-app-iota";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (transport, { path }) => {
  const iota = new Iota(transport);
  const r = await iota.getAddress(path);
  return {
    path,
    address: r.address,
    publicKey: r.publicKey,
  };
};

export default resolver;
