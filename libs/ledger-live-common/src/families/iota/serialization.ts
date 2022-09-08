import { BigNumber } from "bignumber.js";
import type { IotaResourcesRaw, IotaResources } from "./types";
export function toIotaResourcesRaw(
  r: IotaResources
): IotaResourcesRaw {
  const { rewards, nbAssets } = r;
  return {
    rewards: rewards.toString(),
    nbAssets,
  };
}
export function fromIotaResourcesRaw(
  r: IotaResourcesRaw
): IotaResources {
  const { rewards, nbAssets } = r;
  return {
    rewards: new BigNumber(rewards),
    nbAssets,
  };
}
