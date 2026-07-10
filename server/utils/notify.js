/**
 * WhatsApp notifications — best-effort, never throws (like email).
 *
 * Supports two free-friendly providers, chosen automatically:
 *  1. Meta WhatsApp Cloud API  — set WHATSAPP_TOKEN + WHATSAPP_PHONE_ID (env).
 *     Sends to any user's `phone`. Free tier: 1,000 conversations/month.
 *  2. CallMeBot                — per-user `whatsappApiKey` + `phone`. Fully free
 *     for personal/internal alerts. Each teammate gets their own key once by
 *     messaging the CallMeBot number (see README).
 *
 * If neither is configured, it just logs — nothing breaks.
 */

async function sendWhatsApp(user, message) {
  if (!user || !user.phone) return { ok: false, provider: 'none' };
  const to = String(user.phone).replace(/[^\d+]/g, '');

  try {
    // Provider 1: Meta WhatsApp Cloud API
    if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to.replace('+', ''),
            type: 'text',
            text: { body: message },
          }),
        }
      );
      if (res.ok) return { ok: true, provider: 'meta' };
      console.error('[whatsapp:meta] failed', res.status);
    }

    // Provider 2: CallMeBot (per-user key)
    if (user.whatsappApiKey) {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
        to
      )}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(user.whatsappApiKey)}`;
      const res = await fetch(url);
      if (res.ok) return { ok: true, provider: 'callmebot' };
      console.error('[whatsapp:callmebot] failed', res.status);
    }

    console.log(`[whatsapp:noop] To: ${to} | ${message}`);
    return { ok: false, provider: 'unconfigured' };
  } catch (err) {
    console.error('[whatsapp] send failed:', err.message);
    return { ok: false, provider: 'error', error: err.message };
  }
}

module.exports = { sendWhatsApp };
