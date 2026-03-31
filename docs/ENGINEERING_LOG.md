# SkillDock — Engineering Postmortems

Real debugging stories from building SkillDock. Documenting failures is part of the process.

---

## Postmortem #1: Devnet Airdrop Rate Limiting

**Date**: 2026-03-24
**Severity**: Blocking
**Duration**: ~2 hours

### What happened
During the deployment script development, we needed to fund 3 wallets (deployer, agent, creator) with SOL on devnet. After the first few airdrops, all subsequent requests returned `429 Too Many Requests`.

### Root cause
Solana's devnet faucet has an IP-based rate limit. When running from cloud environments (CI, sandbox), the shared IP quickly exhausts the limit. The error message: `"You've either reached your airdrop limit today or the airdrop faucet has run dry."`

### Fix
1. Implemented exponential backoff: 8 retries with increasing delays (3s, 6s, 9s...)
2. Reduced airdrop amounts from 2 SOL to 1 SOL per request
3. Added a 1.5s delay between successful airdrops
4. Documented fallback: manual faucet at https://faucet.solana.com

### Lesson
Always design for rate-limited infrastructure. Never assume cloud providers give you a clean IP.

---

## Postmortem #2: NFT Mint Authority Not Removed

**Date**: 2026-03-24
**Severity**: Critical (security)
**Duration**: ~30 minutes

### What happened
After minting Skill NFTs, we noticed that the mint authority was still set to the deployer address. This means the deployer could theoretically mint additional copies, breaking the 1-of-1 guarantee.

### Root cause
`createMint()` from `@solana/spl-token` requires an explicit call to remove mint authority after minting. The `mintTo()` function does not automatically revoke it.

### Fix
Added a post-mint step:
```javascript
const rmAuth = createSetAuthorityInstruction(
  skillMint,
  deployer.publicKey,
  AuthorityType.MintTokens,
  null  // Set to null = irrevocable
);
```

This makes each skill NFT genuinely immutable — no more tokens can ever be minted.

### Lesson
In NFT systems, always verify that mint authority is explicitly revoked. A "1-of-1" claim means nothing if the supply can be inflated.

---

## Postmortem #3: Agent Skill Search Ranking

**Date**: 2026-03-25
**Severity**: Medium (UX)
**Duration**: ~1 hour

### What happened
During testing, the agent always purchased the cheapest skill regardless of quality. When a 0.3 SOL skill with 3.5 stars existed alongside a 0.5 SOL skill with 4.9 stars, the agent picked the cheaper one.

### Root cause
Initial implementation sorted by price only: `skills.sort((a, b) => a.price - b.price)`

### Fix
Designed a composite scoring function:
```javascript
score = relevanceCount × rating × (1 / price)
```

This balances three factors:
- **Relevance**: How many of the agent's needed tags match
- **Quality**: Community rating (proxy for reliability)
- **Cost**: Lower price is better, but weighted against quality

Result: Agent now picks "Token Scanner Pro" (0.5 SOL, ★4.9, 2400 installs) over cheaper but lower-quality alternatives.

### Lesson
Agent decision-making must model real-world trade-offs, not just optimize for a single variable. The cheapest option is rarely the best option.

---

## Postmortem #4: x402 Payment Ordering

**Date**: 2026-03-25
**Severity**: High (logic)
**Duration**: ~45 minutes

### What happened
During the auto-acquire flow, we initially transferred the NFT before the SOL payment was confirmed. In a failure scenario, the creator could lose the NFT without receiving payment.

### Root cause
Async transaction handling — the NFT transfer was not gated on payment confirmation.

### Fix
Enforced strict ordering:
1. Execute SOL payment transaction
2. Wait for `confirmed` commitment level
3. Only then initiate NFT transfer
4. Log both transaction signatures for audit trail

In production, this should be an atomic swap using an escrow program. Current implementation relies on honest-party assumption (acceptable for devnet demo).

### Lesson
In any marketplace, payment and delivery must be atomic or at minimum strictly ordered. Never transfer assets before payment confirmation.

---

## Postmortem #5: Bilingual Toggle State Persistence

**Date**: 2026-03-23
**Severity**: Low (UX)
**Duration**: ~20 minutes

### What happened
Users who switched to Chinese mode would see English again on page refresh.

### Root cause
The language toggle was updating the DOM but not persisting the preference.

### Fix
Added `localStorage` persistence:
```javascript
localStorage.setItem('skilldock-lang', lang);
// On load:
const savedLang = localStorage.getItem('skilldock-lang') || 'en';
```

### Lesson
Any user preference that involves explicit user action must persist across sessions.
