# Architecture blueprint for ION Connect infrastructure

---

## BNB Greenfield: decentralized storage with on-chain metadata

BNB Greenfield is a two-layer system: a **Cosmos/Tendermint blockchain** (2-second block time, Proof-of-Stake with BFT consensus) that stores all metadata, permissions, and billing on-chain, and a network of **Storage Providers (SPs)** that hold actual file data off-chain. The blockchain runs modules including `x/storage`, `x/permission`, `x/payment`, `x/bridge`, and `x/challenge`. Each SP runs **15 internal modules** — Gater (HTTP gateway), Uploader, Downloader, Authenticator, P2P, Receiver, Signer, BlockSyncer, PieceStore, and others.

**Upload flow** proceeds in four stages: the client selects a Primary SP, sends a `MsgCreateBucket` transaction on-chain (if needed), then sends `MsgCreateObject` on-chain (status becomes `OBJECT_STATUS_CREATED`), then uploads the raw data via the SP's REST API (`PutObject`). The Primary SP splits data into **16 MB segments**, computes **Reed-Solomon erasure coding (4 data + 2 parity chunks)** per segment, distributes parity chunks to secondary SPs via P2P, and finally sends a `MsgSealObject` on-chain with aggregate BLS signatures. **Download** is a single `GET` request to the Primary SP's REST endpoint (`https://{sp-endpoint}/download/{bucket}/{object}`), which verifies authentication and permissions before returning data.

SPs expose **S3-like HTTP REST APIs** with custom headers (`X-Gnfd-Content-Sha256`, `X-Gnfd-Txn-Hash`, `Authorization`). Authentication uses three schemes: **GNFD1-ECDSA** (private key signing for backends), **GNFD2-EDDSA** (off-chain EdDSA key stored in SPs for browser flows), and **GNFD1-ETH-PERSONAL_SIGN** (wallet signature for registering EdDSA keys). SDKs exist in **Go** (`greenfield-go-sdk`), **JavaScript** (`@bnb-chain/greenfield-js-sdk`), and **Solidity** (`greenfield-contracts-sdk`), plus a CLI tool (`gnfd-cmd`).

The **permission system** is entirely on-chain. Resources are identified by Greenfield Resource Names — `grn:b::{bucket}`, `grn:o::{bucket}/{object}`, `grn:g::{owner}/{group}` — with wildcard support. Policies specify principals (individual accounts or groups), actions (`create`, `delete`, `get`, `list`, `execute`), effects (`EFFECT_ALLOW`, `EFFECT_DENY`), and resource targets. Groups function as permission bundles: create a group via `MsgCreateGroup`, add members via `MsgUpdateGroupMember`, then attach policies via `MsgPutPolicy` with the group as principal.

### Cross-chain bridge to BSC and resource mirroring

Greenfield connects to BNB Smart Chain through a **native cross-chain bridge** operated by validators running the Greenfield Relayer. The relayer has three components: a Listener (monitors events on both chains), a Vote Processor (BLS-signs cross-chain packages), and a Transaction Assembler (submits aggregated cross-chain transactions). The protocol uses **SYN/ACK/FAIL_ACK** messaging. Buckets, objects, and groups can be **mirrored to BSC as ERC-721 NFTs** (group memberships as ERC-1155 tokens), enabling BSC smart contracts to manage Greenfield permissions via `BucketHub`, `ObjectHub`, and `GroupHub` contracts. Mirroring is a manual, one-way operation — once mirrored, management shifts to BSC. Critically, **file content is never copied to BSC**; only metadata and ownership records cross chains.

### Event listening: five methods for monitoring Greenfield activity

Greenfield emits typed events for every state change (`EventCreateBucket`, `EventCreateObject`, `EventSealObject`, `EventDeleteObject`). There are **no native webhooks** — services must use one of five approaches:

