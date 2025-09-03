export async function sendTelegram(title, text, extra = null) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.log("Telegram non configuré."); return false; }
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = { chat_id: chatId, text: `⚡ ${title}\n${text}${extra ? "\n---\n"+JSON.stringify(extra,null,2) : ""}` };
  const res = await fetch(url,{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  console.log("Telegram:", res.status); return res.ok;
}
