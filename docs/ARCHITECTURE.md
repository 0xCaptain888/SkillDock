# SkillDock — Technical Architecture

> Implementing SAP-1: The Skill Acquisition Protocol for AI Agents on Solana

## System Overview

SkillDock is a protocol-level infrastructure for AI Agent skill discovery, acquisition, and verification on Solana. It implements the [SAP-1 specification](../protocol/SAP-1.md) through a 5-layer architecture combining on-chain programs, cryptographic verification, LLM safety mechanisms, and autonomous agent runtimes.

## 5-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Layer 5: LLM Guardian — Triple-Layer Decision Safety            │
│  ┌─────────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │ Deterministic    │  │ LLM Evaluator │  │ On-Chain         │  │
│  │ Rules Engine     │  │ (temp=0.1)    │  │ Verifier         │  │
│  │                  │  │               │  │                  │  │
│  │ • Budget cap     │  │ • Structured  │  │ • NFT exists?    │  │
│  │ • Blacklist      │  │   JSON output │  │ • Creator legit? │  │
│  │ • Duplicate      │  │ • Confidence  │  │ • Price match?   │  │
│  │ • Price anomaly  │  │   > 0.7       │  │ • Merkle proof?  │  │
│  │ • Reputation     │  │ • Chain-of-   │  │ • Status active? │  │
│  │                  │  │   thought     │  │                  │  │
│  └────────┬─────────┘  └───────┬───────┘  └────────┬─────────┘  │
│           └────────────────────┼─────────────────────┘           │
│                         ALL MUST PASS                            │
├────────────────────────────────┼────────────────────────────────┤
│                                                                  │
│  Layer 4: Agent Runtime — Autonomous Decision Engine             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Threat        │  │ Skill Search │  │ Model Router         │  │
│  │ Detection     │  │ & Scoring    │  │ Simple → 0.33x cost  │  │
│  │               │  │              │  │ Complex → 1.0x cost  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         └──────────┬───────┘                     │               │
│            ┌───────┴───────┐                     │               │
│            │ Decision       │◄────────────────────┘               │
│            │ Engine         │                                     │
│            └───────┬───────┘                                     │
├────────────────────┼────────────────────────────────────────────┤
│                                                                  │
│  Layer 3: x402 Payment Protocol                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Agent A ──SOL──► Creator/Agent B                          │   │
│  │ Autonomous payment • Budget-capped • On-chain verifiable  │   │
│  └──────────────────────────────┬───────────────────────────┘   │
├─────────────────────────────────┼───────────────────────────────┤
│                                                                  │
│  Layer 2: Skill Registry (Anchor Program) + Merkle Verification  │
│  ┌────────────────────┐  ┌───────────────────────────────────┐  │
│  │ On-Chain Registry   │  │ Merkle Verification Layer         │  │
│  │                     │  │                                   │  │
│  │ SkillEntry PDAs     │  │ • SHA-256 leaf hashing            │  │
│  │ AcquisitionRecords  │  │ • Sorted-pair tree construction   │  │
│  │ RegistryState       │  │ • On-chain Merkle root storage    │  │
│  │                     │  │ • Pre-acquisition proof check     │  │
│  │ Instructions:       │  │ • Tamper detection                │  │
│  │ • register_skill    │  │                                   │  │
│  │ • acquire_skill     │  │ Root: stored in RegistryState     │  │
│  │ • rate_skill        │  │ Proof: verified before every      │  │
│  │ • deprecate_skill   │  │        acquisition                │  │
│  │ • flag_skill        │  │                                   │  │
│  └────────┬───────────┘  └──────────────┬────────────────────┘  │
│           └──────────────┬──────────────┘                        │
├──────────────────────────┼──────────────────────────────────────┤
│                                                                  │
│  Layer 1: Solana L1 — Settlement & Ownership                     │
│  ┌───────────┐  ┌────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │ SPL Token  │  │ Metaplex   │  │ System      │  │ Anchor    │ │
│  │ Program    │  │ Protocol   │  │ Program     │  │ Framework │ │
│  └───────────┘  └────────────┘  └─────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Details

### Layer 1: Solana L1

The settlement layer handles all on-chain state:

- **SPL Token**: NFT minting (supply=1, decimals=0), token account management, transfers
- **Metaplex**: Collection NFTs, metadata standard, enforceable royalties
- **System Program**: SOL transfers for x402 payments
- **Anchor Framework**: Custom SkillRegistry program deployment

### Layer 2: Skill Registry + Merkle Verification

**SkillRegistry** (Anchor Program — [`contracts/skill-registry/`](../contracts/skill-registry/))

Three account types:
- `RegistryState` (global PDA): authority, total_skills, merkle_root, treasury, fee config
- `SkillEntry` (per-skill PDA, seed: `["skill", mint]`): creator, capability_hash, version, status, acquisition count, ratings
- `AcquisitionRecord` (per-acquisition PDA, seed: `["acquisition", agent, mint]`): price_paid, timestamp, rating

Seven instructions:
| Instruction | Description | Access Control |
|-------------|-------------|---------------|
| `initialize` | Create RegistryState | Authority only |
| `register_skill` | Add skill to registry | Creator (NFT holder) |
| `acquire_skill` | Atomic purchase: SOL split + NFT transfer + counter update | Any agent |
| `rate_skill` | Rate an acquired skill (1-100) | Skill owner only |
| `deprecate_skill` | Mark skill as deprecated | Creator only |
| `flag_skill` | Community flag (requires 0.01 SOL stake) | Any wallet |
| `update_merkle_root` | Update global Merkle root | Authority only |

Revenue split on `acquire_skill`: **85% Creator / 10% Treasury / 5% DAO**

