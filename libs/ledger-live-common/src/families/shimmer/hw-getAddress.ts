import Shimmer from "./hw-app-shimmer";
import { log } from "@ledgerhq/logs";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (transport, { path }) => {
  const shimmer = new Shimmer(transport);

  const r = await shimmer.getAddress(path, { prefix: 'rms' });
  return {
    path,
    address: r,
    publicKey: ""
  };
};

export default resolver;
