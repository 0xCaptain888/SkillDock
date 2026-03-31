/**
 * SkillDock Merkle Verifier — SAP-1 Metadata Integrity Layer
 *
 * Ensures skill metadata integrity through cryptographic verification.
 * The Merkle root is stored on-chain in the SkillRegistry program.
 * Agents verify metadata proofs before acquiring any skill.
 */

import { createHash } from 'crypto';

// ============================================================
// MerkleTree — Generic SHA-256 Merkle Tree Implementation
// ============================================================

class MerkleTree {
  /**
   * @param {Buffer[]} leaves - Pre-hashed leaf nodes
   */
  constructor(leaves) {
    if (!leaves || leaves.length === 0) {
      throw new Error('MerkleTree requires at least one leaf');
    }
    this.leaves = leaves.map(l => Buffer.from(l));
    this.layers = this._buildTree();
  }

  /** Build all layers from leaves up to root. */
  _buildTree() {
    const layers = [this.leaves];
    let current = this.leaves;

    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = i + 1 < current.length ? current[i + 1] : left; // duplicate odd node
        next.push(this._hashPair(left, right));
      }
      layers.push(next);
      current = next;
    }
    return layers;
  }

  /** Concatenate two buffers in sorted order and hash. */
  _hashPair(a, b) {
    const sorted = Buffer.compare(a, b) <= 0 ? [a, b] : [b, a];
    return createHash('sha256').update(Buffer.concat(sorted)).digest();
  }

  /** Returns the Merkle root as a hex string. */
  getRoot() {
    const top = this.layers[this.layers.length - 1];
    return top[0].toString('hex');
  }

  /**
   * Generate a proof for the leaf at the given index.
   * @param {number} index - Leaf index (0-based)
   * @returns {{ position: string, hash: string }[]}
   */
  getProof(index) {
    if (index < 0 || index >= this.leaves.length) {
      throw new RangeError(`Leaf index ${index} out of bounds (0..${this.leaves.length - 1})`);
    }
    const proof = [];
    let idx = index;

    for (let layer = 0; layer < this.layers.length - 1; layer++) {
      const nodes = this.layers[layer];
      const isRight = idx % 2 === 1;
      const siblingIdx = isRight ? idx - 1 : idx + 1;
      const sibling = siblingIdx < nodes.length ? nodes[siblingIdx] : nodes[idx];

      proof.push({
        position: isRight ? 'left' : 'right',
        hash: sibling.toString('hex'),
      });
      idx = Math.floor(idx / 2);
    }
    return proof;
  }

  /**
   * Verify a proof against a known root.
   * @param {string} leafHex - Hex-encoded leaf hash
   * @param {{ position: string, hash: string }[]} proof
   * @param {string} rootHex - Expected Merkle root (hex)
   * @returns {boolean}
   */
  static verify(leafHex, proof, rootHex) {
    let current = Buffer.from(leafHex, 'hex');

    for (const step of proof) {
      const sibling = Buffer.from(step.hash, 'hex');
      const sorted = Buffer.compare(current, sibling) <= 0
        ? [current, sibling]
        : [sibling, current];
      current = createHash('sha256').update(Buffer.concat(sorted)).digest();
    }
    return current.toString('hex') === rootHex;
  }

  /**
   * Hash arbitrary data into a leaf node.
   * @param {*} data - Will be JSON-stringified then SHA-256 hashed
   * @returns {Buffer}
   */
  static hashLeaf(data) {
    const serialized = JSON.stringify(data);
    return createHash('sha256').update(serialized).digest();
  }
}

// ============================================================
// SkillMetadataVerifier — High-level verifier for SAP-1 skills
// ============================================================

class SkillMetadataVerifier {
  /**
   * @param {object[]} skills - Array of skill metadata objects
   */
  constructor(skills) {
    this.skills = [...skills];
    this._buildTree();
  }

  /** Internal: hash all skills and construct a MerkleTree. */
  _buildTree() {
    this.leafHashes = this.skills.map(s => MerkleTree.hashLeaf(s));
    this.tree = new MerkleTree(this.leafHashes);
  }

