// snipe-guard.mjs — SnipeGuardSkill: MEV protection / sandwich attack detection
// SAP-1 compatible SkillDock module

class SnipeGuardSkill {
  static describe() {
    return {
      name: 'snipe-guard',
      version: '1.0.0',
      protocol: 'SAP-1',
      description: 'Detects MEV and sandwich attack risk for pending DEX trades via heuristic analysis.',
      author: 'SkillDock Labs',
      inputs: { txData: 'object — DEX trade parameters, mempool visibility, pool metrics' },
      outputs: { riskLevel: 'CRITICAL|HIGH|MEDIUM|LOW|SAFE', score: '0-100', findings: 'array', recommendation: 'string' },
    };
  }

  /** @param {object} tx - transaction / trade data */
  analyze(tx) {
    const findings = [];
    let score = 0;

    // --- 1. HIGH_SLIPPAGE ---
    if (tx.slippagePct > 5) {
      const penalty = Math.min(30, Math.round(tx.slippagePct * 3));
      score += penalty;
      findings.push({ id: 'HIGH_SLIPPAGE', severity: penalty >= 20 ? 'CRITICAL' : 'HIGH',
        detail: `Slippage tolerance ${tx.slippagePct}% — sandwich bots can extract the full spread.` });
    }

    // --- 2. LARGE_RELATIVE_TRADE ---
    if (tx.poolLiquidityUsd > 0 && (tx.tradeAmountUsd / tx.poolLiquidityUsd) > 0.02) {
      const ratioPct = ((tx.tradeAmountUsd / tx.poolLiquidityUsd) * 100).toFixed(1);
      const penalty = Math.min(25, Math.round(ratioPct * 2));
      score += penalty;
      findings.push({ id: 'LARGE_RELATIVE_TRADE', severity: penalty >= 20 ? 'HIGH' : 'MEDIUM',
        detail: `Trade is ${ratioPct}% of pool liquidity — large price impact makes sandwiching profitable.` });
    }

    // --- 3. MEMPOOL_EXPOSED ---
    if (tx.mempoolVisible && tx.priorityFee < 10000) {
      score += 25;
      findings.push({ id: 'MEMPOOL_EXPOSED', severity: 'HIGH',
        detail: `TX visible in mempool with low priority fee (${tx.priorityFee} lamports) — easily front-runnable.` });
    }

    // --- 4. SANDWICH_HOTSPOT ---
    if (tx.recentSandwiches > 3) {
      const penalty = Math.min(25, tx.recentSandwiches * 4);
      score += penalty;
      findings.push({ id: 'SANDWICH_HOTSPOT', severity: penalty >= 20 ? 'CRITICAL' : 'HIGH',
        detail: `${tx.recentSandwiches} sandwich attacks on this pool in the last hour — active attackers present.` });
    }

    // --- 5. LOW_LIQUIDITY ---
    if (tx.poolLiquidityUsd < 50000) {
      const penalty = Math.min(20, Math.round((50000 - tx.poolLiquidityUsd) / 2500));
      score += penalty;
      findings.push({ id: 'LOW_LIQUIDITY', severity: penalty >= 15 ? 'HIGH' : 'MEDIUM',
        detail: `Pool liquidity $${(tx.poolLiquidityUsd / 1000).toFixed(1)}k — thin book is trivially manipulable.` });
    }

    score = Math.min(100, score);
    const riskLevel = score >= 70 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 30 ? 'MEDIUM' : score >= 10 ? 'LOW' : 'SAFE';

    const recommendations = {
      CRITICAL: 'Do NOT submit this trade. Near-certain sandwich or front-run extraction.',
      HIGH:     'Use a private RPC or MEV-protected relay. Reduce size and tighten slippage.',
      MEDIUM:   'Consider splitting the trade or using limit orders to reduce exposure.',
      LOW:      'Minor MEV surface. Standard precautions sufficient.',
      SAFE:     'No significant MEV risk detected. Trade parameters look healthy.',
    };

    return { riskLevel, score, findings, recommendation: recommendations[riskLevel] };
  }
}

// ── Self-demo ──────────────────────────────────────────────────────────────────
function demo() {
  const skill = new SnipeGuardSkill();
  console.log('SnipeGuard Skill — SAP-1 Module Demo');
  console.log('='.repeat(60));
  console.log('Metadata:', JSON.stringify(SnipeGuardSkill.describe(), null, 2), '\n');

  const samples = [
    { label: 'Safe trade (low slippage, deep pool, no sandwiches)',
      data: { dexRouter: 'Raydium', slippagePct: 0.5, poolLiquidityUsd: 4_200_000,
              tradeAmountUsd: 1_500, mempoolVisible: false, priorityFee: 50000,
              recentSandwiches: 0 } },
    { label: 'Sandwich target (high slippage, mempool visible, active sandwichers)',
      data: { dexRouter: 'Orca', slippagePct: 12, poolLiquidityUsd: 800_000,
              tradeAmountUsd: 25_000, mempoolVisible: true, priorityFee: 3000,
              recentSandwiches: 7 } },
    { label: 'Low liquidity danger (tiny pool, large relative trade)',
      data: { dexRouter: 'Meteora', slippagePct: 3, poolLiquidityUsd: 18_000,
              tradeAmountUsd: 2_000, mempoolVisible: true, priorityFee: 8000,
              recentSandwiches: 1 } },
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

const isMain = typeof process !== 'undefined' && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMain) demo();

export { SnipeGuardSkill };
