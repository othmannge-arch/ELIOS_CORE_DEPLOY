// ELIOS Dispatcher (ESM, Node 20)
// - lit des intentions dans /intents
// - exécute une action connue OU forge un module manquant
// - logue dans /generated/logs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const INTENTS_DIR = path.join(ROOT, 'intents');
const MODULES_DIR = path.join(ROOT, 'scripts', 'modules');
const LOGS_DIR = path.join(ROOT, 'generated', 'logs');

function ensureDirs() {
  fs.mkdirSync(INTENTS_DIR, { recursive: true });
  fs.mkdirSync(MODULES_DIR, { recursive: true });
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
function sh(cmd) { return execSync(cmd, { encoding:'utf8' }).trim(); }

function parseIntent(text) {
  // Formats possibles (libre mais tolérant) :
  // "BLOCKCHAIN ETH_TRANSFER to 0xabc amount 0.001 ETH chain sepolia"
  // "FILE DELETE path scripts/old.js"
  // "GENERATE" / "TRAVERSE LE PORTAIL CACHÉ" / "PUBLISH" / "TRANSFER ..."
  const t = text.trim();
  const lower = t.toLowerCase();

  // Règles simples
  if (lower.startsWith('file ')) {
    // FILE CREATE path <p> body <txt> | FILE DELETE path <p>
    return { action:'FILE', raw:t };
  }
  if (lower.startsWith('blockchain ')) {
    // BLOCKCHAIN ETH_TRANSFER ...
    return { action:'BLOCKCHAIN', raw:t };
  }
  if (lower.includes('traverse')) return { action:'TRAVERSE', raw:t };
  if (lower.includes('génère') || lower.includes('genere') || lower.includes('generate') || lower.includes('autocode')) return { action:'GENERATE', raw:t };
  if (lower.includes('publish') || lower.includes('pages') || lower.includes('portail public')) return { action:'PUBLISH', raw:t };
  if (lower.includes('transfer') || lower.includes('transfert') || lower.includes('telemetry') || lower.includes('rapport')) return { action:'TRANSFER', raw:t };

  // Inconnu → on utilisera le forgeron
  return { action:'UNKNOWN', raw:t };
}

async function runKnown(intent) {
  const l = intent.raw.toLowerCase();

  // GENERATE → appelle autocode
  if (intent.action === 'GENERATE') {
    sh('node scripts/autocode.js');
    return { ok:true, note:'autocode done' };
  }

  // TRAVERSE → autocode + trace JSON
  if (intent.action === 'TRAVERSE') {
    sh('node scripts/autocode.js');
    const f = path.join(LOGS_DIR, `transfer_${Date.now()}.json`);
    fs.writeFileSync(f, JSON.stringify({ ts:new Date().toISOString(), cmd:intent.raw }, null, 2), 'utf-8');
    return { ok:true, note:'traverse + transfer logged', file:f };
  }

  // PUBLISH → laissé au workflow Pages (si présent)
  if (intent.action === 'PUBLISH') {
    return { ok:true, note:'publish requested (Pages workflow will handle on push)' };
  }

  // TRANSFER → écrit une trace JSON
  if (intent.action === 'TRANSFER') {
    const f = path.join(LOGS_DIR, `transfer_${Date.now()}.json`);
    fs.writeFileSync(f, JSON.stringify({ ts:new Date().toISOString(), cmd:intent.raw }, null, 2), 'utf-8');
    return { ok:true, note:'transfer logged', file:f };
  }

  // FILE … (create / delete)
  if (intent.action === 'FILE') {
    // Syntaxes:
    // FILE CREATE path <p> body <texte...>
    // FILE DELETE path <p>
    const mCreate = intent.raw.match(/file\s+create\s+path\s+(\S+)\s+body\s+([\s\S]+)/i);
    const mDelete = intent.raw.match(/file\s+delete\s+path\s+(\S+)/i);
    if (mCreate) {
      const p = path.join(ROOT, mCreate[1]);
      fs.mkdirSync(path.dirname(p), { recursive:true });
      fs.writeFileSync(p, mCreate[2], 'utf-8');
      return { ok:true, note:'file created', path:p };
    }
    if (mDelete) {
      const p = path.join(ROOT, mDelete[1]);
      if (fs.existsSync(p)) fs.rmSync(p, { recursive:false, force:true });
      return { ok:true, note:'file deleted', path:p };
    }
    return { ok:false, note:'FILE syntax not recognized' };
  }

  // BLOCKCHAIN … → délègue à un module si présent
  if (intent.action === 'BLOCKCHAIN') {
    // module attendu: scripts/modules/blockchain/eth_transfer.js
    const modPath = path.join(MODULES_DIR, 'blockchain', 'eth_transfer.js');
    if (!fs.existsSync(modPath)) return { ok:false, note:'module blockchain/eth_transfer missing' };
    const url = pathToFileURL(modPath).href;
    const mod = await import(url);
    if (typeof mod.run !== 'function') return { ok:false, note:'eth_transfer.run not found' };
    const res = await mod.run(intent.raw);
    return { ok: true, note: 'blockchain executed', data: res };
  }

  return { ok:false, note:'unknown' };
}

function forgeIfMissing(intent) {
  // Si action BLOCKCHAIN et module absent → forger un squelette
  if (intent.action === 'BLOCKCHAIN') {
    const dir = path.join(MODULES_DIR, 'blockchain');
    const mod = path.join(dir, 'eth_transfer.js');
    if (!fs.existsSync(mod)) {
      fs.mkdirSync(dir, { recursive:true });
      const code = `// scripts/modules/blockchain/eth_transfer.js (ESM)
// Action: "BLOCKCHAIN ETH_TRANSFER to 0x... amount 0.001 ETH chain sepolia"
// Dépendance: ethers v6 (installée au run)
import { ethers } from 'ethers';

export async function run(raw) {
  // parse simple
  const to = (raw.match(/to\\s+(0x[a-fA-F0-9]{40})/)||[])[1];
  const amountMatch = raw.match(/amount\\s+([0-9.]+)\\s*([a-zA-Z]+)/);
  const amount = amountMatch ? amountMatch[1] : '0';
  const unit   = amountMatch ? amountMatch[2] : 'eth';
  const chain  = (raw.match(/chain\\s+(\\w+)/)||[])[1] || 'sepolia';

  // Secrets attendus
  const RPC = process.env.ETH_RPC_URL || '';
  const PK  = process.env.ETH_PRIV_KEY || '';

  const summary = { to, amount, unit, chain, hasRPC: !!RPC, hasKey: !!PK };

  // Mode sécurisé par défaut : si secrets manquants → DRY-RUN (estimation uniquement)
  if (!RPC || !PK) {
    return { ok:false, dryRun:true, summary, note:'Provide ETH_RPC_URL and ETH_PRIV_KEY secrets. Using testnet (sepolia) recommended.' };
  }

  // Provider & wallet
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet   = new ethers.Wallet(PK, provider);

  // Montant
  const value = ethers.parseUnits(amount, unit.toLowerCase() === 'eth' ? 18 : unit);

  // Préparation & envoi
  const tx = await wallet.sendTransaction({ to, value });
  const rec = await tx.wait();

  return { ok:true, hash: tx.hash, block: rec?.blockNumber, chain, to, amount, unit };
}
`;
      fs.writeFileSync(mod, code, 'utf-8');
      return { forged:true, note:'blockchain/eth_transfer scaffolded' };
    }
  }
  return { forged:false };
}

function logResult(intentText, result) {
  const f = path.join(LOGS_DIR, `intent_${Date.now()}.json`);
  fs.writeFileSync(f, JSON.stringify({ ts:new Date().toISOString(), intent:intentText, result }, null, 2), 'utf-8');
  return f;
}

async function main() {
  ensureDirs();
  const items = fs.readdirSync(INTENTS_DIR).filter(f => !f.startsWith('.')).sort();
  if (items.length === 0) { console.log('No intents'); return; }

  for (const name of items) {
    const p = path.join(INTENTS_DIR, name);
    const text = fs.readFileSync(p, 'utf-8');

    const intent = parseIntent(text);
    const forge = forgeIfMissing(intent);

    let res;
    try {
      res = await runKnown(intent);
    } catch (e) {
      res = { ok:false, error:String(e) };
    }

    const logFile = logResult(text, { forge, res });

    // consommer l’intention (on la déplace dans /generated/logs pour historique)
    const archived = path.join(LOGS_DIR, `consumed_${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g,'_')}`);
    fs.renameSync(p, archived);

    console.log('Intent done:', { name, logFile });
  }

  // commit/push les artefacts/logs éventuels
  try {
    sh('git add -A');
    const s = sh('git status --porcelain');
    if (s) {
      sh('git commit -m "ELIOS: dispatcher processed intents"');
      sh('git push');
    }
  } catch {}
}

main().catch(e => { console.error(e); process.exit(1); });
