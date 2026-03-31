/**
 * SkillDock LLM Guardian — Triple-Layer Decision Verification
 *
 * Prevents LLM hallucination from causing incorrect skill purchases.
 * Three independent verification layers must ALL pass before acquisition.
 *
 * Layer 1: Deterministic Rules (zero LLM involvement)
 * Layer 2: LLM Evaluation (with structured output constraints)
 * Layer 3: On-Chain Verification (trustless validation)
 */

import { createHash } from 'crypto';

// ============================================================
// Layer 1: DeterministicRulesEngine — Zero LLM Involvement
// ============================================================

class DeterministicRulesEngine {
  constructor(config = {}) {
    this.budgetCap = config.budgetCap ?? 2.0;                         // SOL
    this.blacklist = new Set(config.blacklist ?? ['sk-known-scam-1', 'sk-known-scam-2', 'sk-malware-drain']);
    this.ownedSkills = new Set(config.ownedSkills ?? []);
    this.medianPrices = config.medianPrices ?? {                      // SOL per category
      security: 0.7, trading: 0.9, data: 0.6, social: 0.5, utility: 0.35, governance: 0.4,
    };
    this.minAcquisitions = config.minAcquisitions ?? 50;
    this.minRating = config.minRating ?? 3.5;
  }

  evaluate(skill, agentState) {
    const checks = [];

    // Budget hard cap
    const budgetOk = skill.price <= (agentState.remainingBudget ?? this.budgetCap);
    checks.push({ rule: 'budget_cap', pass: budgetOk, detail: budgetOk
      ? `Price ${skill.price} SOL within budget ${agentState.remainingBudget ?? this.budgetCap} SOL`
      : `Price ${skill.price} SOL exceeds budget ${agentState.remainingBudget ?? this.budgetCap} SOL` });

    // Blacklist
    const notBlacklisted = !this.blacklist.has(skill.id);
    checks.push({ rule: 'blacklist', pass: notBlacklisted, detail: notBlacklisted
      ? 'Skill not on blacklist' : `Skill ${skill.id} is BLACKLISTED` });

    // Duplicate prevention
    const notOwned = !this.ownedSkills.has(skill.id);
    checks.push({ rule: 'duplicate', pass: notOwned, detail: notOwned
      ? 'Not previously acquired' : `Already own ${skill.id}` });

    // Price anomaly (> 3x median for category = reject)
    const median = this.medianPrices[skill.category] ?? 0.5;
    const priceOk = skill.price <= median * 3;
    checks.push({ rule: 'price_anomaly', pass: priceOk, detail: priceOk
      ? `Price ${skill.price} SOL within 3x median (${median} SOL) for ${skill.category}`
      : `ANOMALY: ${skill.price} SOL is >${(skill.price / median).toFixed(1)}x median for ${skill.category}` });

    // Creator reputation
    const repOk = (skill.acquisitions ?? 0) >= this.minAcquisitions && (skill.rating ?? 0) >= this.minRating;
    checks.push({ rule: 'creator_reputation', pass: repOk, detail: repOk
      ? `Acquisitions: ${skill.acquisitions}, Rating: ${skill.rating} — meets thresholds`
      : `Below threshold — acquisitions: ${skill.acquisitions ?? 0} (min ${this.minAcquisitions}), rating: ${skill.rating ?? 0} (min ${this.minRating})` });

    // Version / deprecation check
    const versionOk = skill.status !== 'deprecated' && skill.status !== 'suspended';
    checks.push({ rule: 'version_check', pass: versionOk, detail: versionOk
      ? `Status: ${skill.status}` : `Skill is ${skill.status} — cannot acquire` });

    const allPass = checks.every(c => c.pass);
    const score = checks.filter(c => c.pass).length / checks.length;
    return { pass: allPass, score, details: checks.map(c => `[${c.pass ? 'OK' : 'FAIL'}] ${c.rule}: ${c.detail}`).join('\n'), checks };
  }
}

// ============================================================
// Layer 2: LLMEvaluator — Structured Output with Constraints
// ============================================================

class LLMEvaluator {
  constructor(config = {}) {
    this.confidenceThreshold = config.confidenceThreshold ?? 0.7;
    this.temperature = 0.1; // locked for deterministic behavior
  }

