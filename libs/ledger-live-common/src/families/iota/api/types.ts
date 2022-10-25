/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/**
 * The error format.
 */
 export interface ErrorResponse {
  error: { code: string; message: string };
}

/**
 * Indicates that this endpoint is not available for public use.
 * @example {"error":{"code":403,"message":"not available for public use"}}
 */
export type ForbiddenResponse = ErrorResponse;

/**
 * Indicates that the service is unavailable.
 * @example {"error":{"code":503,"message":"service unavailable"}}
 */
export type ServiceUnavailableResponse = ErrorResponse;

/**
 * Indicates that the request was bad.
 * @example {"error":{"code":400,"message":"invalid data provided"}}
 */
export type BadRequestResponse = ErrorResponse;

/**
 * Indicates that the data was not found.
 * @example {"error":{"code":404,"message":"could not find data"}}
 */
export type NotFoundResponse = ErrorResponse;

/**
 * Indicates that the server encountered an unexpected condition, which prevented it from fulfilling the request by the client.
 * @example {"error":{"code":500,"message":"internal server error"}}
 */
export type InternalErrorResponse = ErrorResponse;

/**
 * Returns a list of OutputIds.
 */
export interface OutputsResponse {
  /** The current ledger index for which the request was made. */
  ledgerIndex: number;

  /** The cursor to use for getting the next page of results. */
  cursor?: string | null;

  /** The output IDs (transaction hash + output index) of the outputs satisfying the query. Hex-encoded with 0x prefix. */
  items: string[];
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (securityData: SecurityDataType | null) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
}

/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/**
 * A block is the object nodes gossip around in the network. It always references two other blocks that are known as parents. It is stored as a vertex on the tangle data structure that the nodes maintain. A block can have a maximum size of 32Kb.
 */
 export interface Block {
  /** Protocol version identifier. It also tells which protocol rules apply to the block. */
  protocolVersion: number;

  /** The identifiers of the blocks this block references. Hex-encoded data with 0x prefix. */
  parents: string[];

  /** The inner payload of the block. Can be nil. */
  payload?: TransactionPayload | MilestonePayload | TaggedDataPayload | ReceiptPayload;

  /** The nonce which lets this block fulfill the Proof-of-Work requirement. Plain string encoded number. */
  nonce: string;
}

/**
 * The Transaction Payload to be embedded into a block.
 */
export interface TransactionPayload {
  /** Set to value 6 to denote a Transaction Payload. */
  type: number;
  essence: TransactionEssence;
  unlocks: (SignatureUnlock | ReferenceUnlock | AliasUnlock | NFTUnlock)[];
}

/**
 * Describes the essence data making up a transaction by defining its inputs and outputs and an optional payload.
 */
export interface TransactionEssence {
  /** Set to value 1 to denote a Transaction Essence. */
  type: number;

  /** Network identifier. Plain string encoded number. This field signals for which network the block is meant for. It is computed out of the first 8 bytes of the `BLAKE2b-256` hash of the concatenation of the network name and protocol version string. */
  networkId: string;

  /** BLAKE2b-256 hash of the BLAKE2b-256 hashes of the serialized outputs referenced in Inputs by their outputIds (transactionId || outputIndex). Hex-encoded data with 0x prefix. */
  inputsCommitment: string;

  /** The inputs of this transaction. */
  inputs: UTXOInput[];

  /** The outputs of this transaction. */
  outputs: (
    | BasicOutput
    | AliasOutput
    | FoundryOutput
    | NFTOutput
    | (BasicOutput & AliasOutput & FoundryOutput & NFTOutput)
  )[];

  /** The optional embedded payload. */
  payload?: TaggedDataPayload;
}

/**
 * Describes an input which references an unspent transaction output to consume.
 */
export interface UTXOInput {
  /** Set to value 0 to denote an UTXO Input. */
  type: number;

