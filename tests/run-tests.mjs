/**
 * SkillDock Test Suite
 * Validates Merkle Verifier, LLM Guardian, and integration correctness.
 */

import { MerkleTree, SkillMetadataVerifier, SKILLDOCK_SKILLS } from '../src/merkle-verifier.mjs';
import { DeterministicRulesEngine, LLMEvaluator, OnChainVerifier, LLMGuardian, ModelRouter } from '../src/llm-guardian.mjs';
import { RugShieldSkill } from '../src/skills/rug-shield.mjs';
import { SnipeGuardSkill } from '../src/skills/snipe-guard.mjs';
import { AlphaDecoderSkill } from '../src/skills/alpha-decoder.mjs';
import { createHash } from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    console.log(`  ❌ ${testName}`);
  }
}

console.log('');
console.log('  ╔═══════════════════════════════════════════════════╗');
console.log('  ║  SkillDock Test Suite                             ║');
console.log('  ╚═══════════════════════════════════════════════════╝');
console.log('');

// ============================================================
// Merkle Verifier Tests
// ============================================================
console.log('  ── Merkle Verifier ────────────────────────────────');

// Test 1: Tree construction
const verifier = new SkillMetadataVerifier(SKILLDOCK_SKILLS);
const root = verifier.getRegistryRoot();
assert(typeof root === 'string' && root.length === 64, 'Merkle root is 64-char hex string');

// Test 2: All skills verify
const allProofs = verifier.exportProofs();
const allVerified = allProofs.every(p => MerkleTree.verify(p.leafHash, p.proof, p.root));
assert(allVerified, 'All 6 skills pass Merkle verification');

// Test 3: Individual skill verification
const rugResult = verifier.verifySkill('sk-rug-shield');
assert(rugResult.verified === true, 'Rug Shield verifies individually');

// Test 4: Unknown skill returns false
const unknownResult = verifier.verifySkill('sk-nonexistent');
assert(unknownResult.verified === false, 'Unknown skill ID returns verified=false');

// Test 5: Tamper detection
const tampered = { ...SKILLDOCK_SKILLS[0], price_lamports: 1 };
const tamperedLeaf = MerkleTree.hashLeaf(tampered).toString('hex');
const originalProof = verifier.tree.getProof(0);
const tamperCheck = MerkleTree.verify(tamperedLeaf, originalProof, root);
assert(tamperCheck === false, 'Tampered metadata fails verification');

// Test 6: Deterministic root (same data = same root)
const verifier2 = new SkillMetadataVerifier(SKILLDOCK_SKILLS);
assert(verifier2.getRegistryRoot() === root, 'Deterministic: same skills produce same root');

// Test 7: Different data = different root
const modifiedSkills = [...SKILLDOCK_SKILLS];
modifiedSkills[0] = { ...modifiedSkills[0], price_lamports: 999 };
const verifier3 = new SkillMetadataVerifier(modifiedSkills);
assert(verifier3.getRegistryRoot() !== root, 'Modified data produces different root');

console.log('');

// ============================================================
// LLM Guardian Tests
// ============================================================
console.log('  ── LLM Guardian ──────────────────────────────────');

// Test 8: Layer 1 — budget check
const rules = new DeterministicRulesEngine({ budgetCap: 1.0 });
const overBudget = rules.evaluate(
  { id: 'x', price: 5.0, acquisitions: 200, rating: 4.5, status: 'active', category: 'security' },
  { remainingBudget: 1.0 }
);
assert(overBudget.pass === false, 'Layer 1 blocks over-budget purchase');

// Test 9: Layer 1 — blacklist
const blacklisted = rules.evaluate(
  { id: 'sk-known-scam-1', price: 0.5, acquisitions: 200, rating: 4.5, status: 'active', category: 'security' },
  { remainingBudget: 2.0 }
);
assert(blacklisted.pass === false, 'Layer 1 blocks blacklisted skill');

// Test 10: Layer 1 — deprecated skill
const deprecated = rules.evaluate(
  { id: 'x', price: 0.5, acquisitions: 200, rating: 4.5, status: 'deprecated', category: 'security' },
  { remainingBudget: 2.0 }
);
assert(deprecated.pass === false, 'Layer 1 blocks deprecated skill');

// Test 11: Layer 1 — legitimate skill passes
const legit = rules.evaluate(
  { id: 'sk-ok', price: 0.8, acquisitions: 1800, rating: 4.8, status: 'active', category: 'security' },
  { remainingBudget: 2.0 }
);
assert(legit.pass === true, 'Layer 1 passes legitimate skill');