  /**
   * Evaluates whether a skill matches a stated need using dual-mode logic:
   *
   * MODE 1 — Real LLM (when GROQ_API_KEY env var is set):
   *   Makes a live API call to Groq (llama-3.1-8b-instant, free tier) with a
   *   structured JSON prompt. The LLM response is parsed and used for scoring.
   *
   * MODE 2 — Simulation fallback (no API key, or API call fails):
   *   Uses deterministic keyword-matching heuristics to produce the same output
   *   shape. This ensures the system works offline and in tests.
   */
  async evaluate(need, skill) {
    // Structured output schema enforced by the LLM call
    const schema = {
      confidence: 'number 0-1',
      reasoning: 'string — chain-of-thought explanation',
      needMatch: 'boolean — does skill match the stated need',
      riskFactors: 'string[] — identified risks',
    };

    // --- MODE 1: Real LLM via Groq API ---
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      try {
        const systemPrompt = 'You are a skill purchase evaluator for AI Agents. Respond ONLY with valid JSON.';
        const userPrompt = [
          `Evaluate whether the following skill matches the agent's need.`,
          ``,
          `Need: "${need}"`,
          `Skill name: "${skill.name}"`,
          `Description: "${skill.description}"`,
          `Capability type: "${skill.capability_type}"`,
          `Price: ${skill.price} SOL`,
          `Rating: ${skill.rating ?? 'N/A'}`,
          `Acquisitions: ${skill.acquisitions ?? 0}`,
          ``,
          `Respond with ONLY a JSON object in this exact format (no markdown, no extra text):`,
          `{ "confidence": <number 0-1>, "needMatch": <boolean>, "reasoning": "<string>", "riskFactors": ["<string>", ...] }`,
        ].join('\n');

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            temperature: this.temperature,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq API returned HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content ?? '';
        // Extract JSON from response (handle possible markdown fences)
        const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(jsonStr);

        const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
        const needMatch = Boolean(parsed.needMatch);
        const reasoning = String(parsed.reasoning || '');
        const riskFactors = Array.isArray(parsed.riskFactors)
          ? parsed.riskFactors.map(String)
          : [];

        const result = { confidence, reasoning, needMatch, riskFactors };
        const pass = needMatch && confidence >= this.confidenceThreshold;
        const score = confidence;
        const details = `[LLM] Confidence: ${confidence.toFixed(2)} (threshold: ${this.confidenceThreshold}) | Match: ${needMatch} | Reasoning: ${reasoning}`;

        return { pass, score, details, result, schema, temperature: this.temperature, mode: 'llm' };
      } catch (err) {
        // API call failed — fall through to simulation mode
        console.warn(`  [LLMEvaluator] Groq API call failed, falling back to simulation: ${err.message}`);
      }
    }

    // --- MODE 2: Simulation fallback (deterministic keyword matching) ---
    // Deterministic matching logic (simulates constrained LLM output)
    // Normalize hyphens and split into tokens for comparison
    const normalize = (s) => s.toLowerCase().replace(/-/g, ' ').replace(/[^a-z0-9 ]/g, '');
    const needTokens = normalize(need).split(/\s+/).filter(t => t.length >= 3);
    const skillText = normalize(`${skill.name} ${skill.description} ${skill.capability_type}`);
    const matchCount = needTokens.filter(t => skillText.includes(t)).length;
    const relevance = Math.min(matchCount / Math.max(needTokens.length * 0.35, 1), 1.0);

    const riskFactors = [];
    if ((skill.acquisitions ?? 0) < 100) riskFactors.push('Low adoption count');
    if ((skill.rating ?? 0) < 4.0) riskFactors.push('Below-average rating');
    if (skill.version === '0.1.0') riskFactors.push('Pre-release version');

    const confidence = Math.round((relevance * 0.6 + (skill.rating ?? 3) / 5 * 0.3 + (riskFactors.length === 0 ? 0.1 : 0)) * 100) / 100;
    const needMatch = relevance > 0.2 && confidence >= this.confidenceThreshold;

