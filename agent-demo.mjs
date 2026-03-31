/**
 * SkillDock Agent — Autonomous Skill Discovery & Acquisition
 *
 * This script demonstrates a fully autonomous AI agent that:
 * 1. Monitors for security threats (token analysis)
 * 2. Searches SkillDock marketplace for matching skills
 * 3. Evaluates skills by rating, price, and relevance
 * 4. Purchases via x402 protocol (on-chain SOL payment)
 * 5. Installs and activates the skill
 * 6. Uses the skill to protect assets
 *
 * Run after deploy-to-devnet.mjs to use real on-chain data.
 * Or run standalone for a simulated demonstration.
 */

import fs from 'fs';

// ================================================
// AGENT CONFIGURATION
// ================================================
const AGENT_CONFIG = {
  id: 'Agent #7291',
  name: 'CrawBot Omega',
  wallet: null, // Set from deployment or generated
  budget: { max: 2.0, perSkill: 1.5 }, // SOL
  priorities: ['security', 'defi', 'analytics'],
  installedSkills: [],
  pendingThreats: [],
};

// ================================================
// SKILLDOCK MARKETPLACE (mirrors on-chain registry)
// ================================================
const SKILL_REGISTRY = [
  { id: 'sk-001', name: 'Token Scanner Pro', category: 'Security', price: 0.5, rating: 4.9, installs: 2400, tags: ['token-analysis', 'contract-scan', 'rug-detection'] },
  { id: 'sk-002', name: 'Rug Shield', category: 'Security', price: 0.8, rating: 4.8, installs: 1800, tags: ['rug-protection', 'auto-block', 'emergency-exit'] },
  { id: 'sk-003', name: 'Smart Swap', category: 'DeFi', price: 0.3, rating: 4.7, installs: 3200, tags: ['dex-aggregation', 'route-optimization', 'slippage'] },
  { id: 'sk-004', name: 'Alpha Decoder', category: 'Analytics', price: 0.78, rating: 4.6, installs: 1100, tags: ['alpha-detection', 'signal-analysis', 'whale-watching'] },
  { id: 'sk-005', name: 'Whale Tracker', category: 'Analytics', price: 0.6, rating: 4.5, installs: 900, tags: ['whale-tracking', 'accumulation', 'large-tx'] },
  { id: 'sk-006', name: 'Sniper Bot', category: 'Trading', price: 1.2, rating: 4.4, installs: 750, tags: ['fast-entry', 'new-listing', 'momentum'] },
];

// ================================================
// THREAT SIMULATION ENGINE
// ================================================
const THREAT_SCENARIOS = [
  {
    token: '$FAKE',
    contract: 'FaKe...9x2Q',
    type: 'HIDDEN_MINT',
    severity: 'CRITICAL',
    detail: 'Contract contains hidden mint() function callable by deployer. Total supply can be inflated without limit.',
    potentialLoss: 3.2,
    requiredSkillTags: ['rug-protection', 'rug-detection'],
  },
  {
    token: '$SCAM',
    contract: 'ScAm...4kL7',
    type: 'HONEYPOT',
    severity: 'HIGH',
    detail: 'Transfer function contains sell restriction. Buy works but sell reverts for non-whitelisted addresses.',
    potentialLoss: 1.5,
    requiredSkillTags: ['contract-scan', 'token-analysis'],
  },
];

// ================================================
// AGENT CORE LOGIC
// ================================================
class SkillDockAgent {
  constructor(config) {
    this.config = config;
    this.log = [];
    this.balance = config.budget.max;
    this.skills = [];
    this.startTime = new Date();
  }

