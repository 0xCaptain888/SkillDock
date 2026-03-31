// alpha-decoder.mjs — AlphaDecoderSkill: on-chain alpha signal detection
// SAP-1 compatible SkillDock module

class AlphaDecoderSkill {
  static describe() {
    return {
      name: 'alpha-decoder',
      version: '1.0.0',
      protocol: 'SAP-1',
      description: 'Detects early alpha signals from on-chain token activity and social velocity.',
      author: 'SkillDock Labs',
      inputs: { tokenData: 'object — on-chain metrics, volume, holder data, social stats' },
      outputs: { signal: 'STRONG_BUY|BUY|NEUTRAL|SELL', confidence: '0-1', indicators: 'array', summary: 'string' },
    };
  }

  /** @param {object} td - token activity data */
  analyze(td) {
    const indicators = [];
    let bullScore = 0;   // positive momentum points
    let bearScore = 0;   // negative / caution points
    let dataPoints = 0;  // how many heuristics had data

    // --- 1. Whale accumulation ---
    if (td.whaleNetFlow !== undefined) {
      dataPoints++;
      if (td.whaleNetFlow > 0) {
        const strength = Math.min(1, td.whaleNetFlow / 500_000);
        bullScore += strength * 30;
        indicators.push({ id: 'WHALE_ACCUMULATION', weight: +(strength * 30).toFixed(1),
          detail: `Whale net inflow $${(td.whaleNetFlow / 1000).toFixed(0)}k over window.` });
      } else if (td.whaleNetFlow < -100_000) {
        const strength = Math.min(1, Math.abs(td.whaleNetFlow) / 500_000);
        bearScore += strength * 25;
        indicators.push({ id: 'WHALE_DISTRIBUTION', weight: -(strength * 25).toFixed(1),
          detail: `Whale net outflow $${(Math.abs(td.whaleNetFlow) / 1000).toFixed(0)}k — distribution phase.` });
      }
    }

    // --- 2. Volume spike ---
    if (td.volumeChangeMultiple !== undefined) {
      dataPoints++;
      if (td.volumeChangeMultiple >= 3) {
        const w = Math.min(25, (td.volumeChangeMultiple - 1) * 5);
        bullScore += w;
        indicators.push({ id: 'VOLUME_SPIKE', weight: +w.toFixed(1),
          detail: `Volume ${td.volumeChangeMultiple.toFixed(1)}x above 7d average.` });
      }
    }

    // --- 3. Smart money inflows ---
    if (td.smartMoneyBuyers !== undefined) {
      dataPoints++;
      if (td.smartMoneyBuyers >= 3) {
        const w = Math.min(25, td.smartMoneyBuyers * 5);
        bullScore += w;
        indicators.push({ id: 'SMART_MONEY_INFLOW', weight: +w.toFixed(1),
          detail: `${td.smartMoneyBuyers} tracked smart-money wallets accumulated in window.` });
      }
    }

    // --- 4. Social mention velocity ---
    if (td.socialMentionsDelta !== undefined) {
      dataPoints++;
      if (td.socialMentionsDelta > 200) {
        const w = Math.min(20, td.socialMentionsDelta / 50);
        bullScore += w;
        indicators.push({ id: 'SOCIAL_VELOCITY', weight: +w.toFixed(1),
          detail: `Social mentions up ${td.socialMentionsDelta}% vs prior period.` });
      } else if (td.socialMentionsDelta < -50) {
        bearScore += 10;
        indicators.push({ id: 'SOCIAL_FADE', weight: -10,
          detail: `Social mentions declining ${td.socialMentionsDelta}% — attention fading.` });
      }
    }

    // --- Composite signal ---
    const net = bullScore - bearScore;
    const maxPossible = dataPoints * 30 || 1;
    const confidence = Math.min(1, +(Math.abs(net) / maxPossible).toFixed(2));

    let signal;
    if (net >= 50) signal = 'STRONG_BUY';
    else if (net >= 20) signal = 'BUY';
    else if (net <= -15) signal = 'SELL';
    else signal = 'NEUTRAL';

    const summary = signal === 'STRONG_BUY'
      ? 'Multiple alpha indicators converging — high-conviction early entry window.'
      : signal === 'BUY'
        ? 'Positive momentum building. Worth monitoring for confirmation.'
        : signal === 'SELL'
          ? 'Distribution signals outweigh accumulation. Consider reducing exposure.'
          : 'No clear directional signal. Wait for stronger confirmation.';

    return { signal, confidence, indicators, summary };
  }
}

// ── Self-demo ──────────────────────────────────────────────────────────────────
function demo() {
  const skill = new AlphaDecoderSkill();
  console.log('AlphaDecoder Skill — SAP-1 Module Demo');
  console.log('='.repeat(60));
  console.log('Metadata:', JSON.stringify(AlphaDecoderSkill.describe(), null, 2), '\n');

  const samples = [
    { label: 'Early alpha (whales + smart money + volume)',
      data: { whaleNetFlow: 420_000, volumeChangeMultiple: 5.2,
              smartMoneyBuyers: 4, socialMentionsDelta: 310 } },
    { label: 'Fading hype (outflows, declining social)',
      data: { whaleNetFlow: -350_000, volumeChangeMultiple: 1.1,
              smartMoneyBuyers: 0, socialMentionsDelta: -60 } },
    { label: 'Mixed / neutral',
      data: { whaleNetFlow: 50_000, volumeChangeMultiple: 2.0,
              smartMoneyBuyers: 1, socialMentionsDelta: 80 } },
  ];

  for (const { label, data } of samples) {
    console.log(`\n── ${label} ──`);
    const r = skill.analyze(data);
    console.log(`  Signal: ${r.signal}  (confidence ${(r.confidence * 100).toFixed(0)}%)`);
    for (const ind of r.indicators) {
      console.log(`  [${ind.weight > 0 ? '+' : ''}${ind.weight}] ${ind.id}: ${ind.detail}`);
    }
    console.log(`  >> ${r.summary}`);
  }
}

const isMain = typeof process !== 'undefined' && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMain) demo();

export { AlphaDecoderSkill };
