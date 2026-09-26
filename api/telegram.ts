// Vercel Serverless Function: envío a Telegram desde el servidor.
// POST /api/telegram  { text?: string, photo?: string (dataURL base64) }
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
      return res.status(503).json({ error: 'Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars' });
    }

    const { text, photo } = req.body || {};
    if (!text && !photo) {
      return res.status(400).json({ error: 'Missing text or photo' });
    }

    let tgRes: Response;
    if (photo) {
      const base64Data = String(photo).includes(',') ? String(photo).split(',')[1] : String(photo);
      const buffer = Buffer.from(base64Data, 'base64');
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('photo', new Blob([buffer], { type: 'image/png' }), 'pick.png');
      if (text) form.append('caption', String(text).slice(0, 1024));
      tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        body: form,
      });
    } else {
      tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
    }
    const data = await tgRes.json().catch(() => ({}));
    return res.status(tgRes.status).json(data);
  } catch (error) {
    console.error('[vercel] Telegram Error:', error);
    return res.status(500).json({ error: 'Failed to send Telegram message' });
  }
}
