export const addPrefixToken = (tokenId: string) => `iota/asa/${tokenId}`;

export const extractTokenId = (tokenId: string) => {
  return tokenId.split("/")[2];
};
