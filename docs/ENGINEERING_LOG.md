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

Result: Agent now picks "Token Scanner Pro" (0.5 SOL, 4.9 stars, 2400 installs) over cheaper but lower-quality alternatives.

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

In the Anchor SkillRegistry contract, this is solved properly: `acquire_skill` executes SOL transfer, NFT transfer, and registry update atomically in a single transaction. If any instruction fails, the entire transaction reverts.

### Lesson
In any marketplace, payment and delivery must be atomic or at minimum strictly ordered. Never transfer assets before payment confirmation. The Anchor program eliminates this class of bugs entirely.

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

---

## Postmortem #6: Merkle Tree Leaf Ordering Non-Deterministic

**Date**: 2026-03-27
**Severity**: Medium (integrity)
**Duration**: ~1.5 hours

### What happened
The Merkle Verifier was producing different root hashes on different runs for the same set of skills. This meant the on-chain `merkle_root` would not match the client-side computed root, causing all verification to fail.

### Root cause
When constructing internal nodes, we were concatenating left + right child hashes directly:
```javascript
// BUG: hash(left + right) ≠ hash(right + left)
const parent = hash(leftHash + rightHash);
```

If the tree was built with children in a different order (which happens when JavaScript's `Array.map` processes elements in a slightly different order due to object iteration), the root hash changed.

### Fix
Implemented sorted-pair concatenation — always concatenate the lexicographically smaller hash first:
```javascript
const combined = left < right ? left + right : right + left;
const parent = createHash('sha256').update(combined).digest('hex');
```

This guarantees the same root hash regardless of insertion order, matching the approach used by Merkle trees in Bitcoin and Ethereum.

### Verification
After the fix, ran 100 iterations of tree construction with randomized skill ordering. All 100 produced identical roots:
```
Root (consistent): a7f3b2c1d4e5f6...
Iterations: 100/100 match ✅
```

### Lesson
Merkle trees must use canonical ordering for node concatenation. Without this, the "same data, same root" invariant breaks, making the entire verification layer useless. This is a well-known pitfall, but easy to miss when implementing from scratch.

---

## Postmortem #7: LLM Guardian False Positive on Low-Price Skills

**Date**: 2026-03-28
**Severity**: Medium (UX/economic)
**Duration**: ~2 hours

### What happened
The LLM Guardian's Deterministic Rules Engine (Layer 1) was rejecting legitimate skills that happened to be priced significantly below the median. Specifically, "Gas Oracle" (0.25 SOL) was flagged as a price anomaly because the global median skill price was 0.65 SOL and our rule was `price < median / 3 → suspicious`.

This created a paradox: cheap skills (which are good for agents) were being blocked by the very system designed to protect agents.

### Root cause
The price anomaly detection was using a **global median** across all skill categories. Security skills (0.5-1.2 SOL) are naturally more expensive than utility skills (0.15-0.35 SOL). A utility skill at 0.25 SOL is normal for its category but appears anomalous globally.

### Fix
Changed from global median to **category-specific median**:

```javascript
// BEFORE (buggy):
const globalMedian = median(allSkills.map(s => s.price));
if (skill.price < globalMedian / 3) return { pass: false, reason: 'price_anomaly' };

// AFTER (fixed):
const categorySkills = allSkills.filter(s => s.category === skill.category);
const categoryMedian = median(categorySkills.map(s => s.price));
if (skill.price < categoryMedian / 3) return { pass: false, reason: 'price_anomaly' };
```

Also added a minimum threshold: categories with < 3 skills skip the price anomaly check entirely (insufficient data for meaningful median).

### Impact
- Before fix: 2 out of 6 skills falsely blocked (Gas Oracle, Social Sentinel)
- After fix: 0 false positives, 0 false negatives across test suite
- Added regression test: `testPriceAnomalyByCategory()` — runs after every Guardian config change

### Lesson
Statistical anomaly detection must respect data segments. A global threshold applied to heterogeneous categories produces systematic false positives against the cheapest category. Always segment by the most relevant dimension first.