  /** The BLAKE2b-256 hash of the transaction from which the UTXO comes from. Hex-encoded data with 0x prefix. */
  transactionId: string;

  /** The index of the output on the referenced transaction to consume. */
  transactionOutputIndex: number;
}

/**
 * Describes a basic output with optional features.
 */
export interface BasicOutput {
  /** Set to value 3 to denote a Basic Output. */
  type: number;

  /** The amount of IOTA tokens to deposit with this BasicOutput output. Plain string encoded number. */
  amount: string;

  /** Native tokens held by the otuput. */
  nativeTokens?: NativeToken[];

  /** Unlock condtions that define how the output an be unlocked in a transaction. */
  unlockConditions: (
    | AddressUnlockCondition
    | StorageDepositReturnUnlockCondition
    | TimelockUnlockCondition
    | ExpirationUnlockCondition
    | (AddressUnlockCondition &
        StorageDepositReturnUnlockCondition &
        TimelockUnlockCondition &
        ExpirationUnlockCondition)
  )[];

  /** Features that add utility to the output but do not impose unlocking conditions. */
  features?: (SenderFeature | MetadataFeature | TagFeature | (SenderFeature & MetadataFeature & TagFeature))[];
}

/**
 * Describes an alias account in the ledger that can be controlled by the state and governance controllers.
 */
export interface AliasOutput {
  /** Set to value 4 to denote an Alias Output. */
  type: number;

  /** The amount of IOTA tokens to deposit with this output. Plain string encoded number. */
  amount: string;

  /** Native tokens held by the otuput. */
  nativeTokens?: NativeToken[];

  /** Unique identifier of the alias, which is the BLAKE2b-256 hash of the Output ID that created it. Alias Address = Alias Address Type || Alias ID. Hex-encoded data with 0x prefix. */
  aliasId: string;

  /** A counter that must increase by 1 every time the alias is state transitioned. */
  stateIndex: number;

  /** Hex-encoded metadata with 0x prefix that can only be changed by the state controller. */
  stateMetadata?: string;

  /** A counter that denotes the number of foundries created by this alias account. */
  foundryCounter: number;

  /** Unlock condtions that define how the output an be unlocked in a transaction. */
  unlockConditions: (
    | StateControllerAddressUnlockCondition
    | GovernorAddressUnlockCondition
    | (StateControllerAddressUnlockCondition & GovernorAddressUnlockCondition)
  )[];

  /** Features that add utility to the output but do not impose unlocking conditions. */
  features?: (SenderFeature | MetadataFeature | (SenderFeature & MetadataFeature))[];

  /** Immutable features that add utility to the output but do not impose unlocking conditions. These features need to be kept in future transitions of the UTXO state machine. */
  immutableFeatures?: (IssuerFeature | MetadataFeature | (IssuerFeature & MetadataFeature))[];
}

/**
 * Describes a foundry output that is controlled by an alias.
 */
export interface FoundryOutput {
  /** Set to value5 to denote a Foundry Output. */
  type: number;

  /** The amount of IOTA tokens to deposit with this output. Plain string encoded number. */
  amount: string;

  /** Native tokens held by the otuput. */
  nativeTokens?: NativeToken[];

  /** The serial number of the foundry with respect to the controlling alias. */
  serialNumber: number;

  /** Defines the supply control scheme of the tokens controlled by the foundry. */
  tokenScheme: SimpleTokenScheme[];

  /** Unlock condtions that define how the output an be unlocked in a transaction. */
  unlockConditions: ImmutableAliasAddressUnlockCondition[];

  /** Features that add utility to the output but do not impose unlocking conditions. */
  features?: MetadataFeature[];

  /** Immutable features that add utility to the output but do not impose unlocking conditions. These features need to be kept in future transitions of the UTXO state machine. */
  immutableFeatures?: MetadataFeature[];
}

/**
 * escribes an NFT output, a globally unique token with metadata attached.
 */
