import Iota from "./hw-app-iota";
import { log } from "@ledgerhq/logs";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (transport, { path, currency }) => {
  const iota = new Iota(transport);
  
  const r = await iota.getAddress(path, currency, { prefix: 'rms', display: false });
  return {
    path,
    address: r,
    publicKey: ""
  };
};

export default resolver;
