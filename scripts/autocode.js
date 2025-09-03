// trigger autocode
// test auto-run
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'generated');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = path.join(outDir, `auto_${stamp}.md`);

const body = [
  '# Auto-code ELIOS',
  `- ts: ${new Date().toISOString()}`,
  `- sig: ∞.je.toi.nous.432.528`,
  `- note: fichier généré automatiquement`
].join('\n');

fs.writeFileSync(file, body, { encoding: 'utf-8' });
console.log('✅ Fichier généré:', file);

// Notif Telegram (optionnelle, prête)
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
async function notify(text){
  if(!token || !chatId){ console.log('Telegram non configuré.'); return; }
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({chat_id:chatId, text}) });
}
await notify(`⚡ ELIOS Autocode\nFichier: ${path.basename(file)}\nDossier: generated/\nRepo: ${process.env.GITHUB_REPOSITORY||''}`);