export interface NFTOutput {
  /** Set to value 6 to denote a NFT Output. */
  type: number;

  /** The amount of IOTA tokens to deposit with this output. Plain string encoded number. */
  amount: string;

  /** Native tokens held by the otuput. */
  nativeTokens?: NativeToken[];

  /** Unique identifier of the NFT, which is the BLAKE2b-256 hash of the Output ID that created it. NFT Address = NFT Address Type || NFT ID. Hex-encoded data with 0x prefix. */
  nftId: string;

  /** Unlock condtions that define how the output an be unlocked in a transaction. */
  unlockConditions: (
    | AddressUnlockCondition
    | StorageDepositReturnUnlockCondition
    | TimelockUnlockCondition
    | ExpirationUnlockCondition
    | (AddressUnlockCondition &
        StorageDepositReturnUnlockCondition &
        TimelockUnlockCondition &
        ExpirationUnlockCondition)
  )[];

  /** Features that add utility to the output but do not impose unlocking conditions. */
  features?: (
    | SenderFeature
    | IssuerFeature
    | MetadataFeature
    | TagFeature
    | (SenderFeature & IssuerFeature & MetadataFeature & TagFeature)
  )[];

  /** Immutable features that add utility to the output but do not impose unlocking conditions. These features need to be kept in future transitions of the UTXO state machine. */
  immutableFeatures?: (IssuerFeature | MetadataFeature | (IssuerFeature & MetadataFeature))[];
}

/**
 * A native token and its balance in the output.
 */
export interface NativeToken {
  /** Hex-encoded identifier with 0x prefix of the native token. Same as foundryId of the controlling foundry. */
  tokenId: string;

  /** Amount of native tokens (up to uint256). Hex-encoded number with 0x prefix. */
  amount: string;
}

/**
 * The Ed25519 address.
 */
export interface Ed25519Address {
  /** Set to value 0 to denote an Ed25519 Address. */
  type: number;

  /** The hex-encoded, 0x prefixed BLAKE2b-256 hash of the Ed25519 public key */
  pubKeyHash: string;
}

/**
 * Address of an alias account.
 */
export interface AliasAddress {
  /** Set to value 8 to denote an Alias Address. */
  type: number;

  /** The hex-encoded, 0x prefixed BLAKE2b-256 hash of the outputId that created the alias. */
  aliasId: string;
}

/**
 * Address of an NFT account.
 */
export interface NFTAddress {
  /** Set to value 16 to denote an NFT Address. */
  type: number;

  /** The hex-encoded, 0x prefixed BLAKE2b-256 hash of the outputId that created the NFT. */
  nftId: string;
}

/**
 * Can be unlocked by unlocking the address.
 */
export interface AddressUnlockCondition {
  /** Set to value 0 to denote an Address Unlock Condition. */
  type: number;
  address: Ed25519Address | AliasAddress | NFTAddress;
}

/**
 * Can be unlocked by unlocking the permanent alias address. The unlock condition has to be kept in future state transitions of the UTXO state machine.
 */
export interface ImmutableAliasAddressUnlockCondition {
  /** Set to value 6 to denote an Immutable Alias Address Unlock Condition. */
  type: number;
  address: AliasAddress;
}

/**
 * Can be unlocked by depositing return amount to return address via an output that only has Address Unlock Condition.
 */
export interface StorageDepositReturnUnlockCondition {
  /** Set to value 1 to denote an Dust Deposit Return Unlock Condition. */
  type: number;
  returnAddress: Ed25519Address | AliasAddress | NFTAddress;

  /** Amount of IOTA tokens the consuming transaction should deposit to the address defined in Return Address. Plain string encoded number. */
  returnAmount: string;
}

/**
 * Can be unlocked if the confirming milestone has a >= Unix Timestamp.
 */
export interface TimelockUnlockCondition {
  /** Set to value 2 to denote an Timelock Unlock Condition. */
  type: number;

