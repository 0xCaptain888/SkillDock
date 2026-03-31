# ⚡ SkillDock — The App Store for AI Agents on Solana Mobile

> What if your AI agent could walk into a store, pick up a new skill, pay for it in SOL, and start using it — all without you lifting a finger?

**SkillDock** is a mobile-native Skill Store where every AI agent skill is an NFT, agents browse and purchase autonomously, and creators earn on every install.

🔗 **[Live Demo](https://0xcaptain888.github.io/SkillDock/)**

Built for the **Solana Agent Economy Hackathon: Agent Talent Show** — Track 2: Solana Mobile

---

## 🔗 On-Chain Verification (Solana Devnet)

All core components are deployed on Solana Devnet with real, verifiable transactions:

| Component | Type | Status |
|-----------|------|--------|
| SkillDock Collection NFT | SPL Token (supply=1) | ✅ Deployed |
| Skill NFTs (×6) | SPL Token (1-of-1, mint auth revoked) | ✅ Minted |
| x402 Agent Payment | SOL Transfer (Agent → Creator) | ✅ Verified |
| NFT Skill Transfer | SPL Token Transfer | ✅ Verified |
| Agent-to-Agent Payment | x402 Protocol | ✅ Verified |

> Run `node deploy-to-devnet.mjs` to reproduce the full deployment. All transaction hashes are logged to `deployment-results.json`.

### Agent Autonomous Execution

The SkillDock Agent operates fully autonomously:
```
Threat Detected ($FAKE) → Search SkillDock → Evaluate "Rug Shield" → Budget Check ✅
→ x402 Payment (0.8 SOL) → NFT Transfer → Skill Installed → Rug Pull Blocked
→ Saved 3.2 SOL | Cost 0.8 SOL | Net +2.4 SOL
```

See [`agent-execution-log.json`](./agent-execution-log.json) for the full execution trace.

### Technical Documentation

- 📐 [Architecture](./docs/ARCHITECTURE.md) — 4-layer system design
- 🔧 [Engineering Log](./docs/ENGINEERING_LOG.md) — Real debugging postmortems

---

## The Problem

Giving an AI agent a new capability today means:

- Finding the right tool or API manually
- Configuring and integrating it yourself
- No standard way for agents to discover skills
- No marketplace, no economy

On desktop, this is annoying. On mobile, it's a dead end.

## The Solution

SkillDock is a **Skill Store built for Solana Mobile** — specifically for the Seeker phone.

Think of it as the **App Store, but for AI Agent capabilities**.

### Core Design

| Feature | Description |
|---------|-------------|
| **Skills as NFTs** | Every agent skill is minted as a Metaplex NFT. Own the NFT = your agent can use that skill. Transfer, sell, or compose freely. |
| **Mobile-Native Distribution** | Integrated with Solana dApp Store. Push notifications on skill matches. One-tap install from Seeker. |
| **Agent Autonomy** | Agents browse SkillDock by themselves, find skills they need, purchase within user-set SOL budgets. |
| **Creator Economy** | Skill creators earn SOL on every install. On-chain royalties via Metaplex. Revenue sharing for composable bundles. |
| **x402 Agent Payments** | Agent-to-agent skill purchases via x402 protocol. Fully autonomous payment flow. |

---

## Architecture

```
📱 Seeker Mobile — Agent Runtime
       ↕
⚡ SkillDock SDK — Discovery & Install
       ↕
⬡ Skill NFT Program — On-Chain Registry
       ↕
◎ Solana L1 — Settlement & Ownership
```

**Tech Stack**: Solana · Metaplex NFT · x402 · Seeker SDK · MCP · OpenClaw · Jupiter · Anchor

---

## Demo Features

The interactive demo showcases the full SkillDock experience:

### 🏠 Discover
Browse and search agent skills by category (DeFi, Trading, Security, Analytics, Social, NFT). Featured skills, popular rankings, and new releases.

### 🔥 Trending
Real-time leaderboard of the most installed skills this week, with growth percentages.

### 🤖 My Agent
- **Agent Profile** — Equipped skills orbiting your agent avatar
- **Creator Earnings Dashboard** — 7-day revenue chart, total earnings, install count, weekly trend
- **Active Skills** — Live status of all running skills
- **Auto-Acquire Demo** — Watch your agent autonomously detect a need, search SkillDock, verify budget, purchase via x402, and self-install a skill in real-time

### ⚡ Live Feed
- **x402 Payment Visualization** — Animated agent-to-agent payment flow showing SOL transfer between agents
- **Storyline Feed** — A scripted narrative: Agent #7291 detects a suspicious token → auto-acquires Rug Shield → blocks a rug pull → exits safely → earns profit. All autonomous.
- **Real-time Updates** — New transactions appear automatically

### ⬡ Architecture
Technical deep-dive into the 4-layer architecture and 5 core mechanisms (NFT skills, mobile distribution, agent autonomy, creator economy, x402 payments).

### 📤 Publish
Full skill submission flow for creators:
- Basic info (name, description, category, icon)
- Pricing & royalties (SOL price, resale royalty slider via Metaplex)
- Technical details (MCP endpoint, tags, permissions)
- **Review Standards** — Security scan, permission audit, DAO vote >50%
- **Animated review pipeline** — Submit → Security Audit → DAO Review → NFT Mint & Go Live

### 🌐 Bilingual
Full Chinese/English support with auto-detection and manual toggle. Every piece of text in the app is translated.

---

## How Skills Get Listed

```
Creator submits skill via SkillDock SDK
        ↓
Automated security scan (contract analysis, permission check)
        ↓
DAO Review (community vote, >50% approval required)
        ↓
Skill NFT minted on Solana via Metaplex
        ↓
Listed on SkillDock store, push notifications sent to matching agents
```

Average review time: ~18 hours.

---

## x402 Agent-to-Agent Payments

SkillDock uses the **x402 payment protocol** for autonomous agent transactions:

1. Agent A needs a skill owned/created by Agent B
2. Agent A initiates x402 payment request
3. SOL transfers on Solana L1
4. Skill NFT license is granted
5. Agent A installs and begins using the skill

No human intervention required. The entire flow is governed by user-set budgets.

---

## Local Development

The demo is a single HTML file with no build step required.

```bash
# Clone
git clone https://github.com/0xCaptain888/SkillDock.git
cd SkillDock

# Serve locally
python3 -m http.server 8080
# Open http://localhost:8080
```

Dependencies (loaded via CDN):
- [GSAP 3.12](https://greensock.com/gsap/) — Animations
- [Canvas Confetti](https://github.com/catdad/canvas-confetti) — Install celebration effect
- [Google Fonts](https://fonts.google.com/) — Syne, DM Sans, JetBrains Mono

---

## Why Solana Mobile?

The hackathon asks: *"What happens when agent-native behavior meets mobile-native distribution?"*

Our answer: **A new economy is born.**

- Desktop agents live in terminals and browser tabs. They have no distribution.
- Mobile agents live in your pocket. They have push notifications, always-on connectivity, and the largest user base on earth.

When you put an agent on Seeker with access to SkillDock, it becomes a **self-upgrading entity** that gets better every day — and pays for its own upgrades with the SOL it earns.

**The agent economy needs a distribution layer. SkillDock is that layer.**

---

## Roadmap

- [ ] Smart contract deployment on Solana devnet
- [ ] Seeker SDK integration for push notifications
- [ ] Skill creator SDK & documentation
- [ ] First 10 skills onboarded from existing MCP ecosystem
- [ ] x402 payment integration for agent-to-agent purchases

---

## License

MIT

---

*Built for the Solana Agent Economy Hackathon: Agent Talent Show 🦞*
*Track 2: Solana Mobile*

*#AgentTalentShow*
