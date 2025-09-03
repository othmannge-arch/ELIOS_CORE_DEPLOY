// scripts/telegram_listen.js (ESM, Node 20, sans Firebase)
// Stocke l'offset dans le repo et exécute des commandes via git + Node.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const CHATID = process.env.TELEGRAM_CHAT_ID || ""; // si vide: accepte tout chat
if (!TOKEN) { throw new Error("TELEGRAM_BOT_TOKEN manquant"); }

const ROOT   = process.cwd();
const STATE_DIR = path.join(ROOT, 'generated', 'state');
const OFFSET_FILE = path.join(STATE_DIR, 'telegram_offset.json');

// util
function sh(cmd) { return execSync(cmd, { encoding: 'utf8' }).trim(); }
async function tg(method, params) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(params || {})
  });
  if (!res.ok) throw new Error(`Telegram ${method} failed: ${res.status}`);
  return res.json();
}
async function reply(text) {
  if (!CHATID) return; // silencieux si pas de chat ciblé
  await tg('sendMessage', { chat_id: CHATID, text });
}
function ensureDirs() {
  fs.mkdirSync(path.join(ROOT, 'generated'), { recursive: true });
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'memory'), { recursive: true });
}
function loadOffset() {
  try { return JSON.parse(fs.readFileSync(OFFSET_FILE, 'utf-8')).offset || 0; }
  catch { return 0; }
}
function saveOffset(offset) {
  ensureDirs();
  fs.writeFileSync(OFFSET_FILE, JSON.stringify({ offset, ts: new Date().toISOString() }, null, 2), 'utf-8');
}
function safeId(s) { return String(s).toLowerCase().replace(/[^a-z0-9._-]/g, '_'); }
function gitSetup() {
  try { sh('git config user.name'); } catch { sh('git config user.name "elios-bot"'); }
  try { sh('git config user.email'); } catch { sh('git config user.email "elios-bot@users.noreply.github.com"'); }
}

async function handle(text) {
  const t = text.trim().toLowerCase();

  // /ping -> pong
  if (t.startsWith('/ping')) { await reply('pong 🟢'); return true; }

  // générer / autocode
  if (/(^| )((génère|genere)|generate|autocode)( |$)/.test(t)) {
    sh('node scripts/autocode.js');
    await reply('⚡ Génération effectuée (autocode).');
    return true;
  }

  // traverse le portail (=> génère + trace)
  if (/(traverse|portail|portal|caché|cache)/.test(t)) {
    sh('node scripts/autocode.js');
    // trace json
    const outDir = path.join(ROOT, 'generated');
    const f = path.join(outDir, `transfer_${Date.now()}.json`);
    fs.writeFileSync(f, JSON.stringify({ ts:new Date().toISOString(), cmd:text }, null, 2), 'utf-8');
    await reply('🌀 Portail traversé (preuve ajoutée dans /generated).');
    return true;
  }

  // /ancrage <nom>  -> memory/<nom>.md + commit
  if (t.startsWith('/ancrage ') || t.startsWith('fractal.nouvel.ancrage ')) {
    const name = safeId(text.split(/\s+/).slice(1).join('_') || `ancrage_${Date.now()}`);
    const p = path.join(ROOT, 'memory', `${name}.md`);
    const md = `---\ntitle: ${name}\ncreatedAt: ${new Date().toISOString()}\n---\n\n# ${name}\n\nNouvel ancrage créé via Telegram.\n`;
    fs.writeFileSync(p, md, 'utf-8');

    gitSetup();
    try { sh('git add -A'); const st = sh('git status --porcelain'); if (st) sh('git commit -m "feat(memory): ancrage via Telegram"'); sh('git push'); } catch {}
    await reply(`✅ Ancrage créé: memory/${name}.md`);
    return true;
  }

  // /export -> liste les 5 derniers fichiers dans /generated
  if (t.startsWith('/export') || t.includes('miroir.transfert')) {
    const dir = path.join(ROOT, 'generated');
    if (!fs.existsSync(dir)) { await reply('Aucun artefact.'); return true; }
    const files = fs.readdirSync(dir).sort().slice(-5);
    await reply(files.length ? `Derniers artefacts:\n• ${files.join('\n• ')}` : 'Aucun artefact récent.');
    return true;
  }

  // /synchro ou ∞je.toi.nous
  if (t.includes('∞je.toi.nous') || t.startsWith('/synchro')) {
    await reply('🔁 Synchro reçue. Le prochain cycle ELIOS s’exécutera.');
    return true;
  }

  await reply("Commande inconnue. Exemples: /ping, générer, traverse le portail, /ancrage <nom>, /export, /synchro");
  return false;
}

async function main() {
  ensureDirs();
  let offset = loadOffset();

  const res = await tg('getUpdates', { offset: offset ? offset + 1 : undefined, timeout: 0, allowed_updates: ['message'] });
  const updates = (res.result || []).filter(u => u.message && u.message.text);

  for (const u of updates) {
    const msg = u.message;
    const text = msg.text || '';
    // si CHATID est défini, ignorer autres chats
    if (CHATID && String(msg.chat.id) !== String(CHATID)) { offset = u.update_id; continue; }

    try { gitSetup(); await handle(text); }
    catch (e) { console.error('ERR', e); try { await reply(`⚠️ ${e.message}`); } catch {} }

    offset = u.update_id;
  }
  saveOffset(offset);

  // commit l'offset s'il a changé
  try { sh('git add -A'); const st = sh('git status --porcelain'); if (st) { sh('git commit -m "chore: update telegram offset"'); sh('git push'); } } catch {}
}
main().catch(e => { console.error(e); process.exit(1); });
if (/^\/go\b/i.test(t)) {
  await reply('⚡ ELIOS exécute ton ordre, Maître.');
  const { execSync } = require('child_process');
  execSync('gh workflow run execute.yml', { stdio: 'inherit' });
  return;
}