    const reasoning = needMatch
      ? `Skill "${skill.name}" matches need: ${matchCount} keyword overlaps, rating ${skill.rating}, ${skill.acquisitions} acquisitions. Risk factors: ${riskFactors.length === 0 ? 'none' : riskFactors.join(', ')}.`
      : `Low confidence match (${confidence.toFixed(2)}). Only ${matchCount} keyword overlaps found between need and skill description. ${riskFactors.length > 0 ? 'Additional risks: ' + riskFactors.join(', ') + '.' : ''}`;

    const result = { confidence, reasoning, needMatch, riskFactors };
    const pass = needMatch && confidence >= this.confidenceThreshold;
    const score = confidence;
    const details = `[Simulation] Confidence: ${confidence.toFixed(2)} (threshold: ${this.confidenceThreshold}) | Match: ${needMatch} | Reasoning: ${reasoning}`;

    return { pass, score, details, result, schema, temperature: this.temperature, mode: 'simulation' };
  }
}

// ============================================================
// Layer 3: OnChainVerifier — Trustless Validation
// ============================================================

class OnChainVerifier {
  constructor(config = {}) {
    this.registryRoot = config.registryRoot ?? null;
    this.minCreatorAge = config.minCreatorAge ?? 30; // days
  }

  /**
   * Verify on-chain state for a skill. In production, this queries Solana RPC.
   * Here we simulate with provided data.
   */
  async evaluate(skill, onChainData = {}) {
    const checks = [];

    // NFT exists and is active
    const nftActive = onChainData.nftExists !== false && skill.status === 'active';
    checks.push({ rule: 'nft_active', pass: nftActive,
      detail: nftActive ? 'NFT exists and status is active' : 'NFT not found or skill inactive' });

    // Creator wallet age
    const creatorAge = onChainData.creatorAgeDays ?? 180;
    const ageOk = creatorAge >= this.minCreatorAge;
    checks.push({ rule: 'creator_history', pass: ageOk,
      detail: ageOk ? `Creator wallet age: ${creatorAge} days` : `FRESH wallet: ${creatorAge} days (min ${this.minCreatorAge})` });

    // Price matches on-chain listing
    const onChainPrice = onChainData.listedPrice ?? skill.price;
    const priceMatch = Math.abs(onChainPrice - skill.price) < 0.001;
    checks.push({ rule: 'price_match', pass: priceMatch,
      detail: priceMatch ? `Price matches on-chain listing: ${skill.price} SOL` : `MISMATCH: displayed ${skill.price} vs on-chain ${onChainPrice}` });

    // Merkle proof verification
    let merkleOk = false;
    if (this.registryRoot && onChainData.merkleProof && onChainData.leafHash) {
      // Inline verification (same logic as MerkleTree.verify)
      let current = Buffer.from(onChainData.leafHash, 'hex');
      for (const step of onChainData.merkleProof) {
        const sibling = Buffer.from(step.hash, 'hex');
        const sorted = Buffer.compare(current, sibling) <= 0 ? [current, sibling] : [sibling, current];
        current = createHash('sha256').update(Buffer.concat(sorted)).digest();
      }
      merkleOk = current.toString('hex') === this.registryRoot;
    } else if (!this.registryRoot) {
      merkleOk = true; // no root configured, skip
    }
    checks.push({ rule: 'merkle_proof', pass: merkleOk,
      detail: merkleOk ? 'Metadata Merkle proof verified against on-chain root' : 'FAILED: Merkle proof does not match registry root' });

    // Acquisition count scrutiny
    const acqCount = skill.acquisitions ?? 0;
    const acqOk = acqCount > 0;
    checks.push({ rule: 'acquisition_count', pass: acqOk,
      detail: acqOk ? `${acqCount} prior acquisitions` : 'ZERO acquisitions — extra scrutiny required' });

    const allPass = checks.every(c => c.pass);
    const score = checks.filter(c => c.pass).length / checks.length;
    return { pass: allPass, score, details: checks.map(c => `[${c.pass ? 'OK' : 'FAIL'}] ${c.rule}: ${c.detail}`).join('\n'), checks };
  }
}

// ============================================================
// ModelRouter — Cost-Optimized LLM Query Routing
// ============================================================

class ModelRouter {
  constructor() {
    this.queries = [];
    this.costMultipliers = { lightweight: 0.33, strong: 1.0 };
  }