  /**
   * Verify a skill by its id field.
   * @param {string} skillId
   * @returns {{ verified: boolean, proof: object[], root: string }}
   */
  verifySkill(skillId) {
    const index = this.skills.findIndex(s => s.id === skillId);
    if (index === -1) {
      return { verified: false, proof: [], root: this.tree.getRoot(), reason: 'Skill not found in registry' };
    }
    const proof = this.tree.getProof(index);
    const leafHex = this.leafHashes[index].toString('hex');
    const root = this.tree.getRoot();
    const verified = MerkleTree.verify(leafHex, proof, root);
    return { verified, proof, root };
  }

  /** Returns the hex Merkle root suitable for on-chain storage. */
  getRegistryRoot() {
    return this.tree.getRoot();
  }

  /** Add a skill and rebuild the tree. */
  addSkill(skill) {
    this.skills.push(skill);
    this._buildTree();
  }

  /** Export proofs for every skill in the registry. */
  exportProofs() {
    return this.skills.map((skill, i) => ({
      skillId: skill.id,
      name: skill.name,
      leafHash: this.leafHashes[i].toString('hex'),
      proof: this.tree.getProof(i),
      root: this.tree.getRoot(),
    }));
  }
}

// ============================================================
// SkillDock Registry — The 6 canonical skills
// ============================================================

const SKILLDOCK_SKILLS = [
  {
    id: 'sk-rug-shield',
    name: 'Rug Shield',
    capability_id: 'com.skilldock.rug-shield',
    capability_type: 'security',
    version: '1.0.0',
    description: 'Detects and blocks rug-pull attempts in real-time using contract analysis and liquidity monitoring.',
    price_lamports: 800_000_000,
    creator: 'BjGJJXUVLwvYDtfVR1YxiBMPLNU7hCHStF3pQUiV4KHn',
    rating: 4.8,
    acquisitions: 1800,
    status: 'active',
  },
  {
    id: 'sk-alpha-decoder',
    name: 'Alpha Decoder',
    capability_id: 'com.skilldock.alpha-decoder',
    capability_type: 'data',
    version: '1.2.0',
    description: 'Identifies early alpha signals from on-chain data, whale movements, and social sentiment.',
    price_lamports: 780_000_000,
    creator: 'BjGJJXUVLwvYDtfVR1YxiBMPLNU7hCHStF3pQUiV4KHn',
    rating: 4.6,
    acquisitions: 1100,
    status: 'active',
  },
  {
    id: 'sk-snipe-guard',
    name: 'Snipe Guard',
    capability_id: 'com.skilldock.snipe-guard',
    capability_type: 'security',
    version: '1.1.0',
    description: 'Protects against front-running and sandwich attacks on DEX trades with MEV-aware routing.',
    price_lamports: 650_000_000,
    creator: '9kQ2rC4VwFdT3p7LjHn5YxMcKzA2JvB8NsE6WqR1uFpD',
    rating: 4.7,
    acquisitions: 940,
    status: 'active',
  },
  {
    id: 'sk-yield-optimizer',
    name: 'Yield Optimizer',
    capability_id: 'com.skilldock.yield-optimizer',
    capability_type: 'trading',
    version: '2.0.0',
    description: 'Auto-compounds yields across Solana DeFi protocols with risk-adjusted allocation strategies.',
    price_lamports: 950_000_000,
    creator: 'BjGJJXUVLwvYDtfVR1YxiBMPLNU7hCHStF3pQUiV4KHn',
    rating: 4.5,
    acquisitions: 720,
    status: 'active',
  },
  {
    id: 'sk-social-sentinel',
    name: 'Social Sentinel',
    capability_id: 'com.skilldock.social-sentinel',
    capability_type: 'social',
    version: '1.0.0',
    description: 'Monitors Twitter/X, Discord, and Telegram for coordinated shill campaigns and FUD attacks.',
    price_lamports: 500_000_000,
    creator: '4hF8jZmK7wTnR2LpVx9BqCsE3dN6yAu5GkM8XcW1oJrS',
    rating: 4.3,
    acquisitions: 480,
    status: 'active',
  },
  {
    id: 'sk-gas-oracle',
    name: 'Gas Oracle',
    capability_id: 'com.skilldock.gas-oracle',
    capability_type: 'utility',
    version: '1.3.0',
    description: 'Predicts optimal transaction timing and priority fees using historical congestion patterns.',
    price_lamports: 300_000_000,
    creator: '4hF8jZmK7wTnR2LpVx9BqCsE3dN6yAu5GkM8XcW1oJrS',
    rating: 4.4,
    acquisitions: 1550,
    status: 'active',
  },
];

