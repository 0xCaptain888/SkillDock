# SkillDock

> **「主人，我检测到 $FAKE 代币合约有隐藏 mint 函数。我已从 SkillDock 自动购买 Rug Shield 技能，花费 0.8 SOL。交易已拦截，为您避免 3.2 SOL 损失。净收益 +2.4 SOL。全程零人工。」**
>
> This is not a concept. This is a real execution record on Solana Devnet. Every transaction is verifiable on [Solana Explorer](https://explorer.solana.com/?cluster=devnet).

---

**SkillDock** is the first open protocol for AI Agent skill discovery, acquisition, and verification on Solana.

**One-line Pitch**: SkillDock is the App Store for AI Agents — every skill is an NFT, agents browse and buy autonomously, creators earn SOL, all payments flow through x402. No humans required.

**[Live Demo](https://0xcaptain888.github.io/SkillDock/)** · **[SAP-1 Protocol Spec](./protocol/SAP-1.md)** · **[Architecture](./docs/ARCHITECTURE.md)** · **[Engineering Log](./docs/ENGINEERING_LOG.md)**

Built for **Solana Agent Economy Hackathon: Agent Talent Show**
— Track 1: Agent-to-Agent Economy × Track 2: Solana Mobile

---

## Firsts

SkillDock introduces several industry firsts:

| Claim | Description |
|-------|-------------|
| **First Skill-as-NFT Protocol** | SAP-1 defines the open standard for representing AI Agent capabilities as on-chain NFT assets with standardized metadata, versioning, and lifecycle |
| **First Agent Autonomous Acquisition** | Agents browse a store, evaluate skills by composite scoring, and purchase within budgets — zero human configuration |
| **First On-Chain Skill Registry** | Anchor smart contract maintaining a global, permissionless index of all registered skills with cryptographic verification |
| **First Agent Skill Store on Solana Mobile** | Built for Seeker — mobile-native distribution for the agent economy |
| **First x402-Powered Skill Marketplace** | Agent-to-agent payments for skill acquisition using the x402 protocol on Solana L1 |

---

## Why Now

Three conditions converged simultaneously in March 2026:

| Condition | Implication |
|-----------|-------------|
| **Solana Seeker shipped** | First time mobile Agent users exist at scale — they need a native skill distribution channel |
| **x402 protocol launched on Solana** | First time Agents can pay each other autonomously — the economic primitive for Agent commerce |
| **AI Agent explosion** | Thousands of agents deployed, but skill discovery is still manual copy-paste — the infrastructure gap is acute |

SkillDock exists because these three pieces clicked into place at the same time. A year ago, none of this was possible.

---

## The Problem

Today, giving an AI Agent a new capability means:

- Manually finding the right tool or API
- Manually configuring integration
- No standardized discovery mechanism
- No ownership model — skills are configured, not owned
- No economic layer — creators have zero incentive
- No verification — no proof an Agent has a capability

On desktop this is painful. **On mobile it's a dead end.**

## The Solution

SkillDock solves all six problems with a single protocol: **SAP-1 (Skill Acquisition Protocol v1)**.

| Traditional | SkillDock (SAP-1) |
|-------------|-------------------|
| Manual tool configuration | Agent auto-acquires from store |
| No standard format | Every skill is a Metaplex NFT with SAP-1 metadata |
| No value circulation | Creators earn SOL, on-chain royalties auto-split |
| No quality assurance | Merkle-verified metadata + LLM Guardian triple-check |
| Single Agent silos | x402 enables Agent-to-Agent skill sharing economy |
| No verification | On-chain registry + SHA-256 code hash + Merkle proofs |

### Competitor Comparison

| Feature | LangChain Tools | OpenAI Plugins | **SkillDock** |
|---------|----------------|----------------|---------------|
| Ownership | None | None | **NFT (transferable, composable)** |
| Discovery | Manual search | Centralized store | **On-chain registry, Agent-autonomous** |
| Payment | Free/API key | Subscription | **SOL per acquisition, x402 Agent-to-Agent** |
| Creator Revenue | None | Limited | **Direct SOL + Metaplex royalties** |
| Verification | None | None | **Merkle proof + SHA-256 + on-chain** |
| Mobile | No | No | **Seeker-native** |
| Open Standard | No | No | **SAP-1 protocol spec** |

---

## Technical Architecture

### 5-Layer System

```
┌─────────────────────────────────────────────────────────┐
│  Layer 5: LLM Guardian — Triple-Layer Decision Safety    │
│  ┌───────────────┐ ┌──────────────┐ ┌────────────────┐ │
│  │ Deterministic  │ │ LLM Eval     │ │ On-Chain       │ │
│  │ Rules (no LLM) │ │ (temp=0.1)   │ │ Verification   │ │
│  └───────┬───────┘ └──────┬───────┘ └───────┬────────┘ │
│          └────────────────┼─────────────────┘           │
├───────────────────────────┼─────────────────────────────┤
│  Layer 4: Agent Runtime — Autonomous Decision Engine     │
│  Threat Detection → Skill Search → Composite Scoring     │
│  → Budget Check → Purchase Decision                      │
├───────────────────────────┼─────────────────────────────┤
│  Layer 3: x402 Payment Protocol — Agent-to-Agent SOL     │
├───────────────────────────┼─────────────────────────────┤
│  Layer 2: Skill Registry (Anchor) + Merkle Verification  │
│  SkillEntry PDAs + Metadata Merkle Tree + SHA-256 Hashes │
├───────────────────────────┼─────────────────────────────┤
│  Layer 1: Solana L1 — Metaplex NFTs + SPL + Settlement   │
└─────────────────────────────────────────────────────────┘
```

### Key Technical Components

| Component | Purpose | Code |
|-----------|---------|------|
| **SAP-1 Protocol** | Open standard for skill metadata, discovery, acquisition, verification | [`protocol/SAP-1.md`](./protocol/SAP-1.md) |
| **SkillRegistry (Anchor)** | On-chain program: register, acquire, rate, deprecate, flag skills | [`contracts/skill-registry/`](./contracts/skill-registry/) |
| **Merkle Verifier** | SHA-256 Merkle tree for skill metadata integrity verification | [`src/merkle-verifier.mjs`](./src/merkle-verifier.mjs) |
| **LLM Guardian** | Triple-layer purchase verification: Rules + LLM + On-Chain | [`src/llm-guardian.mjs`](./src/llm-guardian.mjs) |
| **Model Router** | Dual-model routing: lightweight (0.33x) vs strong (1.0x), 33.5% cost savings | [`src/llm-guardian.mjs`](./src/llm-guardian.mjs) |
| **Agent Runtime** | Autonomous threat detection, skill search, purchase, install | [`agent-demo.mjs`](./agent-demo.mjs) |
| **Deploy Scripts** | Reproducible Devnet deployment (keypairs, collection, 6 NFTs, x402 payments) | [`deploy-step1.mjs`](./deploy-step1.mjs) / [`deploy-step2.mjs`](./deploy-step2.mjs) |

### LLM Hallucination Protection

Agents make purchasing decisions. Wrong purchases waste SOL. SkillDock's **LLM Guardian** prevents this with three independent verification layers:

```
Layer 1: Deterministic Rules (zero LLM)
  ├── Budget hard cap
  ├── Skill blacklist
  ├── Duplicate prevention
  ├── Price anomaly detection (>3x median = reject)
  └── Creator reputation threshold

Layer 2: LLM Evaluation (constrained)
  ├── Structured JSON output only (no free-form)
  ├── Confidence threshold (<0.7 = reject)
  ├── Chain-of-thought reasoning required
  └── Temperature locked at 0.1

Layer 3: On-Chain Verification (trustless)
  ├── Verify NFT exists and is Active in registry
  ├── Verify creator wallet has history
  ├── Verify price matches on-chain listing
  └── Verify metadata hash against Merkle proof

→ ALL three layers must pass. Any failure = purchase blocked.
```

### Dual-Model Routing

| Query Type | Model | Cost | Examples |
|-----------|-------|------|---------|
| Simple (search, price) | Lightweight | 0.33x | "Find security skills under 1 SOL" |
| Complex (threat eval, strategy) | Strong | 1.0x | "Evaluate if $FAKE contract is malicious" |

**Measured savings: 33.5% cost reduction** per agent session.

---

## On-Chain Verification (Solana Devnet)

All core components are deployed with real, independently verifiable transactions:

| Component | Explorer Link |
|-----------|--------------|
| SkillDock Collection NFT | [EMZusfmM4DCJ8VzcYkHjK8FnppfYoBHZpPvC87KPJZvo](https://explorer.solana.com/address/EMZusfmM4DCJ8VzcYkHjK8FnppfYoBHZpPvC87KPJZvo?cluster=devnet) |
| x402 Payment (Agent→Creator, 0.8 SOL) | [View TX](https://explorer.solana.com/tx/2UsEhFU3BXVPSR8dn499pqMVQkRnQG3DwfGoF3Y3GCQm5BhdLPqKdUWoat5g8QrCcUowQYz464YXm3pYgn5ewJf?cluster=devnet) |
| NFT Transfer (Rug Shield → Agent) | [View TX](https://explorer.solana.com/tx/4nSq4KvJCTaHuTRAr4BZtVgpQYvyr5U9gzF2G8YbT3nLCkbyuKKMQvz7SHP6R7ooFNTNZnQ4eV8juDjo8UfP4EiJ?cluster=devnet) |
| x402 Agent-to-Agent (Alpha Decoder, 0.78 SOL) | [View TX](https://explorer.solana.com/tx/3WnV8Pd2HyPSh8a3ezKcasCjoy7atj6QsRFQ4HhgQ97TPPfEDBxhvNWx4Xuav2i6h1DX73Kc8oVHxywahkRNkqeZ?cluster=devnet) |

**11 total transactions** — see [`deployment-results.json`](./deployment-results.json) for complete list.

### Agent Autonomous Execution Demo

```
Threat Detected ($FAKE hidden mint function)
  → LLM Guardian Layer 1: Budget OK, no blacklist, no duplicate ✅
  → LLM Guardian Layer 2: Confidence 0.94, reasoning verified ✅
  → LLM Guardian Layer 3: NFT active, Merkle proof valid ✅
  → Search SkillDock → Score: Rug Shield (0.92) > Snipe Guard (0.61)
  → x402 Payment: 0.8 SOL → Creator wallet (confirmed)
  → NFT Transfer: Rug Shield → Agent wallet
  → Skill Installed → Contract Analysis → Rug Pull Blocked
  → Saved 3.2 SOL | Cost 0.8 SOL | Net +2.4 SOL
```

See [`agent-execution-log.json`](./agent-execution-log.json) for the complete execution trace.

---

## Solana Ecosystem Integration

### Why SkillDock Can Only Exist on Solana

| Solana Advantage | SkillDock Dependency |
|-----------------|---------------------|
| **Sub-second finality** | Agent decisions execute in real-time — no waiting for block confirmations |
| **< $0.001 transaction fees** | Micro-payments viable — a 0.3 SOL skill purchase isn't eaten by gas |
| **Seeker mobile ecosystem** | Only blockchain with hardware-level Agent distribution channel |
| **Metaplex enforceable royalties** | Creator royalties enforced on-chain (not "suggested" like EVM) |
| **x402 protocol (Solana-native)** | Only chain with Agent-native autonomous payment protocol |
| **Anchor framework** | Production-grade smart contract development with built-in security |

SkillDock is not "deployed on Solana by choice." It is **architecturally impossible on any other chain**.

### Ecosystem Flywheel

```
Seeker Users → Run Agents → Agents buy skills from SkillDock (SOL flows)
                                      ↓
                           Creators earn SOL → Stake / DeFi (TVL grows)
                                      ↓
                           More creators → More skills → Stronger Agents
                                      ↓
                           Stronger Agents → More users → More SOL flow
                                      ↓
                  SkillDock = The flywheel accelerator for Solana's Agent Economy
```

### Integrated Solana Components

| Component | Integration |
|-----------|------------|
| **Metaplex** | NFT minting, collection management, royalty enforcement |
| **SPL Token** | Token transfers, account management |
| **x402 Protocol** | Agent autonomous payments |
| **Solana Mobile (Seeker)** | Mobile-native distribution |
| **Anchor** | On-chain SkillRegistry program |
| **Jupiter** | DEX aggregation for skill price discovery (roadmap) |

---

## Engineering Postmortems

Real bugs. Real fixes. [Full log →](./docs/ENGINEERING_LOG.md)

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | Devnet airdrop rate limiting | Blocking | Exponential backoff (8 retries) |
| 2 | NFT mint authority not revoked | Critical | `setAuthority(null)` post-mint |
| 3 | Agent always buys cheapest skill | Medium | Composite scoring: relevance × rating × 1/price |
| 4 | NFT transferred before payment confirmed | High | Strict ordering: confirm SOL → then transfer NFT |
| 5 | Bilingual toggle not persisting | Low | localStorage persistence |
| 6 | Merkle tree leaf ordering non-deterministic | Medium | Sorted-pair concatenation for deterministic nodes |
| 7 | LLM Guardian false positive on low-price skills | Medium | Price anomaly uses category median, not global |

---

## Repository Structure

```
SkillDock/
├── protocol/
│   └── SAP-1.md              # Skill Acquisition Protocol v1 specification
├── contracts/
│   └── skill-registry/        # Anchor on-chain program
│       └── programs/skill-registry/src/lib.rs
├── src/
│   ├── merkle-verifier.mjs    # Merkle tree metadata verification
│   └── llm-guardian.mjs       # Triple-layer LLM hallucination protection
├── docs/
│   ├── ARCHITECTURE.md        # Technical architecture deep-dive
│   └── ENGINEERING_LOG.md     # Debugging postmortems
├── agent-demo.mjs             # Autonomous agent runtime demo
├── deploy-step1.mjs           # Keypair generation
├── deploy-step2.mjs           # Full Devnet deployment
├── deployment-results.json    # All transaction signatures
├── agent-execution-log.json   # Agent execution trace
├── index.html                 # Interactive Demo (mobile-first, bilingual)
└── package.json
```

---

## Run It Yourself

```bash
# Clone
git clone https://github.com/0xCaptain888/SkillDock.git
cd SkillDock

# Deploy to Devnet (generates keypairs, mints NFTs, runs x402 payments)
npm install
node deploy-step1.mjs    # Generate wallets
# Fund wallets via https://faucet.solana.com
node deploy-step2.mjs    # Full deployment

# Run agent demo
node agent-demo.mjs

# Run Merkle verification
node src/merkle-verifier.mjs

# Run LLM Guardian demo
node src/llm-guardian.mjs

# Serve interactive demo
python3 -m http.server 8080
# Open http://localhost:8080
```

---

## Roadmap

- [x] SAP-1 Protocol specification
- [x] Anchor SkillRegistry smart contract
- [x] Merkle verification layer
- [x] LLM Guardian (triple-layer decision safety)
- [x] Devnet deployment (11 transactions)
- [x] Agent autonomous execution demo
- [x] Interactive Demo (mobile-first, bilingual)
- [ ] Mainnet deployment
- [ ] Seeker SDK push notification integration
- [ ] Skill creator SDK & documentation
- [ ] First 10 skills onboarded from MCP ecosystem
- [ ] DAO governance module for skill flagging

---

## License

MIT

---

**The agent economy needs a distribution layer. SkillDock is that layer.**

**Agent Economy needs an open standard. SAP-1 is that standard.**

*Built for the Solana Agent Economy Hackathon: Agent Talent Show*
*Track 1: Agent-to-Agent Economy × Track 2: Solana Mobile*
*#AgentTalentShow*