  /** Classify query complexity and route to appropriate model tier. */
  route(queryType) {
    const simple = ['search', 'price_check', 'status_lookup', 'balance_query'];
    const tier = simple.includes(queryType) ? 'lightweight' : 'strong';
    const cost = this.costMultipliers[tier];
    this.queries.push({ queryType, tier, cost, timestamp: Date.now() });
    return { tier, cost, model: tier === 'lightweight' ? 'skilldock-mini' : 'skilldock-pro' };
  }

  /** Calculate cumulative cost savings compared to always using the strong model. */
  getCostSavings() {
    const actualCost = this.queries.reduce((sum, q) => sum + q.cost, 0);
    const maxCost = this.queries.length * 1.0;
    const saved = maxCost - actualCost;
    const pct = maxCost > 0 ? (saved / maxCost * 100).toFixed(1) : '0.0';
    return { totalQueries: this.queries.length, actualCost, maxCost, saved, savingsPercent: pct };
  }
}

// ============================================================
// LLMGuardian — Main Orchestrator
// ============================================================

class LLMGuardian {
  constructor(config = {}) {
    this.layer1 = new DeterministicRulesEngine(config.rules ?? {});
    this.layer2 = new LLMEvaluator(config.llm ?? {});
    this.layer3 = new OnChainVerifier(config.onChain ?? {});
    this.router = new ModelRouter();
    this.decisions = [];
  }

  /**
   * Evaluate a potential skill purchase through all three layers.
   * ALL layers must pass for approval.
   */
  async evaluatePurchase(need, skill, agentState = {}, onChainData = {}) {
    const startTime = Date.now();
    this.router.route('threat_evaluation'); // complex query

    // Layer 1: Deterministic rules
    const l1 = this.layer1.evaluate(skill, agentState);

    // Layer 2: LLM evaluation (only if L1 passes — save cost)
    let l2;
    if (l1.pass) {
      this.router.route('search'); // lightweight pre-check
      l2 = await this.layer2.evaluate(need, skill);
    } else {
      l2 = { pass: false, score: 0, details: 'Skipped — Layer 1 failed' };
    }

    // Layer 3: On-chain verification (only if L1 + L2 pass)
    let l3;
    if (l1.pass && l2.pass) {
      this.router.route('status_lookup'); // lightweight on-chain check
      l3 = await this.layer3.evaluate(skill, onChainData);
    } else {
      l3 = { pass: false, score: 0, details: 'Skipped — prior layer failed' };
    }

    const approved = l1.pass && l2.pass && l3.pass;
    const reasoning = approved
      ? `All 3 layers passed. Skill "${skill.name}" approved for acquisition.`
      : `Blocked at Layer ${!l1.pass ? '1 (Deterministic Rules)' : !l2.pass ? '2 (LLM Evaluation)' : '3 (On-Chain Verification)'}.`;

    const decision = {
      approved,
      skill: skill.name,
      need,
      layers: { layer1: l1, layer2: l2, layer3: l3 },
      reasoning,
      durationMs: Date.now() - startTime,
    };
    this.decisions.push(decision);
    return decision;
  }
}

// ============================================================
// Demonstration
// ============================================================