- **Tendermint WebSocket** (`wss://{greenfield-rpc}/websocket`): Real-time subscription using event query syntax like `tm.event='Tx' AND greenfield.storage.EventSealObject.bucket_name='mybucket'`. Requires RPC access.
- **BlockSyncer/Metadata API**: Each SP runs a BlockSyncer module that indexes all blockchain events into a MySQL database. External services query the SP's Metadata REST API for near-real-time indexed data — no full node required.
- **REST/gRPC polling**: Query blocks and transactions via Cosmos REST (`localhost:1317`) or gRPC (`localhost:9090`), parsing events from responses.
- **BSC contract events**: After mirroring resources to BSC, subscribe to standard EVM events on `CrossChain`, `BucketHub`, `ObjectHub`, and `GroupHub` contracts using ethers.js/web3.js WebSocket providers.
- **Third-party services**: NodeReal Enhanced API and GreenfieldScan provide additional monitoring.

For an architecture diagram, the **Tendermint WebSocket** is the primary real-time channel for services directly monitoring Greenfield, while **BSC contract events** are best when governance already lives on BSC.

---

## ION Proxy and ADNL: the encrypted overlay network layer

ION Proxy is the gateway between conventional internet and ION's overlay. It operates via **RLDP-HTTP Proxy** in two modes: a **client/entry proxy** (accepts HTTP on `localhost:8080`, translates to RLDP/ADNL over UDP) and a **server/reverse proxy** (accepts RLDP/ADNL from the ION network, forwards as HTTP to a local web server on port 80). All encryption is handled by ADNL, making HTTPS/TLS unnecessary when the entry proxy runs locally.

**ADNL (Abstract Datagram Network Layer)** is the foundational protocol. Each participant has a **256-bit ADNL address** derived as `SHA-256(type_id || ed25519_public_key)`. Key exchange uses **x25519 ECDH**, session encryption uses **AES-256-CTR** with 128-bit counters, and integrity verification uses **SHA-256**. Each datagram includes a 32-byte random nonce to prevent bit-flipping attacks on CTR mode.

The **TCP handshake** (used for liteserver connections) is a 256-byte exchange: 32 bytes receiver address, 32 bytes sender public key, 32 bytes SHA-256 proof, and 160 bytes of encrypted AES parameters (rx_key, tx_key, rx_nonce, tx_nonce, padding). The **UDP protocol** (used for inter-node communication) is channel-based — nodes create dedicated channels via `adnl.message.createChannel` with fresh ed25519 keypairs.

Three higher-level protocols build on ADNL. The **DHT** is Kademlia-like, using XOR distance metrics with a search width of 6-10, bootstrapped from nodes listed in `global.config.json`. It stores ADNL-address-to-IP mappings. **RLDP** (Reliable Large Datagram Protocol) adds reliability via **RaptorQ forward error correction** (fountain codes) instead of TCP-style acknowledgments — data is split into 768-byte symbols, encoded with RaptorQ, and streamed as `rldp.messagePart` messages. **Overlay subnetworks** partition the ADNL network by function, with peers discovered through DHT lookups.

### Client-to-ION-Site data flow

The complete path for accessing a `.ion` website:

1. Browser sends HTTP request to local proxy at `localhost:8080`
2. Proxy resolves `.ion` domain via ION DNS (on-chain smart contract `dnsresolve` call) → returns ADNL address
3. Proxy queries DHT to find the IP:port behind that ADNL address
4. Proxy establishes ADNL UDP connection to the server's entry point
5. HTTP request serialized into TL `http.request` schema, wrapped in `rldp.query`, encoded with RaptorQ
6. Encoded symbols sent as `rldp.messagePart` over ADNL UDP
7. Remote reverse proxy decodes, converts to standard HTTP, forwards to local web server
8. Response travels back the same path

**Privacy model (current v1.0)**: Connections are essentially **direct** between client and server via ADNL. IP addresses are visible to direct peers. The planned **v2.0** will introduce **garlic routing** (I2P-inspired) with unidirectional tunnels, layered encryption, and incentivized relay nodes.

For an architecture diagram, ION Proxy creates a **parallel communication channel** alongside the public internet. Components communicating through this channel use ADNL/RLDP over UDP instead of HTTP/TCP. The entry proxy and reverse proxy are the boundary points between the two networks.

---

## ION Storage: torrent-based decentralized file distribution

ION Storage is a BitTorrent-like system running on ION's overlay protocols rather than TCP/IP. Files are organized into **Bags** (analogous to torrents) — each bag has a torrent header (file names and sizes), data split into **128 KB chunks**, and a **Merkle tree** built from TVM cells over SHA-256 hashes of those chunks. The hash of the serialized torrent info cell is the **BagID** — the 256-bit identifier used to locate and verify the bag.

