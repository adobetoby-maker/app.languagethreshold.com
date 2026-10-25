
export default {
  async email(message, env, ctx) {
    const to = message.to || '';
    const from = message.from || '';
    const subject = message.headers.get('subject') || '(no subject)';
    const msgId = message.headers.get('message-id') || Date.now().toString();
    const ts = new Date().toISOString();

    // Always forward to personal inbox
    await message.forward('adobetoby@gmail.com');

    // Read email body (first 4000 chars)
    let body = '';
    try {
      const reader = message.raw.getReader();
      const chunks = [];
      let total = 0;
      while (total < 8000) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        total += value.length;
      }
      const raw = new TextDecoder().decode(
        chunks.reduce((a, b) => { const c = new Uint8Array(a.length + b.length); c.set(a); c.set(b, a.length); return c; }, new Uint8Array())
      );
      // Strip MIME headers — grab text after double newline
      const bodyStart = raw.indexOf('\r\n\r\n');
      body = bodyStart > -1 ? raw.slice(bodyStart + 4, bodyStart + 4000) : raw.slice(0, 4000);
    } catch (_) {}

    // Determine brand
    const isMedical = to.includes('medicalspanish') || subject.toLowerCase().includes('medical') || subject.toLowerCase().includes('construction');
    const fromAddr = isMedical
      ? 'Medical Spanish Support <hello@medicalspanish.app>'
      : 'Language Threshold Support <hello@languagethreshold.com>';
    const replyDomain = isMedical ? 'medicalspanish.app' : 'languagethreshold.com';

    const KB = `
Products:
- medicalspanish.app: Medical & construction Spanish vocabulary app. $19/mo or $12/mo annual. 7-day trial.
  Modules: medical (560+ terms), construction Spanish. Family plan: $39/mo (5 members). Kids plan: Junior Linguist $79/yr.
- app.languagethreshold.com: 660+ lessons, AI tutor, spaced repetition. Login with Google/Apple/email.
- juniorlinguist.app: Kids-focused Spanish learning, username + PIN login, parents add kids via Family Setup page.

Common issues:
- Can't login: Clear browser cache; try Google/Apple login; reset password at /reset-password
- Subscription not active: Payment needs manual link; ask for email + Stripe receipt
- Cancel subscription: Account → Cancel. Access continues until end of billing period.
- Refund: Full refund within 7 days of payment
- Family plan: Subscribe to Family plan, then /family-setup to add up to 5 kids
- Not seeing purchased content: Log out and back in; if persists reply with email used
- Offline/download: Not available; PWA install (Add to Home Screen) for basics
- Price: Monthly $19, Annual $12/mo ($144/yr), Family $39/mo, Kids $79/yr
`;

    // Claude triage
    let triage = { confidence: 'LOW', category: 'general', summary: subject, auto_reply: '', escalate_reason: 'Triage not attempted', sender_first_name: '' };
    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `You are support AI for ${replyDomain}.

KNOWLEDGE BASE:
${KB}

EMAIL:
From: ${from}
Subject: ${subject}
Body excerpt: ${body.slice(0, 800)}

Triage and respond. Return JSON only:
{
  "category": "billing|technical|general|feedback|spam",
  "confidence": "HIGH|LOW|SPAM",
  "summary": "one sentence",
  "auto_reply": "full reply text if HIGH confidence, else empty string",
  "escalate_reason": "why human needed if LOW",
  "sender_first_name": "guess from email/name"
}`
          }],
        }),
      });
      const claudeJson = await claudeRes.json();
      const content = claudeJson.content?.[0]?.text || '';
      const match = content.match(/\{[\s\S]*\}/);
      if (match) triage = JSON.parse(match[0]);
    } catch (e) {
      triage.escalate_reason = 'Claude triage error: ' + String(e);
    }

    // Auto-reply via Resend if HIGH confidence
    let autoReplied = false;
    if (triage.confidence === 'HIGH' && triage.auto_reply) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddr,
            to: [from],
            subject: `Re: ${subject}`,
            text: triage.auto_reply,
          }),
        });
        autoReplied = true;
      } catch (_) {}
    }

    // Store in KV for brief
    const entry = {
      msgId,
      from,
      subject,
      ts,
      confidence: triage.confidence,
      category: triage.category,
      summary: triage.summary,
      autoReplied,
      escalated: triage.confidence === 'LOW',
    };

    // Append to recent index (last 100)
    let recent = [];
    try {
      const existing = await env.APP_SUPPORT.get('index:recent');
      if (existing) recent = JSON.parse(existing);
    } catch (_) {}
    recent.unshift(entry);
    if (recent.length > 100) recent = recent.slice(0, 100);
    await env.APP_SUPPORT.put('index:recent', JSON.stringify(recent));
    await env.APP_SUPPORT.put(`email:${msgId}`, JSON.stringify({ ...entry, body: body.slice(0, 500) }));
  }
};