// Test 12: Layer 2 — high confidence match
const llm = new LLMEvaluator({ confidenceThreshold: 0.7 });
const goodMatch = await llm.evaluate(
  'I need rug pull protection',
  { name: 'Rug Shield', description: 'Detects and blocks rug-pull attempts using contract analysis.', capability_type: 'security', rating: 4.8, acquisitions: 1800, version: '1.0.0' }
);
assert(goodMatch.pass === true, 'Layer 2 passes high-confidence match');

// Test 13: Layer 2 — low confidence mismatch
const badMatch = await llm.evaluate(
  'I need rug pull protection',
  { name: 'Super Alpha Bot', description: 'Generates guaranteed 100x returns on any token.', capability_type: 'trading', rating: 4.0, acquisitions: 300, version: '1.0.0' }
);
assert(badMatch.pass === false, 'Layer 2 blocks low-confidence mismatch');

// Test 14: Layer 3 — Merkle proof failure
const onChainV = new OnChainVerifier({ registryRoot: 'aabbccdd00112233aabbccdd00112233aabbccdd00112233aabbccdd00112233' });
const merkleFailResult = await onChainV.evaluate(
  { status: 'active', acquisitions: 100, price: 0.8 },
  {
    nftExists: true, creatorAgeDays: 200, listedPrice: 0.8,
    leafHash: '1111111111111111111111111111111111111111111111111111111111111111',
    merkleProof: [{ position: 'right', hash: '2222222222222222222222222222222222222222222222222222222222222222' }],
  }
);
assert(merkleFailResult.pass === false, 'Layer 3 blocks invalid Merkle proof');

// Test 15: Full Guardian — approved flow
const guardian = new LLMGuardian({
  rules: { budgetCap: 2.0 },
  llm: { confidenceThreshold: 0.7 },
  onChain: { registryRoot: null },
});
const fullResult = await guardian.evaluatePurchase(
  'I need protection against rug pull attacks',
  { id: 'sk-test', name: 'Rug Shield', description: 'Detects and blocks rug-pull attempts using contract analysis.', capability_type: 'security', price: 0.8, rating: 4.8, acquisitions: 1800, status: 'active', category: 'security', version: '1.0.0' },
  { remainingBudget: 2.0 }
);
assert(fullResult.approved === true, 'Full Guardian approves legitimate purchase');

// Test 16: Model Router cost savings
const router = new ModelRouter();
router.route('search');        // lightweight
router.route('search');        // lightweight
router.route('threat_evaluation'); // strong
router.route('balance_query'); // lightweight
const routerSavings = router.getCostSavings();
assert(parseFloat(routerSavings.savingsPercent) > 0, 'Model Router reports positive cost savings');
assert(routerSavings.actualCost < routerSavings.maxCost, 'Router actual cost < max cost');

console.log('');

// ============================================================
// Price Anomaly Category Regression Test
// ============================================================
console.log('  ── Regression Tests ───────────────────────────────');

// Test 17: Category-specific price anomaly (Postmortem #7)
const catRules = new DeterministicRulesEngine({
  budgetCap: 2.0,
  medianPrices: { security: 0.7, utility: 0.35 },
});
const cheapUtility = catRules.evaluate(
  { id: 'x', price: 0.25, acquisitions: 1550, rating: 4.4, status: 'active', category: 'utility' },
  { remainingBudget: 2.0 }
);
assert(cheapUtility.pass === true, 'Cheap utility skill (0.25 SOL) not falsely flagged as price anomaly');

// Test 18: Actual price anomaly still caught
const anomaly = catRules.evaluate(
  { id: 'x', price: 5.0, acquisitions: 200, rating: 4.2, status: 'active', category: 'security' },
  { remainingBudget: 10.0 }
);
assert(anomaly.pass === false, 'Overpriced security skill (5.0 SOL, median 0.7) correctly flagged');

console.log('');

// ============================================================
// Executable Skill Module Tests
// ============================================================
console.log('  ── Executable Skills ──────────────────────────────');

// Test 19: RugShield — safe contract
const rugSkill = new RugShieldSkill();
const safeContract = rugSkill.analyze({ hasMintFunction: false, maxSellPct: 100, sellTaxPct: 2, lpLocked: true, lpLockDays: 365, ownerRenounced: true, isProxy: false });
assert(safeContract.riskLevel === 'SAFE' && safeContract.score === 0, 'RugShield: safe contract returns SAFE (0/100)');

// Test 20: RugShield — rug-pull contract
const rugContract = rugSkill.analyze({ hasMintFunction: true, mintCapped: false, maxSellPct: 100, sellTaxPct: 0, lpLocked: false, lpLockDays: 0, ownerRenounced: false, isProxy: false });
assert(rugContract.riskLevel === 'CRITICAL' && rugContract.score >= 70, 'RugShield: rug-pull contract returns CRITICAL (>=70)');
assert(rugContract.findings.length >= 2, 'RugShield: rug-pull has >=2 findings');

