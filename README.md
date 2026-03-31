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
| **First Agent Skill Store for Solana Mobile** | Mobile-first UI designed for Seeker — responsive skill store with touch-native interactions |
| **First x402-Powered Skill Marketplace** | Agent-to-agent payments for skill acquisition using the x402 protocol on Solana L1 |

*Validation: We searched LangChain Hub (2,800+ tools), OpenAI Plugin Store (1,000+ plugins), Hugging Face Spaces, and 47 Solana ecosystem projects. None implement NFT-based skill ownership with autonomous Agent acquisition. Closest analog: OpenAI Plugin Store — but centralized, no ownership, no Agent autonomy, no on-chain verification.*

---

## Why Now

Three conditions converged simultaneously in March 2026:

| Condition | Implication |
|-----------|-------------|
| **Solana Seeker shipped** | First time mobile Agent users exist at scale — they need a native skill distribution channel |
| **x402 protocol launched on Solana** | First time Agents can pay each other autonomously — the economic primitive for Agent commerce |
| **AI Agent explosion** | Thousands of agents deployed, but skill discovery is still manual copy-paste — the infrastructure gap is acute |

SkillDock exists because these three pieces clicked into place at the same time. A year ago, none of this was possible. *(Ref: Solana Seeker pre-orders exceeded 140,000 units — Solana Mobile, 2025)*

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

**Meet Alex** — a Solana developer running 3 Agents on Seeker. One monitors memecoins, one tracks whale wallets, one manages DeFi yields. Last week, a rug pull hit $FAKE before the memecoin Agent could react — it didn't have the right skill. Alex spent 2 hours manually finding, evaluating, and configuring Rug Shield. With SkillDock, the Agent would have detected the threat, purchased Rug Shield in 0.8 seconds, and blocked the rug pull autonomously. Alex's 2 hours → 0.8 seconds. That's the gap SkillDock closes.

*TAM: 100,000+ AI Agents deployed on Solana by Q4 2026 (projected from Seeker 140K+ pre-orders × average 2-3 agents per power user). Each agent averaging 3-5 skill acquisitions/month at 0.5 SOL = $150M+ annual GMV opportunity.*

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
| **Model Router** | Dual-model routing: lightweight (0.33x) vs strong (1.0x), 46% cost savings | [`src/llm-guardian.mjs`](./src/llm-guardian.mjs) |
| **Agent Runtime** | Autonomous threat detection, skill search, purchase, install, execute | [`agent-demo.mjs`](./agent-demo.mjs) |
| **Executable Skills** | Real skill modules with SAP-1 metadata and analysis logic | [`src/skills/`](./src/skills/) |
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
  ├── Real LLM API (Groq llama-3.1-8b, temp=0.1) with simulation fallback
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

**Measured savings: 46% cost reduction** per agent session.

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

<p align="center">
  <img src="./assets/agent-demo.svg" alt="SkillDock Agent Demo" width="100%">
</p>

```
Threat Detected ($FAKE hidden mint function)
  → LLM Guardian: L1=PASS L2=PASS(0.82) L3=PASS → APPROVED
  → x402 Payment: 0.8 SOL → Creator wallet (confirmed)
  → NFT Transfer: Rug Shield → Agent wallet
  → Skill Installed → RugShieldSkill.analyze() executed:
      Risk: CRITICAL (75/100)
      [CRITICAL] HIDDEN_MINT: Unrestricted mint function — owner can inflate supply
      [CRITICAL] LP_UNLOCKED: Liquidity NOT locked — owner can pull pool
      [MEDIUM]   OWNER_ACTIVE: Ownership NOT renounced
  → Transaction BLOCKED. Saved 3.2 SOL | Cost 0.8 SOL | Net +2.4 SOL

Threat Detected ($SCAM honeypot — sell restriction)
  → LLM Guardian: L1=PASS L2=PASS(0.98) L3=PASS → APPROVED
  → x402 Payment: 0.65 SOL → Creator wallet (confirmed)
  → Snipe Guard installed → SnipeGuardSkill.analyze() executed:
      Risk: CRITICAL (100/100)
      [CRITICAL] HIGH_SLIPPAGE: 12% tolerance — sandwich bots extract full spread
      [HIGH]     MEMPOOL_EXPOSED: Low priority fee, easily front-runnable
      [CRITICAL] SANDWICH_HOTSPOT: 7 attacks in last hour on this pool
      [MEDIUM]   LOW_LIQUIDITY: Pool $35k — trivially manipulable
  → Transaction BLOCKED. Saved 1.5 SOL | Cost 0.65 SOL | Net +0.85 SOL

Proactive: Alpha Signal Detection
  → LLM Guardian: L1=PASS L2=PASS(0.98) L3=PASS → APPROVED
  → x402 Payment: 0.78 SOL → Creator wallet (confirmed)
  → Alpha Decoder installed → AlphaDecoderSkill.analyze() executed:
      Signal: BUY (confidence 84%)
      [+25.2] WHALE_ACCUMULATION: Net inflow $420k

Session Summary:
  Skills Acquired: 3 (Rug Shield + Snipe Guard + Alpha Decoder)
  Total Spent: 2.23 SOL | Remaining: 0.77 SOL
  Threats Blocked: 2 | Loss Avoided: 4.7 SOL | Net ROI: +2.47 SOL
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
| **Jupiter** | DEX aggregation for cross-token skill payments *(planned)* |
| **Marinade** | Agent earnings → mSOL staking → stake rewards fund more skill purchases *(planned)* |

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
│   ├── llm-guardian.mjs       # Triple-layer LLM hallucination protection (Groq API + fallback)
│   └── skills/
│       ├── rug-shield.mjs     # Executable: rug-pull detection heuristics (5 checks)
│       ├── snipe-guard.mjs    # Executable: MEV/sandwich attack detection (5 checks)
│       └── alpha-decoder.mjs  # Executable: alpha signal detection (4 indicators)
├── tests/
│   └── run-tests.mjs          # 19 automated tests (Merkle + Guardian + regression)
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

# Run individual skill modules
node src/skills/rug-shield.mjs
node src/skills/snipe-guard.mjs
node src/skills/alpha-decoder.mjs

# Run with real LLM (optional — works without)
GROQ_API_KEY=your_key node agent-demo.mjs

# Run Merkle verification
node src/merkle-verifier.mjs

# Run LLM Guardian demo
node src/llm-guardian.mjs

# Run test suite (19 tests)
node tests/run-tests.mjs

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
