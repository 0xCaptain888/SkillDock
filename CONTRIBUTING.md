# Contributing to SkillDock

Thank you for your interest in contributing to SkillDock — the App Store for AI Agents on Solana.

## Getting Started

```bash
git clone https://github.com/0xCaptain888/SkillDock.git
cd SkillDock
npm install
```

Verify your setup:

```bash
node tests/run-tests.mjs          # 33 tests should pass
node agent-demo.mjs               # Full pipeline demo
node src/skills/rug-shield.mjs    # Individual skill module
```

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `src/` | Core modules — Merkle verifier, LLM Guardian, skill modules |
| `src/skills/` | Executable skill modules (SAP-1 compliant) |
| `contracts/` | Anchor smart contract (Rust) |
| `protocol/` | SAP-1 protocol specification |
| `tests/` | Automated test suite |
| `docs/` | Architecture docs and engineering postmortems |

## Creating a New Skill Module

All skill modules follow the SAP-1 protocol. See [`protocol/SAP-1.md`](./protocol/SAP-1.md) for the full spec.

Minimal skill template:

```javascript
export class YourSkill {
  static describe() {
    return {
      protocol: 'SAP-1',
      id: 'sk-your-skill',
      name: 'Your Skill',
      version: '1.0.0',
      capability_type: 'security',  // security | trading | data | social | utility
      input: { /* expected input fields */ },
      output: { /* output schema */ },
    };
  }

  analyze(data) {
    const findings = [];
    let score = 0;

    // Your analysis logic here

    const riskLevel = score >= 70 ? 'CRITICAL' : score >= 40 ? 'HIGH'
                    : score >= 20 ? 'MEDIUM' : 'SAFE';

    return {
      score,
      riskLevel,
      findings,
      recommendation: '...',
    };
  }
}
```

Reference implementations:
- [`src/skills/rug-shield.mjs`](./src/skills/rug-shield.mjs) — 5 heuristic checks
- [`src/skills/snipe-guard.mjs`](./src/skills/snipe-guard.mjs) — 5 MEV checks
- [`src/skills/alpha-decoder.mjs`](./src/skills/alpha-decoder.mjs) — 4 signal indicators

## Running Tests

```bash
node tests/run-tests.mjs
```

All 33 tests must pass before submitting a PR. If you add a new skill module, add corresponding tests to `tests/run-tests.mjs`.

## Commit Convention

```
feat: add new skill module for whale tracking
fix: correct price anomaly threshold in Guardian Layer 1
docs: update architecture diagram with new layer
test: add edge cases for SnipeGuard low-liquidity pools
chore: update dependencies
```

## Pull Request Process

1. Fork the repo and create a feature branch
2. Ensure `node tests/run-tests.mjs` passes (33/33)
3. Ensure `node agent-demo.mjs` runs without errors
4. Update documentation if your change affects architecture or APIs
5. Submit a PR with a clear description of changes

## Areas We Need Help With

- **New skill modules** — MEV detection, governance voting, portfolio rebalancing
- **Anchor contract tests** — Bankrun or anchor-test integration tests
- **Jupiter integration** — Cross-token skill payments
- **Marinade integration** — Agent earnings → mSOL staking
- **Mobile UX** — Seeker-specific interaction patterns
- **SAP-1 extensions** — Skill composability, versioned upgrades, dependency graphs

## Code of Conduct

Be respectful, constructive, and focused on shipping. This is an open-source project building infrastructure for the Solana Agent economy.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
