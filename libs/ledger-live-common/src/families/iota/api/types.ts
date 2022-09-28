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
 * A message is the object nodes gossip around in the network. It always references two other messages that are known as parents. It is stored as a vertex on the tangle data structure that the nodes maintain. A message can have a maximum size of 32Kb.
 */
 export interface Message {
    /** Network identifier. This field signifies for which network the message is meant for. It also tells which protocol rules apply to the message. It is computed out of the first 8 bytes of the `BLAKE2b-256` hash of the concatenation of the network type and protocol version string. */
    networkId: string;

    /** The identifiers of the messages this message references. */
    parentMessageIds: string[];
    payload: TransactionPayload | MilestonePayload | IndexationPayload | ReceiptPayload;

    /** The nonce which lets this message fulfill the Proof-of-Work requirement. */
    nonce: string;
  }

  /**
   * The Transaction Payload to be embedded into a message.
   */
  export interface TransactionPayload {
    /** Set to value 0 to denote a Transaction Payload. */
    type: number;
    essence: TransactionEssence;
    unlockBlocks: (SignatureUnlockBlock | ReferenceUnlockBlock)[];
  }

  /**
   * Describes the essence data making up a transaction by defining its inputs and outputs and an optional payload.
   */
  export interface TransactionEssence {
    /** Set to value 0 to denote a Transaction Essence. */
    type: number;
    inputs: UTXOInput[];
    outputs: (
      | SigLockedSingleOutput
      | SigLockedDustAllowanceOutput
      | (SigLockedSingleOutput & SigLockedDustAllowanceOutput)
    )[];
    payload: IndexationPayload | null;
  }

  /**
   * Describes an input which references an unspent transaction output to consume.
   */
  export interface UTXOInput {
    /** Set to value 0 to denote an UTXO Input. */
    type: number;

    /** The BLAKE2b-256 hash of the transaction from which the UTXO comes from. */
    transactionId: string;

    /** The index of the output on the referenced transaction to consume. */
    transactionOutputIndex: number;
  }

  /**
   * Describes a deposit to a single address which is unlocked via a signature.
   */
  export interface SigLockedSingleOutput {
    /** Set to value 0 to denote a SigLockedSingleOutput. */
    type: number;
    address: Ed25519Address;

    /** The amount of tokens to deposit with this SigLockedSingleOutput output. */
    amount: number;
  }

  /**
   * Output type for deposits that enables an address to receive dust outputs. It can be consumed as an input like a regular SigLockedSingleOutput
   */
  export interface SigLockedDustAllowanceOutput {
    /** Set to value 1 to denote a SigLockedDustAllowanceOutput. */
    type: number;
    address: Ed25519Address;

    /** The amount of tokens to deposit with this SigLockedDustAllowanceOutput output. */
    amount: number;
  }

  /**
   * The Ed25519 address.
   */
  export interface Ed25519Address {
    /** Set to value 0 to denote an Ed25519 Address. */
    type: number;

    /** The hex-encoded BLAKE2b-256 hash of the Ed25519 public key. */
    address: string;
  }

  /**
   * Defines an unlock block containing signature(s) unlocking input(s).
   */
  export interface SignatureUnlockBlock {
    /** Denotes a Signature Unlock Block. */
    type: number;
    signature: Ed25519Signature;
  }

  /**
   * The Ed25519 signature.
   */
  export interface Ed25519Signature {
    /** Set to value 0 to denote an Ed25519 Signature. */
    type: number;

    /** The public key of the Ed25519 keypair which is used to verify the signature. */
    publicKey: string;

    /** The signature signing the serialized Transaction Essence. */
    signature: string;
  }

  /**
   * References a previous unlock block in order to substitute the duplication of the same unlock block data for inputs which unlock through the same data.
   */
  export interface ReferenceUnlockBlock {
    /** Set to value 1 to denote a Reference Unlock Block. */
    type: number;

    /** Represents the index of a previous unlock block. */
    reference: number;
  }

  /**
   * The Milestone Payload to be embedded into a message.
   */
  export interface MilestonePayload {
    /** Set to value 1 to denote a Milestone Payload. */
    type: number;

    /** The index of the milestone. */
    index: number;

    /** The Unix timestamp at which the milestone was issued. The unix timestamp is specified in seconds. */
    timestamp: number;

    /** The identifiers of the messages this milestone  references. */
    parents: string[];

    /** 256-bit hash based on the message IDs of all the not-ignored state-mutating transactions referenced by the milestone. */
    inclusionMerkleProof: string;
    nextPoWScore: number;
    nextPoWScoreMilestoneIndex: number;

    /** An array of public keys to validate the signatures. The keys must be in lexicographical order. */
    publicKeys: string[];

    /** An array of signatures signing the serialized Milestone Essence. The signatures must be in the same order as the specified public keys. */
    signatures: string[];
  }

  /**
   * The Indexation Payload to be embedded into a message.
   */
  export interface IndexationPayload {
    /** Set to value 2 to denote a Indexation Payload. */
    type: number;

    /** The indexation key to find/look up this message. It has a size between 1 and 64 bytes and must be encoded as a hex-string. */
    index: string;

    /** The optional data to attach. This may have a length of 0. */
    data: string;
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
    milestoneId: string;
  }

  export interface TreasuryOutput {
    /** Set to value 2 to denote a TreasuryOutput. */
    type: number;
    amount: number;
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
    gossip: Gossip;
  }

  /**
   * Information about the gossip stream with the peer.
   */
  export interface Gossip {
    /** Information about the most recent heartbeat of the peer. The heartbeat is `null` if none has been received yet. */
    heartbeat?: Heartbeat | null;

    /** Metrics about the gossip stream with the peer. */
    metrics?: Metrics;
  }

  export interface Heartbeat {
    /** The most recent milestone that has been solidified by the node. */
    solidMilestoneIndex?: number;

    /** Tells from which starting point the node holds data. */
    prunedMilestoneIndex?: number;

    /** The most recent milestone known to the node. */
    latestMilestoneIndex?: number;

    /** Tells how many connected peers the node has. */
    connectedNeighbors?: number;

    /** Tells how many synced peers the node has. */
    syncedNeighbors?: number;
  }

  export interface Metrics {
    /** The number of received messages that were new for the node. */
    newMessages: number;

    /** The number of received messages that already were known to the node. */
    knownMessages: number;

    /** The number of received messages from the peer. */
    receivedMessages: number;

    /** The number of received message requests from the peer. */
    receivedMessageRequests: number;

    /** The number of received milestone requests from the peer. */
    receivedMilestoneRequests: number;

    /** The number of received heartbeats from the peer. */
    receivedHeartbeats: number;

    /** The number of sent messages to the peer. */
    sentMessages: number;

    /** The number of sent message requests to the peer. */
    sentMessageRequests: number;

    /** The number of sent milestone requests to the peer. */
    sentMilestoneRequests: number;

    /** The number of sent heartbeats to the peer. */
    sentHeartbeats: number;

    /** The number of dropped packets. */
    droppedPackets: number;
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
   * Returns general information about the node.
   */
  export interface InfoResponse {
    data: {
      name: string;
      version: string;
      isHealthy: boolean;
      networkId: string;
      bech32HRP: string;
      minPoWScore: number;
      messagesPerSecond: number;
      referencedMessagesPerSecond: number;
      referencedRate: number;
      latestMilestoneTimestamp: number;
      latestMilestoneIndex: number;
      confirmedMilestoneIndex: number;
      pruningIndex: number;
      features: string[];
    };
  }

  /**
   * Returns tips that are ideal for attaching a message.
   */
  export interface TipsResponse {
    data: { tipMessageIds: string[] };
  }

  /**
   * Submits a message to the node.
   */
  export interface SubmitMessageRequest {
    /** Network identifier. This field signifies for which network the message is meant for. It also tells which protocol rules apply to the message. It is computed out of the first 8 bytes of the `BLAKE2b-256` hash of the concatenation of the network type and protocol version string. */
    networkId?: string;

    /** The identifiers of the messages this message references. */
    parentMessageIds?: string[];
    payload?: TransactionPayload | MilestonePayload | IndexationPayload | TreasuryTransactionPayload | ReceiptPayload;

    /** The nonce which lets this message fulfill the Proof-of-Work requirement. */
    nonce?: string;
  }

  /**
   * Returns the message identifier of the submitted message.
   */
  export interface SubmitMessageResponse {
    data: { messageId: string };
  }

  /**
   * Searches for messages matching a given indexation key.
   */
  export interface MessagesFindResponse {
    data: { index: string; maxResults: number; count: number; messageIds: string[] };
  }

  /**
   * Returns the metadata of a given message.
   */
  export interface MessageMetadataResponse {
    data: {
      messageId: string;
      parentMessageIds: string[];
      isSolid: boolean;
      referencedByMilestoneIndex?: number | null;
      milestoneIndex?: number;
      ledgerInclusionState?: "included" | "conflicting" | "noTransaction";
      conflictReason?: number;
      shouldPromote?: boolean;
      shouldReattach?: boolean;
    };
  }

  /**
   * Returns a given message.
   */
  export interface MessageResponse {
    data: { allOf?: Message };
  }

  /**
   * Returns the children of a given message.
   */
  export interface MessageChildrenResponse {
    data: { messageId: string; maxResults: number; count: number; childrenMessageIds: string[] };
  }

  /**
   * Returns an output.
   */
  export interface OutputResponse {
    data: {
      messageId: string;
      transactionId: string;
      outputIndex: number;
      isSpent: boolean;
      output:
        | SigLockedSingleOutput
        | SigLockedDustAllowanceOutput
        | (SigLockedSingleOutput & SigLockedDustAllowanceOutput);
      ledgerIndex: number;
    };
  }

  /**
   * Returns the balance of an address.
   */
  export interface BalanceAddressResponse {
    data: { addressType: number; address: string; balance: number; dustAllowed: boolean; ledgerIndex: number };
  }

  export interface OutputsAddressResponse {
    data: {
      addressType: number;
      address: string;
      maxResults: number;
      count: number;
      outputIds: string[];
      ledgerIndex: number;
    };
  }

  export interface ReceiptsResponse {
    data: { receipts: ReceiptTuple[] };
  }

  export interface TreasuryResponse {
    data: { milestoneId: string; amount: number };
  }

  /**
   * Returns information about a milestone.
   */
  export interface MilestoneResponse {
    data: { index: number; messageId: string; timestamp: number };
  }

  /**
   * Returns all UTXO changes of the given milestone.
   */
  export interface UTXOChangesResponse {
    data: { index: number; createdOutputs: string[]; consumedOutputs: string[] };
  }

  /**
   * Returns all peers of the node.
   */
  export interface PeersResponse {
    data: Peer[];
  }

  /**
   * Returns a given peer of the node.
   */
  export interface PeerResponse {
    data: Peer;
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
    data: Peer;
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
