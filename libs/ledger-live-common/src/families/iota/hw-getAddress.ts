import Iota from "./hw-app-iota";
import { log } from "@ledgerhq/logs";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (transport, { path }) => {
  log("IOTA GET ADDRESS");
  const iota = new Iota(transport);

  const r = await iota.getAddress("44'/1'/0'/0'/0'", { prefix: 'iota' });
  log("Address retrieved: " + r);
  return {
    path,
    address: r,
    publicKey: ""
  };
};

export default resolver;
