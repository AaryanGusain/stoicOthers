function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return 'the end of your paid period';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function planLabel(plan) {
  return plan === 'annual' ? 'Annual · $49.99 per year' : 'Weekly · $4.99 per week';
}

function emailFrame(title, intro, buttonLabel, buttonUrl, detail) {
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f6f1e7;color:#1c1a17;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e7;padding:36px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fffbf3;border:1px solid #d8cdb8;border-radius:18px;overflow:hidden">
        <tr><td style="background:#1c1a17;padding:28px 34px;text-align:center;color:#fbf7ef">
          <div style="font-family:Georgia,serif;font-size:14px;letter-spacing:1.6px;text-transform:uppercase;color:#c9a253">Stoic Widgets</div>
          <h1 style="margin:12px 0 0;font-family:Georgia,serif;font-size:30px;line-height:1.05;font-weight:600">${title}</h1>
        </td></tr>
        <tr><td style="padding:32px 34px">
          <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#3f382f">${intro}</p>
          ${buttonUrl ? `<p style="margin:0 0 24px"><a href="${buttonUrl}" style="display:inline-block;padding:14px 22px;border-radius:12px;background:#6b4d2a;color:#fff;text-decoration:none;font-weight:700">${buttonLabel}</a></p>` : ''}
          <p style="margin:0;padding-top:20px;border-top:1px solid #d8cdb8;font-size:13px;line-height:1.55;color:#75695b">${detail}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildSubscriptionEmail(type, subscription, origin, tokens = {}) {
  const successUrl = tokens.claimToken
    ? `${origin}/funnel/success#token=${encodeURIComponent(tokens.claimToken)}&email=${encodeURIComponent(subscription.email)}${tokens.manageToken ? `&manage=${encodeURIComponent(tokens.manageToken)}` : ''}`
    : null;
  const manageUrl = tokens.manageToken
    ? `${origin}/funnel/manage#token=${encodeURIComponent(tokens.manageToken)}`
    : `${origin}/funnel/manage`;
  const periodEnd = formatDate(subscription.currentPeriodEnd);

  if (type === 'activation') {
    return {
      subject: 'Activate your Stoic Widgets Pro access',
      html: emailFrame(
        'Your Pro access is ready.',
        `Your ${planLabel(subscription.plan)} subscription is active. Open the secure link below, sign in to Stoic Widgets, and connect this purchase to your account.`,
        'Open Stoic Widgets and activate',
        successUrl,
        `Your current paid period runs through ${periodEnd}. You can manage or cancel future renewals at <a href="${manageUrl}" style="color:#6b4d2a">this secure management link</a>.`
      ),
      text: `Your Stoic Widgets Pro access is ready.\n\nActivate: ${successUrl}\n\nPlan: ${planLabel(subscription.plan)}\nAccess through: ${periodEnd}\nManage: ${manageUrl}`
    };
  }

  if (type === 'recovery') {
    return {
      subject: 'Your secure Stoic Widgets subscription links',
      html: emailFrame(
        'Your secure links are ready.',
        'Use the activation link to reconnect Pro inside the app. Use the management link to view or cancel future renewals.',
        'Open activation link',
        successUrl,
        `Manage this subscription at <a href="${manageUrl}" style="color:#6b4d2a">this secure management link</a>. These links expire and can be requested again.`
      ),
      text: `Stoic Widgets subscription links\n\nActivate: ${successUrl}\nManage: ${manageUrl}`
    };
  }

  if (type === 'cancelled') {
    return {
      subject: 'Your Stoic Widgets renewal is canceled',
      html: emailFrame(
        'Future renewals are canceled.',
        `You will not be charged again. Stoic Widgets Pro remains available through ${periodEnd}.`,
        'View subscription',
        manageUrl,
        'If this was a mistake, you can start a new subscription after the current paid period ends.'
      ),
      text: `Your Stoic Widgets renewal is canceled.\n\nAccess continues through ${periodEnd}.\nManage: ${manageUrl}`
    };
  }

  return {
    subject: 'Stoic Widgets payment needs attention',
    html: emailFrame(
      'A renewal payment needs attention.',
      'Razorpay could not complete the latest renewal. It may retry automatically. Your subscription page will show the current status.',
      'View subscription',
      manageUrl,
      `If the payment remains unresolved, Pro access ends after ${periodEnd}.`
    ),
    text: `A Stoic Widgets renewal payment needs attention.\n\nView subscription: ${manageUrl}\nAccess through: ${periodEnd}`
  };
}

async function sendSubscriptionEmail(type, subscription, origin, tokens = {}) {
  if (!process.env.EMAIL_API_KEY) {
    return { skipped: true, reason: 'EMAIL_API_KEY is not configured' };
  }

  const email = buildSubscriptionEmail(type, subscription, origin, tokens);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Stoic Widgets <onboarding@resend.dev>',
      to: subscription.email,
      subject: email.subject,
      html: email.html,
      text: email.text
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Subscription email delivery failed');
  }
  return { sent: true, providerId: result.id || null };
}

module.exports = {
  buildSubscriptionEmail,
  sendSubscriptionEmail
};