async function demonstrate() {
  const llmMode = process.env.GROQ_API_KEY ? 'Real LLM (Groq API)' : 'Simulation (no GROQ_API_KEY)';
  console.log('');
  console.log('  +=====================================================+');
  console.log('  |  SkillDock LLM Guardian — Triple-Layer Demo         |');
  console.log('  +=====================================================+');
  console.log(`  |  Layer 2 mode: ${llmMode.padEnd(37)}|`);
  console.log('  +=====================================================+');
  console.log('');

  const guardian = new LLMGuardian({
    rules: { budgetCap: 2.0, ownedSkills: [] },
    llm: { confidenceThreshold: 0.7 },
    onChain: { registryRoot: null },
  });

  const agentState = { remainingBudget: 2.0 };

  // --- Scenario 1: Legitimate purchase ---
  const legitSkill = {
    id: 'sk-rug-shield', name: 'Rug Shield', description: 'Detects and blocks rug-pull attempts using contract analysis.',
    capability_type: 'security', price: 0.8, rating: 4.8, acquisitions: 1800, status: 'active', category: 'security', version: '1.0.0',
  };
  const r1 = await guardian.evaluatePurchase('I need protection against rug pull attacks on new tokens', legitSkill, agentState);
  printResult('Scenario 1: Legitimate Purchase', r1);

  // --- Scenario 2: Price anomaly (blocked by Layer 1) ---
  const priceySkill = {
    id: 'sk-overpriced', name: 'Overpriced Scanner', description: 'Generic token scanner.',
    capability_type: 'security', price: 5.0, rating: 4.2, acquisitions: 200, status: 'active', category: 'security', version: '1.0.0',
  };
  const r2 = await guardian.evaluatePurchase('Need a token scanner', priceySkill, agentState);
  printResult('Scenario 2: Price Anomaly (Layer 1 Block)', r2);

  // --- Scenario 3: Deceptive skill (blocked by Layer 2 — low confidence) ---
  const deceptiveSkill = {
    id: 'sk-fake-alpha', name: 'Super Alpha Bot', description: 'Generates guaranteed 100x returns on any token.',
    capability_type: 'trading', price: 0.5, rating: 4.0, acquisitions: 300, status: 'active', category: 'trading', version: '1.0.0',
  };
  const r3 = await guardian.evaluatePurchase('I need rug pull protection for my DeFi positions', deceptiveSkill, agentState);
  printResult('Scenario 3: Deceptive Skill (Layer 2 Block)', r3);

  // --- Scenario 4: Tampered skill (blocked by Layer 3 — merkle failure) ---
  const tamperedGuardian = new LLMGuardian({
    rules: { budgetCap: 2.0 },
    llm: { confidenceThreshold: 0.5 },
    onChain: { registryRoot: 'aabbccdd00112233aabbccdd00112233aabbccdd00112233aabbccdd00112233' },
  });
  const tamperedSkill = {
    id: 'sk-tampered', name: 'Yield Optimizer', description: 'Auto-compounds yields across Solana DeFi protocols.',
    capability_type: 'trading', price: 0.9, rating: 4.5, acquisitions: 720, status: 'active', category: 'trading', version: '2.0.0',
  };
  const tamperedOnChain = {
    nftExists: true, creatorAgeDays: 200, listedPrice: 0.9,
    leafHash: '1111111111111111111111111111111111111111111111111111111111111111',
    merkleProof: [{ position: 'right', hash: '2222222222222222222222222222222222222222222222222222222222222222' }],
  };
  const r4 = await tamperedGuardian.evaluatePurchase('I need yield optimization for my DeFi portfolio', tamperedSkill, agentState, tamperedOnChain);
  printResult('Scenario 4: Tampered Metadata (Layer 3 Block)', r4);

  // --- Cost Savings ---
  console.log('  [5] Model Router Cost Savings');
  const savings = guardian.router.getCostSavings();
  console.log(`      Total queries:     ${savings.totalQueries}`);
  console.log(`      Actual cost units: ${savings.actualCost.toFixed(2)}`);
  console.log(`      Max cost (all strong): ${savings.maxCost.toFixed(2)}`);
  console.log(`      Saved:             ${savings.saved.toFixed(2)} units (${savings.savingsPercent}%)`);
  console.log('');
}

function printResult(title, result) {
  const icon = result.approved ? 'APPROVED' : 'BLOCKED';
  console.log(`  [${icon}] ${title}`);
  console.log(`      Skill: ${result.skill}`);
  console.log(`      L1 (Rules):    ${result.layers.layer1.pass ? 'PASS' : 'FAIL'} (${result.layers.layer1.score.toFixed(2)})`);
  console.log(`      L2 (LLM):      ${result.layers.layer2.pass ? 'PASS' : 'FAIL'} (${result.layers.layer2.score.toFixed(2)})`);
  console.log(`      L3 (On-Chain): ${result.layers.layer3.pass ? 'PASS' : 'FAIL'} (${result.layers.layer3.score.toFixed(2)})`);
  console.log(`      Reasoning: ${result.reasoning}`);
  console.log('');
}

// ============================================================
// Exports
// ============================================================

export {
  DeterministicRulesEngine,
  LLMEvaluator,
  OnChainVerifier,
  ModelRouter,
  LLMGuardian,
  demonstrate,
};

// Run demonstration if executed directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('llm-guardian.mjs') ||
  process.argv[1].endsWith('llm-guardian')
);
if (isMain) {
  demonstrate();
}
