/**
 * SkillDock — Step 1: Generate Wallets
 *
 * Generates 3 wallets and saves them. Then you manually fund them
 * at https://faucet.solana.com before running step 2.
 */

import { Keypair } from '@solana/web3.js';
import fs from 'fs';

const deployer = Keypair.generate();
const agentWallet = Keypair.generate();
const creatorWallet = Keypair.generate();

const keypairs = {
  deployer: Array.from(deployer.secretKey),
  agent: Array.from(agentWallet.secretKey),
  creator: Array.from(creatorWallet.secretKey),
};

fs.writeFileSync('.keypairs.json', JSON.stringify(keypairs, null, 2));

console.log('');
console.log('⚡ SkillDock — Wallet Generator');
console.log('================================');
console.log('');
console.log('3 wallets have been generated and saved to .keypairs.json');
console.log('');
console.log('Now go to https://faucet.solana.com and airdrop SOL to each:');
console.log('');
console.log('1️⃣  Deployer (need 2 SOL):');
console.log(`   ${deployer.publicKey.toBase58()}`);
console.log('');
console.log('2️⃣  Agent (need 2 SOL):');
console.log(`   ${agentWallet.publicKey.toBase58()}`);
console.log('');
console.log('3️⃣  Creator (need 1 SOL):');
console.log(`   ${creatorWallet.publicKey.toBase58()}`);
console.log('');
console.log('Steps:');
console.log('  1. Open https://faucet.solana.com');
console.log('  2. Select "Devnet"');
console.log('  3. Paste each address above and request SOL');
console.log('  4. After all 3 are funded, run: node deploy-step2.mjs');
console.log('');
