# SAP-1: Skill Acquisition Protocol v1

| Field | Value |
|-------|-------|
| **SDP** | 001 |
| **Title** | Skill Acquisition Protocol |
| **Status** | Draft |
| **Category** | Standards Track — Core |
| **Created** | 2026-03-31 |
| **Author** | 0xCaptain888 (@0xCaptain888) |
| **Requires** | Metaplex Token Standard, SPL Token, x402 Protocol |
| **Implementation** | [SkillDock](https://github.com/0xCaptain888/SkillDock) |

> The first open standard for AI Agent skill discovery, acquisition, and verification on Solana.

## Abstract

SAP-1 defines a standardized protocol for how AI Agents discover, evaluate, acquire, and verify skills (capabilities) on the Solana blockchain. It establishes the Skill NFT metadata standard, the discovery mechanism, the atomic acquisition flow, and the versioning lifecycle. SAP-1 is chain-native, designed specifically for Solana's transaction model and Metaplex NFT infrastructure.

## Motivation

Current AI Agent tooling suffers from:
1. **No standardized discovery** — Agents cannot programmatically find capabilities they need
2. **No ownership model** — Skills are configured, not owned; no transferability or composability
3. **No economic layer** — Creators have no incentive to build high-quality skills
4. **No verification** — No way to prove an Agent possesses a capability, or that a skill is authentic

SAP-1 solves all four by defining skill capabilities as on-chain assets with standardized metadata, discoverable through a permissionless registry, acquirable through atomic transactions, and verifiable through cryptographic proofs.

## Specification

### 1. Skill NFT Metadata Standard

Every SAP-1 compliant skill MUST include the following metadata fields in its Metaplex NFT:

```json
{
  "sap_version": "1.0.0",
  "skill": {
    "name": "string — Human-readable skill name",
    "capability_id": "string — Unique identifier (reverse-dns: com.skilldock.rug-shield)",
    "capability_type": "enum — security | trading | social | data | utility | governance",
    "version": "semver — e.g. 1.2.0",
    "description": "string — What this skill does",
    "input_schema": {
      "type": "object",
      "description": "JSON Schema defining required inputs"
    },
    "output_schema": {
      "type": "object",
      "description": "JSON Schema defining expected outputs"
    },
    "compatibility": {
      "min_agent_version": "string",
      "required_permissions": ["array of permission strings"],
      "chain_requirements": ["solana-mainnet | solana-devnet"],
      "runtime": "node | browser | mobile"
    },
    "economics": {
      "price_lamports": "u64 — Price in lamports",
      "royalty_bps": "u16 — Royalty basis points (0-10000)",
      "license": "perpetual | subscription | pay-per-use"
    },
    "integrity": {
      "code_hash": "SHA-256 hash of the skill's executable code",
      "metadata_hash": "SHA-256 hash of this metadata object (excluding this field)",
      "merkle_proof": "Proof of inclusion in the SkillDock Registry Merkle Tree"
    }
  }
}
```

### 2. Skill Registry

The SAP-1 Registry is an on-chain Anchor program that maintains a global index of all registered skills.

#### Accounts

```
SkillEntry (PDA: seeds = [b"skill", skill_nft_mint])
├── skill_nft: Pubkey          // Metaplex NFT mint address
├── creator: Pubkey             // Original creator wallet
├── capability_hash: [u8; 32]  // SHA-256 of capability metadata
├── version: u16               // Semantic version (packed)
├── status: u8                 // 0=Active, 1=Deprecated, 2=Flagged, 3=Suspended
├── total_acquisitions: u64    // Number of times acquired
├── total_rating_sum: u64      // Sum of all ratings received
├── rating_count: u32          // Number of ratings
├── registered_at: i64         // Unix timestamp
├── updated_at: i64            // Last update timestamp
└── bump: u8                   // PDA bump seed
```

#### Instructions

| Instruction | Description | Authority |
|---|---|---|
| `register_skill` | Register a new skill NFT in the registry | Creator (must be NFT mint authority) |
| `acquire_skill` | Atomic: SOL transfer + NFT transfer + registry update | Agent wallet |
| `rate_skill` | Submit a rating (1-100) for an acquired skill | Agent (must own skill NFT) |
| `deprecate_skill` | Mark a skill version as deprecated | Creator |
| `flag_skill` | Community flag for review | Any wallet (requires stake) |

#### Atomic Acquisition Flow

```
Transaction (single Solana TX):
  Instruction 1: Transfer SOL (Agent → Creator) [price_lamports]
  Instruction 2: Transfer NFT (Creator ATA → Agent ATA) [skill_nft]
  Instruction 3: Update SkillEntry [total_acquisitions += 1]
  Instruction 4: Emit Event [SkillAcquired { agent, skill, price, timestamp }]
```

All four instructions execute atomically — if any fails, the entire transaction reverts. This eliminates the race condition documented in Engineering Log Issue #4.

### 3. Discovery Protocol

Agents discover skills through a deterministic, multi-signal scoring algorithm:

```
discovery_score = w1 * relevance(query, skill.description)
                + w2 * quality(skill.avg_rating, skill.rating_count)
                + w3 * cost_efficiency(1 / skill.price_lamports)
                + w4 * trust(skill.total_acquisitions, skill.creator_reputation)
                + w5 * freshness(skill.updated_at)

Default weights: w1=0.35, w2=0.25, w3=0.15, w4=0.15, w5=0.10
```

The Discovery Protocol operates in three modes:
- **Reactive** — Agent encounters a threat/need, searches for matching skills
- **Proactive** — Agent periodically scans for skills that could improve its capabilities
- **Recommended** — Registry suggests skills based on Agent's existing skill portfolio

### 4. Verification Layer

SAP-1 includes a three-layer verification system:

#### Layer 1: Metadata Integrity (Merkle Tree)
- All registered skill metadata is hashed and included in a Merkle Tree
- The Merkle Root is stored on-chain in the Registry's global state
- Before acquisition, Agents verify the skill's metadata against the Merkle proof
- Any tampering invalidates the proof

#### Layer 2: Code Integrity (SHA-256)
- The skill's executable code is hashed at registration time
- The hash is stored in both the NFT metadata and the on-chain registry
- Before execution, Agents verify the code hash matches
- Mismatched hash = compromised skill = refuse to execute

#### Layer 3: Ownership Verification (On-Chain)
- Skill ownership is verified by checking the NFT's token account
- Only the wallet holding the NFT can invoke the skill
- Ownership is transferable (secondary market)
- Revocation: Creator can deprecate (not revoke ownership, but mark as outdated)

### 5. Versioning & Lifecycle

```
States: Draft → Active → Deprecated → Archived
                  ↓
               Flagged → Suspended (by DAO vote)
```

- **Draft**: Skill registered but not yet acquirable (testing phase)
- **Active**: Available for discovery and acquisition
- **Deprecated**: Creator publishes new version; old version still functional but hidden from discovery
- **Flagged**: Community reports issue; under review
- **Suspended**: DAO vote confirms malicious/broken skill; acquisition blocked
- **Archived**: Permanently removed from discovery; existing owners retain NFT

Version upgrades: Creator mints new NFT with incremented version. Old version auto-transitions to Deprecated. Existing owners receive airdrop notification for upgrade.

### 6. Economic Model

```
Skill Sale Revenue Flow:
  85% → Creator wallet (direct SOL transfer)
  10% → SkillDock Treasury (protocol fee)
   5% → DAO Governance Fund (community rewards)

Secondary Sale (NFT resale):
  Metaplex Royalty (set by creator, typically 5-10%)
  Split: 80% Creator / 20% Protocol
```

### 7. Agent-to-Agent Interaction (x402)

When Agent A needs a capability that Agent B possesses:

```
1. Agent A broadcasts need via Discovery Protocol
2. Registry returns matching skills, including those owned by other Agents
3. Agent A initiates x402 payment to Agent B
4. Agent B delegates skill execution (not NFT transfer)
5. Result returned to Agent A
6. x402 payment confirmed on Solana L1
```

This enables a "skill sharing economy" where Agents can monetize their capabilities without transferring ownership.

## Reference Implementation

- Registry Program: `/contracts/skill-registry/`
- Merkle Verifier: `/src/merkle-verifier.mjs`
- LLM Guardian: `/src/llm-guardian.mjs`
- GitHub: https://github.com/0xCaptain888/SkillDock

## Security Considerations

1. **Malicious Skills**: Flagging mechanism + DAO suspension prevents long-term exploitation
2. **Price Manipulation**: On-chain price history prevents sudden price spikes before acquisition
3. **Sybil Ratings**: Rating requires skill ownership (NFT verification), limiting fake reviews
4. **Front-running**: Atomic acquisition prevents MEV extraction on skill purchases

## Changelog

- v1.0.0 (2026-03-31): Initial specification

## Authors

- 0xCaptain888 (@0xCaptain888)

## License

CC-BY-SA 4.0