  /**
   * Unix time (seconds since Unix epoch) starting from which the output can be consumed.
   * @min 0
   */
  unixTime: number;
}

/**
 * Defines a unix time until which only Address, defined in Address Unlock Condition, is allowed to unlock the output. After the unix time, only Return Address can unlock it.
 */
export interface ExpirationUnlockCondition {
  /** Set to value 3 to denote an Expiration Unlock Condition. */
  type: number;
  returnAddress: Ed25519Address | AliasAddress | NFTAddress;

  /**
   * Before this unix time, Address Unlock Condition is allowed to unlock the output, after that only the address defined in Return Address.
   * @min 0
   */
  unixTime: number;
}

/**
 * Can be unlocked by unlocking the address.
 */
export interface StateControllerAddressUnlockCondition {
  /** Set to value 4 to denote an  Sate Controller Address Unlock Condition. */
  type: number;
  address: Ed25519Address | AliasAddress | NFTAddress;
}

/**
 * Can be unlocked by unlocking the address.
 */
export interface GovernorAddressUnlockCondition {
  /** Set to value 5 to denote an  Governor Address Unlock Condition. */
  type: number;
  address: Ed25519Address | AliasAddress | NFTAddress;
}

/**
 * Identifies the validated sender of the output.
 */
export interface SenderFeature {
  /** Set to value 0 to denote a Sender Feature. */
  type: number;
  sender: Ed25519Address | AliasAddress | NFTAddress;
}

/**
 * Identifies the validated issuer of the UTXO state machine (alias/NFT).
 */
export interface IssuerFeature {
  /** Set to value 1 to denote an Issuer Feature. */
  type: number;
  issuer: Ed25519Address | AliasAddress | NFTAddress;
}

/**
 * Defines metadata (arbitrary binary data) that will be stored in the output.
 */
export interface MetadataFeature {
  /** Set to value 2 to denote a Metadata Feature. */
  type: number;

  /** Hex-encoded binary data with 0x prefix. */
  data: string;
}

/**
 * Defines an indexation tag to which the output can be indexed by additional node plugins.
 */
export interface TagFeature {
  /** Set to value 3 to denote a Tag Feature. */
  type: number;

  /** Hex-encoded binary indexation tag with 0x prefix. */
  tag: string;
}

/**
 * Defines the simple supply control scheme of native tokens. Tokens can be minted by the foundry without additional restrictions as long as maximum supply is requested and circulating supply is not negative.
 */
export interface SimpleTokenScheme {
  /** Set to value 0 to denote an Simple Token Scheme. */
  type: number;

  /** Minted tokens controlled by this foundry. Hex-encoded number with 0x prefix. */
  mintedTokens: string;

  /** Melted tokens controlled by this foundry. Hex-encoded number with 0x prefix. */
  meltedTokens: string;

  /** Maximum supply of tokens controlled by this foundry. Hex-encoded number with 0x prefix. */
  maxSupply: string;
}

/**
 * Defines an unlock containing signature(s) unlocking input(s).
 */
export interface SignatureUnlock {
  /** Denotes a Signature Unlock. */
  type: number;
  signature: Ed25519Signature;
}

/**
 * The Ed25519 signature.
 */
export interface Ed25519Signature {
  /** Set to value 0 to denote an Ed25519 Signature. */
  type: number;

  /** The public key of the Ed25519 keypair which is used to verify the signature. Hex-encoded with 0x prefix. */
  publicKey: string;

  /** The signature signing the serialized Transaction Essence. Hex-encoded with 0x prefix. */
  signature: string;
}

/**
 * References a previous unlock in order to substitute the duplication of the same unlock data for inputs which unlock through the same data.
 */
export interface ReferenceUnlock {
  /** Set to value 1 to denote a Reference Unlock. */
  type: number;

  /** Represents the index of a previous unlock. */
  reference: number;
}

/**
 * References a previous unlock that unlocks an Alias Output.
 */