**Storage flow**: A user runs `storage-daemon` (connecting to ION's ADNL network on a configured UDP port), creates a bag from local files via CLI (`create <path>`), and immediately begins seeding. Retrieval uses `add-by-hash <BagID>` or `add-by-meta <metafile>`. Peer discovery happens through **ION DHT**, and data transfers use **RLDP** over ADNL. Partial downloads are supported with per-file priority settings (0-255).

**On-chain storage guarantees** come through smart contracts. A storage provider deploys a main contract specifying rates (in ion/MB/day), min/max bag sizes, and proof intervals. When a client requests storage, a per-bag **storage contract** is created. The provider must periodically submit **Merkle proofs** proving data possession — if a proof fails, the contract is destroyed and the provider receives no payment. This creates an economic incentive for reliable storage.

ION Storage integrates with ION DNS through the `dns_storage_address#7473 bag_id:uint256` record type. A `.ion` domain can point directly to a storage bag, enabling **fully decentralized static websites** — no web server needed. NFT contracts also support `ionstorage://<BagID>/` URLs for on-chain content references.

---

## ION DNS: on-chain domain resolution via smart contracts

ION DNS resolves `.ion` domains entirely through **on-chain smart contracts** — no centralized DNS servers. The **root DNS contract** address is stored in masterchain configuration parameter #4. Each `.ion` domain is an **NFT** (the resolver is an NFT collection contract, each domain is an NFT item contract).

**Resolution algorithm**: Domain names are converted to internal representation by reversing components and null-separating them (`test.ion` → `ion\0test\0`). The `dnsresolve` get-method (method_id 123660) is called on the root contract with the serialized domain and a category key. If the contract fully resolves (`m = n`), it returns the DNS record. If partial (`0 < m < n`), it returns a `dns_next_resolver` pointing to the next resolver contract, and resolution continues recursively.

**Four record types** matter for the architecture:

- `sha256("wallet")` → `dns_smc_address` — maps to a ION wallet address
- `sha256("site")` → `dns_adnl_address` — maps to an ADNL address for ION Sites (accessed via ION Proxy)
- `sha256("storage")` → `dns_storage_address` — maps to a ION Storage BagID
- `sha256("dns_next_resolver")` → `dns_next_resolver` — points to subdomain resolver contracts

Domains are registered via **auction** (1-hour for new domains, 1-week for expired ones, minimum 5% bid increment, minimum price varies by length). Annual renewal costs **0.015 ION**. Subdomain management requires deploying a custom resolver contract that implements the `dnsresolve` interface.

For the architecture diagram, **ION DNS is the naming layer** that maps human-readable `.ion` domains to ADNL addresses (for services behind ION Proxy) and BagIDs (for content in ION Storage). It's queried on-chain by the client-side RLDP-HTTP proxy during domain resolution.

---

## ION Connect: event-driven messaging through relays

ION Connect is an extension of NOSTR ("Notes and Other Stuff Transmitted by Relays") which is a client-relay protocol built on a single data type — the **event**. Every event is a JSON object with seven fields: `id` (SHA-256 hash), `pubkey` (32-byte hex), `created_at` (unix timestamp), `kind` (integer 0-65535), `tags` (array of arrays), `content` (string), and `sig` (64-byte Schnorr signature over secp256k1). The event ID is computed by hashing `[0, pubkey, created_at, kind, tags, content]`.

**Kind ranges** define storage behavior: regular events (1000-9999) are stored permanently, replaceable events (10000-19999) keep only the latest per pubkey+kind, ephemeral events (20000-29999) are not stored, and parameterized replaceable events (30000-39999) keep the latest per pubkey+kind+d-tag. Key kinds include **0** (profile metadata), **1** (text note), **3** (contact list), **4** (encrypted DM, deprecated), **7** (reaction), **30023** (long-form articles), and **9734/9735** (Lightning zap request/receipt).

**Tags** provide flexible metadata — `["e", "<event_id>"]` references events, `["p", "<pubkey>"]` references users, `["t", "<hashtag>"]` adds topics, `["d", "<identifier>"]` namespaces parameterized replaceable events. All single-letter tags are indexed by relays, enabling filtered queries.

**Client-relay communication** uses WebSocket with three client message types (`EVENT`, `REQ`, `CLOSE`) and four relay message types (`EVENT`, `OK`, `EOSE`, `NOTICE`). Subscription filters support `ids`, `authors`, `kinds`, tag filters (`#e`, `#p`, `#t`), `since`, `until`, and `limit`. Multiple filters in one `REQ` are OR'd; conditions within a filter are AND'd. After sending all matching stored events, relays send `EOSE` (End of Stored Events), then stream live matches.

### Building custom extensions on ION Connect

Creating a custom ION Connect extension means choosing an appropriate kind number, defining what goes in `content` and `tags`, and optionally proposing a NIP. **NIP-78** (kind 30078) reserves a parameterized replaceable kind for arbitrary application data. **NIP-90** (Data Vending Machines) demonstrates the pattern for marketplace-style extensions — job request kinds (5000-7000) with result kinds at request+1000. Real-world extensions include marketplaces (NIP-15, kinds 30017/30018), file metadata (NIP-94), blob storage (Blossom/NIP-B7), calendar events (NIP-52), and live streaming (NIP-53).

For the architecture diagram, ION Connect provides an **event bus** that operates over **public internet WebSocket connections**. Clients publish signed events to multiple relays and subscribe to filtered event streams. Custom event kinds can signal file uploads, permission changes, or any application-specific action.

---

## DFNS: MPC wallet infrastructure with passkey authentication

DFNS is a wallet-as-a-service platform using **Threshold Signature Scheme (TSS)** with Multi-Party Computation. Each wallet has **5 encrypted key shares** distributed across geographically separated Tier 3+/4 data centers, with a **3-of-5 threshold** for signing. The full private key is **never reconstructed** — each node computes a partial signature, and these are mathematically combined into one valid blockchain signature. This architecture eliminates seed phrases entirely.

A critical design principle is the **complete separation** between authentication credentials (WebAuthn passkeys) and wallet signing keys (MPC shares). Even if a passkey is compromised, the attacker cannot derive wallet keys. Passkeys are revocable; wallet keys persist in the distributed infrastructure. DFNS supports **50+ blockchains** including BNB Chain/BSC (EVM-compatible, using `secp256k1` ECDSA).

**APIs** are RESTful at `https://api.dfns.io` (production) and `https://api.dfns.ninja` (sandbox). Key endpoints: `POST /wallets` (create wallet), `POST /wallets/{id}/transactions` (sign and broadcast), `POST /wallets/{id}/transfer` (transfer assets), `POST /keys/{id}/signatures` (generate raw signature), `POST /policies` (create governance policy), `POST /auth/action/challenge` (get signing challenge). Authentication requires a Bearer token in `Authorization` plus a cryptographic signature in `X-DFNS-USERACTION` for state-changing operations.

**Delegated signing** makes wallets non-custodial: the company provides infrastructure, but only the end-user's passkey can authorize transactions. The flow is: user initiates transaction → app requests User Action Challenge from DFNS → user's authenticator signs the challenge via WebAuthn → signed challenge sent to DFNS → DFNS verifies, evaluates policies, orchestrates MPC ceremony → transaction signed and broadcast. SDKs exist in TypeScript (`@dfns/sdk`, `@dfns/sdk-browser`, `@dfns/sdk-react-native`, `@dfns/sdk-keysigner`).

---

## FIDO2/WebAuthn: passwordless authentication for wallet access

FIDO2 combines **WebAuthn** (W3C browser API) and **CTAP2** (FIDO Alliance device protocol). WebAuthn handles browser-to-server communication; CTAP2 handles browser-to-authenticator communication over USB, NFC, or BLE.

**Registration ceremony**: Server sends `PublicKeyCredentialCreationOptions` with a random challenge, RP identity, and acceptable algorithms (typically ES256/P-256). Browser calls `navigator.credentials.create()`, which triggers the authenticator to prompt the user (biometric/PIN), generate a unique keypair bound to the RP's origin, and return an attestation response containing the public key, credential ID, and authenticator data. Server stores the public key and credential ID.

**Authentication ceremony**: Server sends `PublicKeyCredentialRequestOptions` with a fresh challenge. Browser calls `navigator.credentials.get()`, authenticator prompts the user, signs `authenticatorData + SHA-256(clientDataJSON)` with the stored private key, and returns the assertion. Server verifies the signature against the stored public key.

**Passkeys** are the consumer branding of WebAuthn discoverable credentials, synced across devices via iCloud Keychain (Apple), Google Password Manager, or third-party managers. They are phishing-resistant (bound to origin/domain), use no shared secrets (server stores only public keys), and private keys never leave secure hardware (TPM, Secure Enclave, TEE).

**The key architectural insight for wallet integration**: WebAuthn typically uses **P-256 (secp256r1)** while blockchains use **secp256k1** or Ed25519. These are different curves — WebAuthn credentials **cannot directly sign blockchain transactions**. DFNS solves this by using WebAuthn purely as an authentication/authorization layer that gates access to MPC infrastructure, which then signs with the correct blockchain curve. An alternative pattern (ERC-4337 account abstraction) uses P-256 signatures directly via on-chain verification, but this only works on chains with P-256 precompile support.

---

## How all components interconnect: the architecture diagram guide

The system has two distinct network planes. The **public internet plane** carries ION Connect WebSocket connections (clients ↔ relays), DFNS API calls (clients ↔ `api.dfns.io`), BNB Greenfield SP REST API calls (clients ↔ SP endpoints), and Greenfield blockchain RPC. The **ION overlay plane** carries all ADNL/RLDP traffic — ION Proxy tunneled HTTP, ION Storage file transfers, and ION DNS resolution queries.

### Client application connections

A client app maintains these simultaneous connections:

- **ION Proxy entry** (local `localhost:8080` HTTP → ADNL/RLDP over UDP port 3333): All `.ion` domain access, ION Storage gateway browsing, and any services hosted behind ION Proxy
- **ION Connect relays** (WebSocket `wss://relay.example.com`, public internet): Publishing and subscribing to events — file upload notifications, permission change signals, messaging
- **DFNS API** (HTTPS `api.dfns.io`, public internet): Wallet creation, transaction signing, user management — authenticated via WebAuthn passkeys
- **BNB Greenfield SPs** (HTTPS, public internet): Direct file upload (`PutObject`) and download (`GetObject`) via SP REST API
- **BNB Greenfield blockchain** (gRPC/Tendermint RPC, public internet): On-chain transactions (`MsgCreateBucket`, `MsgCreateObject`, `MsgPutPolicy`)
- **WebAuthn authenticator** (local CTAP2 via USB/NFC/BLE or platform API): Biometric prompts for DFNS transaction signing

### Service-to-service interactions

- **Greenfield event listener** → subscribes to Tendermint WebSocket (`wss://{greenfield-rpc}/websocket`) for `EventSealObject` events, or polls BlockSyncer Metadata API, or monitors BSC contract events after resource mirroring
- **Event listener → ION Connect relay**: On detecting a new sealed object, publishes a custom ION Connect event (e.g., kind 30078 with `["d", "greenfield-upload"]` tag containing bucket, object name, BagID metadata) — this bridges Greenfield storage events into the ION Connect event bus
- **ION DNS → ION Storage**: `.ion` domains can point to ION Storage BagIDs via `dns_storage_address` records, enabling decentralized content hosting
- **ION Proxy → ION DNS → ADNL network**: The entry proxy automatically resolves `.ion` domains on-chain before routing traffic through ADNL
- **DFNS → BNB Smart Chain**: DFNS signs BSC transactions (EVM-compatible) for Greenfield cross-chain operations — mirroring resources, managing permissions via `GroupHub`/`ObjectHub`

### What goes through ION Proxy vs public internet

**Through ION Proxy overlay** (ADNL/RLDP/UDP):
- Access to `.ion`-addressed services and websites
- ION Storage file retrieval (peer-to-peer via `storage-daemon`)
- ION DNS resolution (on-chain queries through the overlay)
- Any service explicitly addressed by ADNL address rather than IP

**Direct public internet** (HTTPS/WSS/TCP):
- BNB Greenfield SP file uploads and downloads (SP REST APIs are standard HTTPS)
- BNB Greenfield blockchain transactions (Tendermint RPC/gRPC)
- ION Connect relay connections (standard WebSocket)
- DFNS API calls (standard HTTPS REST)
- BSC/EVM RPC calls (standard JSON-RPC over HTTPS)