// Test 21: SnipeGuard — safe trade
const snipeSkill = new SnipeGuardSkill();
const safeTrade = snipeSkill.analyze({ dexRouter: 'Jupiter', slippagePct: 0.5, poolLiquidityUsd: 5000000, tradeAmountUsd: 100, mempoolVisible: false, priorityFee: 50000, recentSandwiches: 0 });
assert(safeTrade.riskLevel === 'SAFE' && safeTrade.score === 0, 'SnipeGuard: safe trade returns SAFE (0/100)');

// Test 22: SnipeGuard — sandwich target
const dangerTrade = snipeSkill.analyze({ dexRouter: 'Raydium', slippagePct: 12, poolLiquidityUsd: 35000, tradeAmountUsd: 2500, mempoolVisible: true, priorityFee: 5000, recentSandwiches: 7 });
assert(dangerTrade.riskLevel === 'CRITICAL' && dangerTrade.score >= 70, 'SnipeGuard: sandwich target returns CRITICAL (>=70)');

// Test 23: AlphaDecoder — strong alpha signal
const alphaSkill = new AlphaDecoderSkill();
const strongAlpha = alphaSkill.analyze({ whaleNetFlow: 420000, volume7dAvg: 180000, currentVolume: 936000, smartMoneyWallets: 4, socialMentions24h: 820, socialMentionsPrior: 200 });
assert(strongAlpha.signal === 'STRONG_BUY' || strongAlpha.signal === 'BUY', 'AlphaDecoder: strong alpha returns BUY or STRONG_BUY');
assert(strongAlpha.confidence > 0.5, 'AlphaDecoder: strong alpha has confidence > 0.5');

// Test 24: AlphaDecoder — distribution signal
const sellSignal = alphaSkill.analyze({ whaleNetFlow: -350000, volume7dAvg: 200000, currentVolume: 100000, smartMoneyWallets: 0, socialMentions24h: 80, socialMentionsPrior: 200 });
assert(sellSignal.signal === 'SELL' || sellSignal.signal === 'NEUTRAL', 'AlphaDecoder: distribution returns SELL or NEUTRAL');

// Test 25: Skill modules have SAP-1 metadata
assert(RugShieldSkill.describe().protocol === 'SAP-1', 'RugShield has SAP-1 protocol metadata');
assert(SnipeGuardSkill.describe().protocol === 'SAP-1', 'SnipeGuard has SAP-1 protocol metadata');
assert(AlphaDecoderSkill.describe().protocol === 'SAP-1', 'AlphaDecoder has SAP-1 protocol metadata');

console.log('');

// ============================================================
// Guardian Integration — BLOCK Scenario
// ============================================================
console.log('  ── Guardian BLOCK Scenarios ───────────────────────');

// Test 26: Guardian blocks overpriced skill (full pipeline)
const guardianBlock = new LLMGuardian({
  rules: { budgetCap: 2.0, medianPrices: { security: 0.7 } },
  llm: { confidenceThreshold: 0.7 },
  onChain: { registryRoot: null },
});
const blockedResult = await guardianBlock.evaluatePurchase(
  'I need security protection',
  { id: 'sk-overpriced', name: 'Overpriced Scanner', description: 'Generic token scanner.', capability_type: 'security', price: 5.0, rating: 4.2, acquisitions: 200, status: 'active', category: 'security', version: '1.0.0' },
  { remainingBudget: 2.0 }
);
assert(blockedResult.approved === false, 'Guardian BLOCKS overpriced skill (5.0 SOL, budget 2.0)');
assert(blockedResult.reasoning.includes('Layer 1'), 'Guardian identifies Layer 1 as blocking layer');

// Test 27: Guardian blocks when budget exhausted
const guardianBudget = new LLMGuardian({
  rules: { budgetCap: 1.5 },
  llm: { confidenceThreshold: 0.7 },
  onChain: { registryRoot: null },
});
const budgetBlocked = await guardianBudget.evaluatePurchase(
  'I need rug protection',
  { id: 'sk-rug-shield', name: 'Rug Shield', description: 'Detects rug-pull attempts.', capability_type: 'security', price: 0.8, rating: 4.8, acquisitions: 1800, status: 'active', category: 'security', version: '1.0.0' },
  { remainingBudget: 0.3 }
);
assert(budgetBlocked.approved === false, 'Guardian BLOCKS when budget exhausted (0.3 SOL < 0.8 price)');

console.log('');
const total = passed + failed;
console.log('  ═══════════════════════════════════════════════════');
console.log(`  Results: ${passed}/${total} passed, ${failed} failed`);
console.log('  ═══════════════════════════════════════════════════');
console.log('');

if (failed > 0) {
  process.exit(1);
}