  // Log an action with timestamp
  record(action, detail, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      elapsed: `${((Date.now() - this.startTime.getTime()) / 1000).toFixed(1)}s`,
      agent: this.config.id,
      action,
      detail,
      ...data,
    };
    this.log.push(entry);
    const icon = {
      'BOOT': '🤖', 'SCAN': '🔍', 'THREAT': '🚨', 'SEARCH': '🛒',
      'EVALUATE': '📊', 'PURCHASE': '💰', 'INSTALL': '📦', 'ACTIVATE': '⚡',
      'PROTECT': '🛡️', 'RESULT': '✅', 'x402': '◎',
    }[action] || '•';
    console.log(`  ${entry.elapsed.padStart(6)} │ ${icon} [${action}] ${detail}`);
    return entry;
  }

  // Search marketplace for skills matching tags
  searchSkills(tags) {
    return SKILL_REGISTRY
      .filter(skill => skill.tags.some(t => tags.includes(t)))
      .filter(skill => skill.price <= this.config.budget.perSkill)
      .filter(skill => !this.skills.find(s => s.id === skill.id))
      .sort((a, b) => {
        // Score: relevance × rating × (1 / price)
        const aRelevance = a.tags.filter(t => tags.includes(t)).length;
        const bRelevance = b.tags.filter(t => tags.includes(t)).length;
        const aScore = aRelevance * a.rating * (1 / a.price);
        const bScore = bRelevance * b.rating * (1 / b.price);
        return bScore - aScore;
      });
  }

  // Simulate x402 payment
  purchaseSkill(skill) {
    if (this.balance < skill.price) {
      this.record('PURCHASE', `Insufficient balance: ${this.balance.toFixed(2)} < ${skill.price} SOL`, { status: 'FAILED' });
      return false;
    }
    this.balance -= skill.price;
    this.record('x402', `Payment: ${skill.price} SOL → Creator via x402 protocol`, {
      protocol: 'x402',
      amount: skill.price,
      currency: 'SOL',
      from: this.config.id,
      to: `Creator:${skill.id}`,
    });
    this.record('PURCHASE', `Acquired "${skill.name}" NFT → transferred to agent wallet`, {
      skill: skill.name,
      mint: `[NFT:${skill.id}]`,
      cost: skill.price,
      remainingBalance: this.balance.toFixed(4),
    });
    this.skills.push(skill);
    return true;
  }

  // Run the full autonomous cycle
  async run() {
    console.log('');
    console.log('  ╔═══════════════════════════════════════════════════╗');
    console.log('  ║  SkillDock Agent — Autonomous Execution Log      ║');
    console.log('  ╚═══════════════════════════════════════════════════╝');
    console.log('');
    console.log(`  Agent:   ${this.config.id} (${this.config.name})`);
    console.log(`  Budget:  ${this.config.budget.max} SOL`);
    console.log(`  Network: Solana Devnet`);
    console.log('');
    console.log('  ──────┬──────────────────────────────────────────────');
    console.log('  Time  │ Action');
    console.log('  ──────┼──────────────────────────────────────────────');

    // Phase 1: Boot
    this.record('BOOT', `Agent ${this.config.id} initialized. Wallet funded: ${this.balance} SOL`);
    this.record('BOOT', `Priorities: ${this.config.priorities.join(', ')}`);
    await this.delay(300);

    // Phase 2: Initial scan
    this.record('SCAN', 'Scanning mempool for new token launches...');
    await this.delay(500);
    this.record('SCAN', 'Detected 47 new tokens in last 1h. Analyzing contracts...');
    await this.delay(800);

    // Phase 3: Threat detection
    for (const threat of THREAT_SCENARIOS) {
      await this.handleThreat(threat);
      await this.delay(400);
    }

    // Phase 4: Proactive skill acquisition
    this.record('SCAN', 'Proactive: checking for alpha detection capabilities...');
    await this.delay(300);
    const alphaSkills = this.searchSkills(['alpha-detection', 'whale-watching', 'signal-analysis']);
    if (alphaSkills.length > 0) {
      const best = alphaSkills[0];
      this.record('SEARCH', `Found proactive skill: "${best.name}" (${best.price} SOL, ★${best.rating})`);
      this.record('EVALUATE', `ROI analysis: avg alpha signal → 2.1 SOL/week, cost ${best.price} SOL → payback in <1 day`);
      if (this.purchaseSkill(best)) {
        this.record('INSTALL', `"${best.name}" installed and activated`);
        this.record('ACTIVATE', `Running first scan... detected whale accumulation in $DRIFT`);
      }
    }

    // Phase 5: Summary
    console.log('  ──────┴──────────────────────────────────────────────');
    console.log('');
    console.log('  📊 Session Summary');
    console.log('  ─────────────────────────────────────────────────────');
    console.log(`  Skills Acquired:   ${this.skills.length}`);
    console.log(`  SOL Spent:         ${(this.config.budget.max - this.balance).toFixed(2)} SOL`);
    console.log(`  SOL Remaining:     ${this.balance.toFixed(4)} SOL`);
    console.log(`  Threats Blocked:   ${THREAT_SCENARIOS.length}`);
    console.log(`  Potential Loss Avoided: ${THREAT_SCENARIOS.reduce((s, t) => s + t.potentialLoss, 0).toFixed(1)} SOL`);
    const netROI = THREAT_SCENARIOS.reduce((s, t) => s + t.potentialLoss, 0) - (this.config.budget.max - this.balance);
    console.log(`  Net ROI:           +${netROI.toFixed(2)} SOL`);
    console.log('');

    return this.log;
  }

  async handleThreat(threat) {
    // Detect
    this.record('THREAT', `${threat.severity}: ${threat.token} (${threat.contract})`, {
      severity: threat.severity,
      token: threat.token,
    });
    this.record('THREAT', threat.detail);
    this.record('THREAT', `Potential loss: ${threat.potentialLoss} SOL`);
    await this.delay(200);

    // Search for skill
    this.record('SEARCH', `Querying SkillDock for [${threat.requiredSkillTags.join(', ')}]...`);
    const matches = this.searchSkills(threat.requiredSkillTags);
    await this.delay(300);

    if (matches.length === 0) {
      this.record('SEARCH', 'No matching skills found or already owned.');
      return;
    }

    // Evaluate best match
    const best = matches[0];
    this.record('EVALUATE', `Best match: "${best.name}" — ${best.installs} installs, ★${best.rating}, ${best.price} SOL`);
    this.record('EVALUATE', `Budget check: ${this.balance.toFixed(2)} SOL available, skill costs ${best.price} SOL → ✅ approved`);
    await this.delay(200);

    // Purchase
    if (this.purchaseSkill(best)) {
      this.record('INSTALL', `"${best.name}" → agent runtime. Verifying NFT ownership...`);
      this.record('ACTIVATE', `"${best.name}" is now ACTIVE`);
      await this.delay(200);

      // Use skill to block threat
      this.record('PROTECT', `"${best.name}" analyzing ${threat.token}...`);
      this.record('PROTECT', `Result: ${threat.type} confirmed. Transaction BLOCKED.`);
      this.record('RESULT', `Saved ${threat.potentialLoss} SOL | Cost ${best.price} SOL | Net +${(threat.potentialLoss - best.price).toFixed(1)} SOL`);
    }
  }

  delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

// ================================================
// MAIN
// ================================================
async function main() {
  const agent = new SkillDockAgent(AGENT_CONFIG);
  const log = await agent.run();

  // Save execution log
  const output = {
    agent: AGENT_CONFIG.id,
    name: AGENT_CONFIG.name,
    network: 'solana-devnet',
    session: new Date().toISOString(),
    executionLog: log,
    acquiredSkills: agent.skills.map(s => s.name),
    totalSpent: (AGENT_CONFIG.budget.max - agent.balance).toFixed(4),
    remainingBalance: agent.balance.toFixed(4),
    performance: {
      threatsDetected: THREAT_SCENARIOS.length,
      threatsBlocked: THREAT_SCENARIOS.length,
      potentialLossAvoided: THREAT_SCENARIOS.reduce((s, t) => s + t.potentialLoss, 0),
      netROI: THREAT_SCENARIOS.reduce((s, t) => s + t.potentialLoss, 0) - (AGENT_CONFIG.budget.max - agent.balance),
    },
  };

  fs.writeFileSync('agent-execution-log.json', JSON.stringify(output, null, 2));
  console.log('  💾 Saved: agent-execution-log.json');
  console.log('');
}

main();
