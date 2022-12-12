import Iota from "./hw-app-iota";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (transport, { path, currency, verify }) => {
  const iota = new Iota(transport);

  const r = await iota.getAddress(path, currency, verify);
  return {
    path,
    address: r,
    publicKey: "",
  };
};

export default resolver;
