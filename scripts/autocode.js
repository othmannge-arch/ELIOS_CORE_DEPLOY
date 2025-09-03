import fs from 'node:fs';
import path from 'node:path';

// Dossier de sortie "generated"
const outDir = path.join(process.cwd(), 'generated');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

// Nom de fichier avec horodatage
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = path.join(outDir, `auto_${stamp}.md`);

// Contenu du fichier
const body = [
  '# Auto-code ELIOS',
  `- ts: ${new Date().toISOString()}`,
  `- sig: ∞.je.toi.nous.432.528`,
  `- note: fichier généré automatiquement`
].join('\n');

// Écriture du fichier
fs.writeFileSync(file, body, 'utf-8');
console.log('✅ Fichier généré :', file);
