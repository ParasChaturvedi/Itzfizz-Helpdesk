/**
 * WhatsApp notifications — best-effort, never throws (like email).
 *
 * Provider order (auto-selected):
 *  1. Meta WhatsApp Cloud API — set WHATSAPP_TOKEN + WHATSAPP_PHONE_ID.
 *     • If WHATSAPP_TEMPLATE_NAME is set, a pre-approved *template* message is
 *       sent (required for proactive/business-initiated notifications). The
 *       message text is passed as the template's single {{1}} body parameter.
 *     • Otherwise a free-form text message is sent (only delivered inside the
 *       24-hour customer-service window).
 *     Sends to any user's `phone` — no per-user setup. Free tier ~1,000/month.
 *  2. CallMeBot — per-user `whatsappApiKey` + `phone`. Fully free; each teammate
 *     opts in once by messaging the CallMeBot number.
 *
 * If nothing is configured it just logs — the ticket flow is never blocked.
 */

const GRAPH = 'https://graph.facebook.com/v20.0';

async function sendViaMeta(digits, message) {
  const useTemplate = !!process.env.WHATSAPP_TEMPLATE_NAME;
  const body = useTemplate
    ? {
        messaging_product: 'whatsapp',
        to: digits,
        type: 'template',
        template: {
          name: process.env.WHATSAPP_TEMPLATE_NAME,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: message }] },
          ],
        },
      }
    : {
        messaging_product: 'whatsapp',
        to: digits,
        type: 'text',
        text: { body: message },
      };

  const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true, provider: useTemplate ? 'meta-template' : 'meta-text' };
  const detail = await res.text().catch(() => '');
  console.error('[whatsapp:meta] failed', res.status, detail.slice(0, 300));
  return null;
}

async function sendWhatsApp(user, message) {
  if (!user || !user.phone) return { ok: false, provider: 'none' };
  const clean = String(user.phone).replace(/[^\d+]/g, '');
  const digits = clean.replace(/^\+/, ''); // Meta wants digits without '+'

  try {
    if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
      const meta = await sendViaMeta(digits, message);
      if (meta) return meta;
      // fall through to CallMeBot if Meta failed
    }

    if (user.whatsappApiKey) {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
        clean
      )}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(user.whatsappApiKey)}`;
      const res = await fetch(url);
      if (res.ok) return { ok: true, provider: 'callmebot' };
      console.error('[whatsapp:callmebot] failed', res.status);
    }

    console.log(`[whatsapp:noop] To: ${clean} | ${message}`);
    return { ok: false, provider: 'unconfigured' };
  } catch (err) {
    console.error('[whatsapp] send failed:', err.message);
    return { ok: false, provider: 'error', error: err.message };
  }
}

module.exports = { sendWhatsApp };
