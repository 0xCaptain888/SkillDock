# SkillDock — Technical Architecture

## System Overview

SkillDock is a decentralized Skill Store for AI Agents built on Solana. Every agent skill is minted as a Metaplex NFT, enabling ownership, transfer, and autonomous purchase via the x402 payment protocol.

## 4-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│  Layer 4: Agent Runtime                          │
│  ┌─────────────┐  ┌──────────────┐              │
│  │ Threat       │  │ Skill Search │              │
│  │ Detection    │  │ Engine       │              │
│  └──────┬──────┘  └──────┬───────┘              │
│         └────────┬───────┘                       │
│            ┌─────┴─────┐                         │
│            │ Decision   │                         │
│            │ Engine     │                         │
│            └─────┬─────┘                         │
├──────────────────┼──────────────────────────────┤
│  Layer 3: x402 Payment Protocol                  │
│            ┌─────┴─────┐                         │
│            │ SOL        │                         │
│            │ Transfer   │                         │
│            └─────┬─────┘                         │
├──────────────────┼──────────────────────────────┤
│  Layer 2: Skill NFT Registry                     │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐        │
│  │ NFT  │  │ NFT  │  │ NFT  │  │ NFT  │        │
│  │ sk-1 │  │ sk-2 │  │ sk-3 │  │ sk-N │        │
│  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘        │
│     └─────────┴─────────┴─────────┘              │
│            ┌─────┴─────┐                         │
│            │ Collection │                         │
│            │ NFT        │                         │
│            └─────┬─────┘                         │
├──────────────────┼──────────────────────────────┤
│  Layer 1: Solana L1                              │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐      │
│  │ SPL     │  │ Metaplex │  │ System    │      │
│  │ Token   │  │ Protocol │  │ Program   │      │
│  └─────────┘  └──────────┘  └───────────┘      │
└─────────────────────────────────────────────────┘
```

## Core Mechanisms

### 1. Skill-as-NFT

Each agent skill is represented as a Solana NFT:
- **Mint**: SPL Token with 0 decimals, supply = 1
- **Mint Authority**: Set to `null` after minting (ensures 1-of-1)
- **Collection**: All skills belong to the SkillDock Collection NFT
- **Ownership**: Whoever holds the NFT can use the skill

This creates a real market for agent capabilities with verifiable ownership.

### 2. Agent Autonomous Decision Engine

```
Input: Mempool scan / Threat alert / User request
  ↓
Threat Assessment: Severity scoring (CRITICAL/HIGH/MEDIUM/LOW)
  ↓
Skill Search: Query registry by tags, filter by budget
  ↓
Skill Evaluation: Score = relevance × rating × (1/price)
  ↓
Budget Check: balance >= skill.price? → approve/reject
  ↓
x402 Payment: SOL transfer from agent → creator wallet
  ↓
NFT Transfer: Skill NFT from creator → agent wallet
  ↓
Install & Activate: Skill loaded into agent runtime
  ↓
Execute: Use skill to handle the original threat
```

### 3. x402 Payment Protocol Integration

x402 enables agent-to-agent transactions without human intervention:

1. Agent A identifies a needed skill
2. Agent A constructs a `SystemProgram.transfer` instruction
3. SOL moves from Agent A wallet → Skill Creator wallet
4. On confirmation, the Skill NFT is transferred to Agent A
5. All transactions are recorded on Solana L1

**Key property**: The entire purchase flow is autonomous. The agent operates within a user-set SOL budget.

### 4. Mobile-Native Distribution (Seeker)

SkillDock targets the Solana Seeker phone:
- Push notifications when matching skills are available
- One-tap install from the Seeker dApp Store
- Always-on connectivity for real-time threat monitoring
- Native Solana wallet integration

### 5. Creator Economy

Skill creators earn revenue through:
- **Direct sales**: SOL payment per install
- **Royalties**: Metaplex royalty standard on secondary sales
- **Bundles**: Composable skill packages with revenue sharing
- **Ratings**: Higher-rated skills get more visibility

## On-Chain Verification

All deployment artifacts are verifiable on Solana Explorer:

| Component | Type | Verifiable |
|-----------|------|------------|
| Collection NFT | SPL Token (supply=1) | ✅ Explorer |
| Skill NFTs (×6) | SPL Token (supply=1, no mint auth) | ✅ Explorer |
| x402 Payments | SystemProgram transfer | ✅ Explorer |
| NFT Transfers | SPL Token transfer | ✅ Explorer |
| Agent Actions | JSON execution log | ✅ GitHub |

## Tech Stack

- **Blockchain**: Solana (devnet → mainnet)
- **NFT Standard**: Metaplex / SPL Token
- **Payment**: x402 Protocol / SystemProgram
- **Frontend**: Vanilla HTML/JS, GSAP, Google Fonts
- **Agent**: Node.js autonomous runtime
- **Mobile**: Seeker SDK (roadmap)
- **Smart Contract**: Anchor framework (roadmap)

## Security Model

1. **Budget Caps**: Agents cannot spend more than user-defined limits
2. **NFT Verification**: Ownership checked before skill execution
3. **DAO Review**: Community vote required for skill listing (>50%)
4. **Automated Scan**: Contract analysis before listing
5. **Immutable Supply**: Mint authority removed after NFT creation