export interface AliasUnlock {
  /** Set to value 2 to denote an Alias Unlock. */
  type: number;

  /** Represents the index of a previous unlock. */
  reference: number;
}

/**
 * References a previous unlock that unlocks an NFT Output.
 */
export interface NFTUnlock {
  /** Set to value 3 to denote an NFT Unlock. */
  type: number;

  /** Represents the index of a previous unlock. */
  reference: number;
}

/**
 * The Milestone Payload to be embedded into a block.
 */
export interface MilestonePayload {
  /** Set to value 7 to denote a Milestone Payload. */
  type: number;

  /** The index of the milestone. */
  index: number;

  /** The Unix timestamp at which the milestone was issued. The unix timestamp is specified in seconds. */
  timestamp: number;

  /** Protocol version of the Milestone Payload and its encapsulating block. */
  protocolVersion: number;

  /** The Milestone ID of the milestone with Index Number - 1. */
  previousMilestoneId: string;

  /** The identifiers of the blocks this milestone references. Hex-encoded values with 0x prefix. */
  parents: string[];

  /** The merkle root of all directly/indirectly referenced blocks (their IDs) which are newly confirmed by this milestone. Hex-encoded with 0x prefix. */
  inclusionMerkleRoot: string;

  /** The merkle root of all blocks (their IDs) carrying ledger state mutating transactions. Hex-encoded with 0x prefix. */
  appliedMerkleRoot: string;
  options?: (ReceiptPayload | ProtocolParamsMilestoneOpt | (ReceiptPayload & ProtocolParamsMilestoneOpt))[];

  /** Hex-encoded binary data with 0x prefix. */
  metadata?: string;

  /** An array of signatures signing the serialized Milestone Essence. Hex-encoded with 0x prefix. */
  signatures: Ed25519Signature[];
}

/**
 * The Tagged Data Payload to be embedded into a block.
 */
export interface TaggedDataPayload {
  /** Set to value 5 to denote a Tagged Data Payload. */
  type: number;

  /** The tag to allow external tools to find/look up this block. It has a size between 0 and 64 bytes and must be encoded as a hex-string with 0x prefix. Network nodes do not index blocks with Tagged Data Payload by the tag field by default. */
  tag?: string;

  /** The optional data to attach. This may have a length of 0. Hex-encoded with 0x prefix. */
  data?: string;
}

export interface TreasuryTransactionPayload {
  /** Set to value 4 to denote a Treasury Payload. */
  type: number;
  input: TreasuryInput;
  output: TreasuryOutput;
}

export interface TreasuryInput {
  /** Set to value 1 to denote a TreasuryInput. */
  type: number;

  /** Hex-encoded with 0x prefix. */
  milestoneId: string;
}

export interface TreasuryOutput {
  /** Set to value 2 to denote a TreasuryOutput. */
  type: number;

  /** Amount of IOTA tokens in the treasury. Plain string encoded number. */
  amount: string;
}

/**
 * The peer of a node.
 */
export interface Peer {
  /** The identifier of the peer. */
  id: string;

  /** The addresses of the peer. */
  multiAddresses: string[];

  /** The alias of the peer. */
  alias?: string;
  relation: "known" | "unknown" | "autopeered";

  /** Tells whether the peer is connected or not. */
  connected: boolean;
  gossip?: Gossip;
}

/**
 * Information about the gossip stream with the peer.
 */
export interface Gossip {
  /** Information about the most recent heartbeat of the peer. The heartbeat is `null` if none has been received yet. */
  heartbeat: Heartbeat | null;

  /** Metrics about the gossip stream with the peer. */
  metrics: Metrics;
}

export interface Heartbeat {
  /** The most recent milestone that has been solidified by the node. */
  solidMilestoneIndex: number;

  /** Tells from which starting point the node holds data. */
  prunedMilestoneIndex: number;