**Merkle Verifier** ([`src/merkle-verifier.mjs`](../src/merkle-verifier.mjs))

- Builds SHA-256 Merkle tree from all skill metadata
- Root stored on-chain in `RegistryState.merkle_root`
- Before every acquisition, Agent verifies the skill's metadata against Merkle proof
- Tampered metadata → invalid proof → acquisition blocked at Layer 3 (LLM Guardian)

### Layer 3: x402 Payment Protocol

Agent-to-agent payment flow:

```
1. Agent A identifies needed skill (search + score)
2. LLM Guardian approves purchase (3 layers)
3. x402 payment: SOL transfer Agent A → Creator wallet
4. Wait for `confirmed` commitment (prevents race condition — see Postmortem #4)
5. NFT transfer: Creator ATA → Agent A ATA
6. SkillEntry.total_acquisitions += 1
7. AcquisitionRecord created on-chain
```

In the Anchor program, steps 3-7 execute atomically in a single Solana transaction.

### Layer 4: Agent Runtime

**Autonomous Decision Engine:**
```
Input: Threat alert / User request / Proactive scan
  ↓
Model Router: classify complexity → select model (0.33x or 1.0x)
  ↓
Threat Assessment: severity scoring (CRITICAL/HIGH/MEDIUM/LOW)
  ↓
Skill Search: query registry by capability_type + tags
  ↓
Composite Scoring: relevance × rating × (1/price) × trust_factor
  ↓
LLM Guardian: triple-layer verification (see Layer 5)
  ↓
x402 Payment → NFT Transfer → Install → Execute
```

**Composite Scoring Formula (SAP-1 Discovery Protocol):**
```
score = 0.35 × relevance(query, description)
      + 0.25 × quality(avg_rating, rating_count)
      + 0.15 × cost_efficiency(1 / price_lamports)
      + 0.15 × trust(total_acquisitions, creator_reputation)
      + 0.10 × freshness(updated_at)
```

### Layer 5: LLM Guardian

Three independent verification layers. All must pass.

**Layer 1 — Deterministic Rules (zero LLM involvement):**
- Budget hard cap: `agent_balance × max_spend_ratio`
- Skill blacklist: known malicious skill IDs
- Duplicate prevention: check AcquisitionRecord exists
- Price anomaly: skill price > 3× category median → reject
- Creator reputation: min 5 acquisitions, min 3.0 rating
- Version check: deprecated skills blocked

**Layer 2 — LLM Evaluation (constrained):**
- Output: JSON schema only (no free-form hallucination)
- Confidence: threshold 0.7, below → reject
- Reasoning: chain-of-thought required (explain why skill matches need)
- Temperature: locked 0.1 (near-deterministic)
- Risk factors: flag if skill description contains suspicious keywords

**Layer 3 — On-Chain Verification (trustless):**
- NFT exists and status == Active in SkillRegistry
- Creator wallet created > 24h ago (not freshly generated)
- Listed price matches on-chain SkillEntry price
- Metadata SHA-256 hash matches on-chain `capability_hash`
- Merkle proof validates against on-chain `merkle_root`
- Skills with 0 acquisitions get extra scrutiny flag

## On-Chain Verification

| Component | Type | Verifiable |
|-----------|------|------------|
| Collection NFT | SPL Token (supply=1) | [Explorer](https://explorer.solana.com/address/EMZusfmM4DCJ8VzcYkHjK8FnppfYoBHZpPvC87KPJZvo?cluster=devnet) |
| 6 Skill NFTs | SPL Token (supply=1, no mint auth) | Explorer (see deployment-results.json) |
| x402 Payments | SystemProgram transfer | Explorer |
| NFT Transfers | SPL Token transfer | Explorer |
| Agent Execution | JSON trace | [GitHub](../agent-execution-log.json) |
| Merkle Root | SHA-256 (32 bytes) | On-chain in RegistryState |

**11 real transactions** on Solana Devnet, all independently verifiable.

## Security Model

| Threat | Mitigation |
|--------|-----------|
| Malicious skill purchase | LLM Guardian triple-layer check (all 3 must pass) |
| Metadata tampering | Merkle tree verification (SHA-256 proof) |
| LLM hallucination | Layer 1 deterministic rules (zero LLM), Layer 2 temp=0.1 + structured output |
| NFT supply inflation | Mint authority revoked after creation (`setAuthority(null)`) |
| Payment-delivery race | Strict ordering (Postmortem #4) / Atomic in Anchor |
| Overspending | Budget hard cap in Deterministic Rules Engine |
| Sybil ratings | Rating requires AcquisitionRecord (must own skill NFT) |
| Price manipulation | On-chain price history, 3x median anomaly detection |

## Cost Optimization

**Dual-Model Router** saves 33.5% inference cost per session:

| Query Type | Model | Relative Cost | Use Case |
|-----------|-------|---------------|----------|
| Simple | Lightweight | 0.33x | Skill search, price lookup, category filter |
| Complex | Strong | 1.0x | Threat evaluation, multi-skill strategy, contract analysis |

Routing logic: keyword classification + input length heuristic. No LLM needed for the routing decision itself.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Solana (Devnet) |
| Smart Contract | Anchor 0.30.1 |
| NFT | Metaplex / SPL Token |
| Payment | x402 Protocol |
| Verification | SHA-256 Merkle Tree |
| LLM Safety | Triple-layer Guardian (Rules + LLM + On-Chain) |
| Frontend | Vanilla HTML/CSS/JS, GSAP, Google Fonts |
| Agent Runtime | Node.js ES Modules |
| Mobile | Seeker SDK (roadmap) |
| Protocol | SAP-1 v1.0.0 |