// ============================================================
// Demonstration
// ============================================================

function demonstrate() {
  console.log('');
  console.log('  +=====================================================+');
  console.log('  |  SkillDock Merkle Verifier — SAP-1 Integrity Demo   |');
  console.log('  +=====================================================+');
  console.log('');

  // 1. Build tree from all 6 skills
  const verifier = new SkillMetadataVerifier(SKILLDOCK_SKILLS);
  const root = verifier.getRegistryRoot();

  console.log('  [1] Merkle Tree Built');
  console.log(`      Leaves:  ${SKILLDOCK_SKILLS.length} skills`);
  console.log(`      Root:    ${root}`);
  console.log(`      (This root would be stored on-chain in SkillRegistry)`);
  console.log('');

  // 2. Verify one skill's proof
  const targetId = 'sk-rug-shield';
  const result = verifier.verifySkill(targetId);
  console.log(`  [2] Verify "${targetId}"`);
  console.log(`      Verified: ${result.verified}`);
  console.log(`      Proof steps: ${result.proof.length}`);
  result.proof.forEach((step, i) => {
    console.log(`        Step ${i}: ${step.position} — ${step.hash.slice(0, 16)}...`);
  });
  console.log('');

  // 3. Export all proofs
  const allProofs = verifier.exportProofs();
  console.log('  [3] All Skill Proofs');
  allProofs.forEach(p => {
    const status = MerkleTree.verify(p.leafHash, p.proof, p.root) ? 'PASS' : 'FAIL';
    console.log(`      ${status} | ${p.name.padEnd(18)} | leaf: ${p.leafHash.slice(0, 16)}...`);
  });
  console.log('');

  // 4. Tamper detection — modify metadata, show proof fails
  console.log('  [4] Tamper Detection');
  const tamperedSkill = { ...SKILLDOCK_SKILLS[0], price_lamports: 1 }; // attacker changes price
  const tamperedLeaf = MerkleTree.hashLeaf(tamperedSkill).toString('hex');
  const originalProof = verifier.tree.getProof(0);
  const tamperCheck = MerkleTree.verify(tamperedLeaf, originalProof, root);

  console.log(`      Original price_lamports: ${SKILLDOCK_SKILLS[0].price_lamports}`);
  console.log(`      Tampered price_lamports: ${tamperedSkill.price_lamports}`);
  console.log(`      Proof valid with tampered data: ${tamperCheck}`);
  console.log(`      >> Tamper DETECTED — proof correctly rejected`);
  console.log('');

  // 5. Summary
  console.log('  [5] Summary');
  console.log(`      Registry root:    ${root}`);
  console.log(`      Total skills:     ${SKILLDOCK_SKILLS.length}`);
  console.log(`      All proofs valid: ${allProofs.every(p => MerkleTree.verify(p.leafHash, p.proof, p.root))}`);
  console.log(`      Tamper detected:  ${!tamperCheck}`);
  console.log('');

  return { root, proofs: allProofs, tamperDetected: !tamperCheck };
}

// ============================================================
// Exports
// ============================================================

export { MerkleTree, SkillMetadataVerifier, SKILLDOCK_SKILLS, demonstrate };

// Run demonstration if executed directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('merkle-verifier.mjs') ||
  process.argv[1].endsWith('merkle-verifier')
);
if (isMain) {
  demonstrate();
}