  /** The most recent milestone known to the node. */
  latestMilestoneIndex: number;

  /** Tells how many connected peers the node has. */
  connectedNeighbors: number;

  /** Tells how many synced peers the node has. */
  syncedNeighbors: number;
}

export interface Metrics {
  /** The number of received blocks that were new for the node. */
  newBlocks: number;

  /** The number of received blocks that already were known to the node. */
  knownBlocks: number;

  /** The number of received blocks from the peer. */
  receivedBlocks: number;

  /** The number of received block requests from the peer. */
  receivedBlockRequests: number;

  /** The number of received milestone requests from the peer. */
  receivedMilestoneRequests: number;

  /** The number of received heartbeats from the peer. */
  receivedHeartbeats: number;

  /** The number of sent blocks to the peer. */
  sentBlocks: number;

  /** The number of sent block requests to the peer. */
  sentBlockRequests: number;

  /** The number of sent milestone requests to the peer. */
  sentMilestoneRequests: number;

  /** The number of sent heartbeats to the peer. */
  sentHeartbeats: number;

  /** The number of dropped packets. */
  droppedPackets: number;
}

/**
 * Defines changing protocol parameters in a milestone.
 */
export interface ProtocolParamsMilestoneOpt {
  /** Defines the type of MilestoneOpt. */
  type: number;

  /** The milestone index at which these protocol parameters become active. */
  targetMilestoneIndex: number;

  /** The to be applied protocol version. */
  protocolVersion: number;

  /** The protocol parameters in binary form. Hex-encoded with 0x prefix. */
  params: string;
}

/**
 * Contains a receipt and the index of the milestone which contained the receipt.
 */
export interface ReceiptTuple {
  /** Contains a receipt and the index of the milestone which contained the receipt. */
  receipt: ReceiptPayload;
  milestoneIndex: number;
}

/**
 * Contains a receipt and the index of the milestone which contained the receipt.
 */
export interface ReceiptPayload {
  /** Type identifier of a receipt payload (3). */
  type: number;
  migratedAt: number;
  final: boolean;
  funds: MigratedFundsEntry[];
  transaction: TreasuryTransactionPayload;
}

export interface MigratedFundsEntry {
  tailTransactionHash: string;
  address: Ed25519Address;
  deposit: number;
}

/**
 * The error format.
 */
export interface ErrorResponse {
  error: { code: string; message: string };
}

/**
 * Contains the available API routes of the node.
 */
export interface RoutesResponse {
  routes: string[];
}

/**
 * Returns general information about the node.
 */
export interface InfoResponse {
  /** The name of the node. */
  name: string;

  /** The semantic version of the node. */
  version: string;

  /** Status of the node. */
  status: {
    isHealthy: boolean;
    latestMilestone: { index: number; timestamp?: number; milestoneId?: string };
    confirmedMilestone: { index: number; timestamp?: number; milestoneId?: string };
    pruningIndex: number;
  };

  /** Node metrics. */
  metrics: { blocksPerSecond: number; referencedBlocksPerSecond: number; referencedRate: number };

  /** The supported protocol versions. */
  supportedProtocolVersions: number[];

  /** Protocol parameters. */
  protocol: {
    networkName: string;
    bech32Hrp: string;
    tokenSupply: string;
    version: number;
    minPowScore: number;
    belowMaxDepth: number;
    rentStructure: { vByteCost: number; vByteFactorData: number; vByteFactoKey: number };
  };

  /** Pending protocol parameters. */
  pendingProtocolParameters: ProtocolParamsMilestoneOpt[];

  /** Gives info about the base token the network uses. */
  baseToken: {
    name: string;
    tickerSymbol: string;
    unit: string;
    decimals: number;
    subunit?: string;
    useMetricPrefix: boolean;
  };

  /** The features that are supported by the node. For example, a node could support the Proof-of-Work (pow) feature, which would allow the Proof-of-Work to be performed by the node itself. All features must be lowercase. */
  features: string[];
}

