import crypto from 'node:crypto';
import { sendTelegram } from './telegram.js';

const payload = {
  uuid: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  source: "GitHubActions",
  frequency: "432.528 Hz",
  repo: process.env.GITHUB_REPOSITORY || "",
};
await sendTelegram("ELIOS Cycle", `Résonance active pour ${payload.repo} @ ${payload.frequency}`, payload);
console.log("Cycle ELIOS terminé.");
