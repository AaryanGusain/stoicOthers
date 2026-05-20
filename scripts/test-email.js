require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { getDeliverables } = require('../api/_delivery');

const MOCK_ORDER = {
  id: 'test-preview-001',
  productId: 'complete_pack',
  productName: 'Stoic Meditations Complete Pack',
  customerEmail: 'aaryangusain134@gmail.com'
};

const ORIGIN = 'https://stoicmeditations.site';

async function main() {
  const deliverables = getDeliverables(MOCK_ORDER.productId, ORIGIN);
  const order = MOCK_ORDER;

  const buttonRows = deliverables
    .map(item => `
      <tr>
        <td style="padding: 8px 0;">
          <a href="${item.url}"
             style="display:inline-block; background:#2c2318; color:#f5f0e8; text-decoration:none;
                    font-family:Georgia,serif; font-size:15px; padding:12px 24px; border-radius:4px;">
            &#8595; ${item.label}
            <span style="font-size:12px; opacity:0.65; margin-left:6px;">${item.type}</span>
          </a>
        </td>
      </tr>`)
    .join('');

  const linksText = deliverables
    .map(item => `  • ${item.label} (${item.type})\n    ${item.url}`)
    .join('\n\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0; padding:0; background:#f5f0e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8; padding: 40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%; background:#fffdf8;
             border-radius:8px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#2c2318; padding:32px 40px; text-align:center;">
            <p style="margin:0; font-family:Georgia,serif; font-size:13px; letter-spacing:2px;
                      text-transform:uppercase; color:#c9b99a;">Stoic Meditations</p>
            <h1 style="margin:12px 0 0; font-family:Georgia,serif; font-weight:400; font-size:26px; color:#f5f0e8;">
              Your order is ready &#10022;
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px; font-family:Georgia,serif; font-size:17px; color:#1c1a17;">
              Thank you for your purchase!
            </p>
            <p style="margin:0 0 28px; font-family:Georgia,serif; font-size:15px; color:#4a4035; line-height:1.7;">
              Your copy of <strong>${order.productName}</strong> is ready to download.
              Click the buttons below &mdash; your files will download instantly.
            </p>
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              ${buttonRows}
            </table>
            <p style="margin:32px 0 0; border-top:1px solid #e8e0d4; padding-top:28px;
                      font-family:Georgia,serif; font-size:14px; color:#75695b;
                      font-style:italic; line-height:1.7; text-align:center;">
              &ldquo;Confine yourself to the present.&rdquo;<br>
              <span style="font-size:12px; font-style:normal;">&mdash; Marcus Aurelius</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f0e9dd; padding:20px 40px; text-align:center;">
            <p style="margin:0; font-family:Georgia,serif; font-size:12px; color:#9a8f82; line-height:1.6;">
              Questions? Just reply to this email &mdash; we&rsquo;re happy to help.<br>
              Order ID: <span style="font-family:monospace;">${order.id}</span>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Thank you for your purchase!\n\nYour copy of ${order.productName} is ready to download.\n\n${linksText}\n\n──────────────────────────────────────────\n"Confine yourself to the present." — Marcus Aurelius\n──────────────────────────────────────────\n\nQuestions? Just reply to this email — we're happy to help.\nOrder ID: ${order.id}\n\nStoic Meditations`;

  const from = process.env.EMAIL_FROM || 'Stoic Meditations <onboarding@resend.dev>';

  console.log('Sending test email to', order.customerEmail, '...');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: order.customerEmail,
      subject: `[TEST] Your download is ready — ${order.productName}`,
      html,
      text
    })
  });

  const result = await response.json();
  if (!response.ok) {
    console.error('Failed:', JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log('Test email sent! Resend ID:', result.id);
}

main().catch(e => { console.error(e); process.exit(1); });
