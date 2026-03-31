// rug-shield.mjs — RugShieldSkill: on-chain rug-pull detection heuristics
// SAP-1 compatible SkillDock module

class RugShieldSkill {
  static describe() {
    return {
      name: 'rug-shield',
      version: '1.0.0',
      protocol: 'SAP-1',
      description: 'Detects rug-pull risk patterns in token contracts via static heuristic analysis.',
      author: 'SkillDock Labs',
      inputs: { contractData: 'object — token contract metadata and bytecode indicators' },
      outputs: { riskLevel: 'CRITICAL|HIGH|MEDIUM|LOW|SAFE', score: '0-100', findings: 'array', recommendation: 'string' },
    };
  }

  /** @param {object} cd - contract metadata */
  analyze(cd) {
    const findings = [];
    let score = 0;

    // --- 1. Hidden mint / unlimited supply ---
    if (cd.hasMintFunction && !cd.mintCapped) {
      score += 35;
      findings.push({ id: 'HIDDEN_MINT', severity: 'CRITICAL',
        detail: 'Unrestricted mint function detected — owner can inflate supply at will.' });
    } else if (cd.hasMintFunction && cd.mintCapped) {
      score += 8;
      findings.push({ id: 'CAPPED_MINT', severity: 'LOW',
        detail: 'Mint function exists but is hard-capped. Moderate trust required.' });
    }

    // --- 2. Honeypot / sell restrictions ---
    if (cd.maxSellPct !== undefined && cd.maxSellPct < 100) {
      const penalty = cd.maxSellPct === 0 ? 40 : Math.round(30 * (1 - cd.maxSellPct / 100));
      score += penalty;
      const msg = cd.maxSellPct === 0
        ? 'Sells completely blocked — classic honeypot.'
        : `Sell cap at ${cd.maxSellPct}% of holdings per tx — partial honeypot.`;
      findings.push({ id: 'SELL_RESTRICTION', severity: penalty >= 30 ? 'CRITICAL' : 'HIGH', detail: msg });
    }
    if (cd.sellTaxPct > 10) {
      const penalty = Math.min(25, Math.round(cd.sellTaxPct / 2));
      score += penalty;
      findings.push({ id: 'HIGH_SELL_TAX', severity: penalty >= 15 ? 'HIGH' : 'MEDIUM',
        detail: `Sell tax is ${cd.sellTaxPct}% — effective value drain on exit.` });
    }

    // --- 3. Liquidity removal risk ---
    if (cd.lpLocked === false) {
      score += 30;
      findings.push({ id: 'LP_UNLOCKED', severity: 'CRITICAL',
        detail: 'Liquidity is NOT locked. Owner can pull the pool at any time.' });
    } else if (cd.lpLockDays !== undefined && cd.lpLockDays < 90) {
      const penalty = cd.lpLockDays < 30 ? 20 : 10;
      score += penalty;
      findings.push({ id: 'SHORT_LP_LOCK', severity: penalty >= 20 ? 'HIGH' : 'MEDIUM',
        detail: `LP locked for only ${cd.lpLockDays} days — short lock window.` });
    }

    // --- 4. Ownership renouncement ---
    if (cd.ownerRenounced === false) {
      score += 10;
      findings.push({ id: 'OWNER_ACTIVE', severity: 'MEDIUM',
        detail: 'Ownership NOT renounced — privileged functions remain callable.' });
    }

    // --- 5. Proxy / upgradeable patterns ---
    if (cd.isProxy) {
      score += 20;
      findings.push({ id: 'PROXY_UPGRADEABLE', severity: 'HIGH',
        detail: 'Contract uses proxy pattern — logic can be swapped post-deploy.' });
    }

    score = Math.min(100, score);
    const riskLevel = score >= 70 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 30 ? 'MEDIUM' : score >= 10 ? 'LOW' : 'SAFE';

    const recommendations = {
      CRITICAL: 'Do NOT interact. Extremely high probability of rug-pull or honeypot.',
      HIGH:     'Avoid unless you have direct knowledge of the team. Multiple red flags.',
      MEDIUM:   'Proceed with caution. Limit exposure and set tight stop-losses.',
      LOW:      'Minor concerns detected. Standard due-diligence recommended.',
      SAFE:     'No significant rug indicators found. Normal risk profile.',
    };

    return { riskLevel, score, findings, recommendation: recommendations[riskLevel] };
  }
}

// ── Self-demo ──────────────────────────────────────────────────────────────────
function demo() {
  const skill = new RugShieldSkill();
  console.log('RugShield Skill — SAP-1 Module Demo');
  console.log('=' .repeat(60));
  console.log('Metadata:', JSON.stringify(RugShieldSkill.describe(), null, 2), '\n');

  const samples = [
    { label: 'Safe Token (renounced, locked LP, no mint)',
      data: { hasMintFunction: false, maxSellPct: 100, sellTaxPct: 2,
              lpLocked: true, lpLockDays: 365, ownerRenounced: true, isProxy: false } },
    { label: 'Honeypot (sells blocked, high tax, proxy)',
      data: { hasMintFunction: false, maxSellPct: 0, sellTaxPct: 45,
              lpLocked: true, lpLockDays: 180, ownerRenounced: false, isProxy: true } },
    { label: 'Rug-pull (unlimited mint, LP unlocked, owner active)',
      data: { hasMintFunction: true, mintCapped: false, maxSellPct: 100, sellTaxPct: 5,
              lpLocked: false, lpLockDays: 0, ownerRenounced: false, isProxy: false } },
  ];

  for (const { label, data } of samples) {
    console.log(`\n── ${label} ──`);
    const result = skill.analyze(data);
    console.log(`  Risk : ${result.riskLevel}  (score ${result.score}/100)`);
    for (const f of result.findings) {
      console.log(`  [${f.severity}] ${f.id}: ${f.detail}`);
    }
    console.log(`  >> ${result.recommendation}`);
  }
}

// Run demo when executed directly
const isMain = typeof process !== 'undefined' && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMain) demo();

export { RugShieldSkill };