/**
 * Returns tips that are ideal for attaching a block.
 */
export interface TipsResponse {
  /** The block identifiers that can be used to a attach a block to. Hex-encoded with 0x prefix. */
  tips: string[];
}

/**
 * Submits a block to the node.
 */
export interface SubmitBlockRequest {
  /** Protocol version number of the block. It also tells which protocol rules apply to the block. */
  protocolVersion: number;

  /** The identifiers of the blocks this block references. Hex-encoded with 0x prefix. */
  parents?: string[];
  payload?: TransactionPayload | MilestonePayload | TaggedDataPayload | TreasuryTransactionPayload | ReceiptPayload;

  /** The nonce which lets this block fulfill the Proof-of-Work requirement. Hex-encoded with 0x prefix. */
  nonce?: string;
}

/**
 * Returns the block identifier of the submitted block.
 */
export interface SubmitBlockResponse {
  /** The block identifier of the submitted block. Hex-encoded with 0x prefix. */
  blockId: string;
}

/**
 * Returns the metadata of a given block.
 */
export interface BlockMetadataResponse {
  /** The identifier of the block. Hex-encoded with 0x prefix. */
  blockId: string;

  /** The identifiers of the blocks this block references. Hex-encoded with 0x prefix. */
  parents: string[];

  /** Tells if the block could get solidified by the node or not. */
  isSolid: boolean;

  /** Tells which milestone references this block. */
  referencedByMilestoneIndex?: number;

  /** If set, this block can be considered as a valid milestone block. This field therefore describes the milestone index of the involved milestone. A block can be considered as a valid milestone block if the milestone payload is valid and if the referenced parents in the milestone payload do match the referenced parents in the block itself. Note it's possible to have different milestone blocks that all represent the same milestone. */
  milestoneIndex?: number;

  /** If `included`, the block contains a transaction that has been included in the ledger. If `conflicitng`, the block contains a transaction that has not been included in the ledger because it conflicts with another transaction. If the block does not contain a transaction, `ledgerInclusionState` is set to `noTransaction`. */
  ledgerInclusionState?: "included" | "conflicting" | "noTransaction";

  /**
   * Values:
   *   * `1` - denotes that the referenced UTXO was already spent.
   *   * `2` - denotes that the referenced UTXO was already spent while confirming this milestone.
   *   * `3` - denotes that the referenced UTXO cannot be found.
   *   * `4` - denotes that the sum of the inputs and output values does not match.
   *   * `5` - denotes that the unlock block signature is invalid.
   *   * `6` - denotes that the configured timelock is not yet expired.
   *   * `7` - denotes that the given native tokens are invalid.
   *   * `8` - denotes that the return amount in a transaction is not fulfilled by the output side.
   *   * `9` - denotes that the input unlock is invalid.
   *   * `10` - denotes that the inputs commitment is invalid.
   *   * `11` - denotes that an output contains a Sender with an ident (address) which is not unlocked.
   *   * `12` - denotes that the chain state transition is invalid.
   *   * `255` - denotes that the semantic validation failed.
   *
   */
  conflictReason?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 255;

  /** If set, defines the order of the block in the white flag traversal during milestone solidification. Only referenced blocks have this information. */
  whiteFlagIndex?: number;

  /** Tells if the block should be promoted to get more likely picked up by the Coordinator. */
  shouldPromote?: boolean;

  /** Tells if the block should be reattached. */
  shouldReattach?: boolean;
}

/**
 * Returns a given block.
 */
export interface BlockResponse {
  /** A block is the object nodes gossip around in the network. It always references two other blocks that are known as parents. It is stored as a vertex on the tangle data structure that the nodes maintain. A block can have a maximum size of 32Kb. */
  allOf?: Block;
}

/**
 * Returns an output and its metadata.
 */
export interface OutputResponse {
  /** Metadata of the output. */
  metadata: OutputMetadataResponse;

  /** The actual output content. */
  output:
    | BasicOutput
    | AliasOutput
    | FoundryOutput
    | NFTOutput
    | (BasicOutput & AliasOutput & FoundryOutput & NFTOutput);
}

/**
 * Returns metadata about an output.
 */
export interface OutputMetadataResponse {
  /** The block identifier that references the output. Hex-encoded with 0x prefix. */
  blockId: string;

  /** The identifier of the transaction. Hex-encoded with 0x prefix. */
  transactionId: string;

  /** The index of the output. */
  outputIndex: number;

  /** Tells if the output is spent or not. */
  isSpent: boolean;

  /** The milestone index at which this output was spent. */
  milestoneIndexSpent?: number;

  /** The milestone timestamp this output was spent. */
  milestoneTimestampSpent?: number;

  /** The transaction this output was spent with. Hex-encoded with 0x prefix. */
  transactionIdSpent?: string;

  /** The milestone index at which the output was booked. */
  milestoneIndexBooked: number;

  /** The milestone unix timestamp at which the output was booked. */
  milestoneTimestampBooked: number;

  /** The current ledger index for which the request was made. */
  ledgerIndex: number;
}

export interface ReceiptsResponse {
  receipts: ReceiptTuple[];
}

export interface TreasuryResponse {
  milestoneId: string;

  /** Plain string encoded number. */
  amount: string;
}

/**
 * Returns all UTXO changes of the given milestone.
 */
export interface UTXOChangesResponse {
  /** The index number of the milestone. */
  index: number;

  /** The created outputs of the given milestone. */
  createdOutputs: string[];

  /** The consumed outputs of the given milestone. */
  consumedOutputs: string[];
}

/**
 * Returns all peers of the node.
 */
export type PeersResponse = Peer[];

/**
 * Returns a given peer of the node.
 */
export interface PeerResponse {
  /** The peer of a node. */
  allOf?: Peer;
}

/**
 * Adds a given peer to the node.
 */
export interface AddPeerRequest {
  multiAddress: string;
  alias?: string;
}

/**
 * Returns information about an added peer.
 */
export interface AddPeerResponse {
  /** The peer of a node. */
  allOf?: Peer;
}

/**
 * Milestone info and parents to start the computation from.
 */
export interface ComputeWhiteFlagRequest {
  /** The index of the milestone. */
  index: number;

  /** The timestamp of the milestone. */
  timestamp: number;

  /** The hex encoded block IDs of the parents the milestone references. */
  parents: string[];

  /** The hex encoded milestone ID of the previous milestone. */
  previousMilestoneId: string;
}

/**
 * Returns the computed InclusionMerkleRoot and AppliedMerkleRoot
 */
export interface ComputeWhiteFlagResponse {
  /** The hex encoded inclusion merkle tree root as a result of the white flag computation. */
  inclusionMerkleRoot: string;

  /** The hex encoded applied merkle tree root as a result of the white flag computation. */
  appliedMerkleRoot: string;
}

/**
 * Defines the request of a prune database REST API call
 */
export interface PruneDatabaseRequest {
  /** The pruning target index. */
  index?: number;

  /** The pruning depth. */
  depth?: number;

  /** The target size of the database in bytes. */
  targetDatabaseSize?: string;
}

/**
 * Defines the response of a prune database REST API call
 */
export interface PruneDatabaseResponse {
  /** The index of the snapshot. */
  index: number;
}

/**
 * Defines the request of a create snapshots REST API call.
 */
export interface CreateSnapshotRequest {
  /** The index of the snapshot. */
  index: number;
}

/**
 * Defines the request of a create snapshots REST API call.
 */
export interface CreateSnapshotResponse {
  /** The index of the snapshot. */
  index: number;

  /** The file path of the snapshot file. */
  filePath: string;
}

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (securityData: SecurityDataType | null) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
  data: D;
  error: E;
}