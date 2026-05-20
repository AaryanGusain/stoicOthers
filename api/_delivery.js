const { prisma } = require('./_prisma');
const { PRODUCTS } = require('./_products');

function absoluteUrl(origin, href) {
  return new URL(href, origin).toString();
}

function getDeliverables(productId, origin) {
  const product = PRODUCTS[productId];
  if (!product) return [];
  return product.deliverables.map(item => ({
    ...item,
    url: absoluteUrl(origin, item.href)
  }));
}

function buildDeliveryEmail(order, origin) {
  const deliverables = getDeliverables(order.productId, origin);

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

        <!-- Header -->
        <tr>
          <td style="background:#2c2318; padding:32px 40px; text-align:center;">
            <p style="margin:0; font-family:Georgia,serif; font-size:13px; letter-spacing:2px;
                      text-transform:uppercase; color:#c9b99a;">Stoic Meditations</p>
            <h1 style="margin:12px 0 0; font-family:Georgia,serif; font-weight:400; font-size:26px; color:#f5f0e8;">
              Your order is ready ✦
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px; font-family:Georgia,serif; font-size:17px; color:#1c1a17;">
              Thank you for your purchase!
            </p>
            <p style="margin:0 0 28px; font-family:Georgia,serif; font-size:15px; color:#4a4035; line-height:1.7;">
              Your copy of <strong>${order.productName}</strong> is ready to download.
              Click the button${deliverables.length > 1 ? 's' : ''} below — your files will download instantly.
            </p>

            <!-- Download buttons -->
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              ${buttonRows}
            </table>

            <!-- Divider -->
            <tr><td style="padding:32px 0 0;">
              <hr style="border:none; border-top:1px solid #e8e0d4; margin:0;">
            </td></tr>

            <!-- Stoic quote -->
            <p style="margin:28px 0 0; font-family:Georgia,serif; font-size:14px; color:#75695b;
                      font-style:italic; line-height:1.7; text-align:center;">
              "Confine yourself to the present."<br>
              <span style="font-size:12px; font-style:normal;">— Marcus Aurelius</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f0e9dd; padding:20px 40px; text-align:center;">
            <p style="margin:0; font-family:Georgia,serif; font-size:12px; color:#9a8f82; line-height:1.6;">
              Questions? Just reply to this email — we're happy to help.<br>
              Order ID: <span style="font-family:monospace;">${order.id}</span>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Thank you for your purchase!

Your copy of ${order.productName} is ready to download.

${linksText}

──────────────────────────────────────────
"Confine yourself to the present." — Marcus Aurelius
──────────────────────────────────────────

Questions? Just reply to this email — we're happy to help.
Order ID: ${order.id}

Stoic Meditations`;

  return {
    subject: `Your download is ready — ${order.productName}`,
    html,
    text
  };
}

async function sendDeliveryEmail(order, origin) {
  if (order.deliveryStatus === 'sent') {
    return { skipped: true, reason: 'already_sent' };
  }

  if (!process.env.EMAIL_API_KEY) {
    await prisma.digitalOrder.update({
      where: { id: order.id },
      data: {
        deliveryStatus: 'skipped',
        deliveryError: 'EMAIL_API_KEY is not configured'
      }
    });
    return { skipped: true, reason: 'EMAIL_API_KEY is not configured' };
  }

  const email = buildDeliveryEmail(order, origin);
  const from = process.env.EMAIL_FROM || 'Stoic Meditations <onboarding@resend.dev>';

  const delivery = await prisma.delivery.create({
    data: {
      digitalOrderId: order.id,
      email: order.customerEmail,
      status: 'pending',
      provider: 'resend'
    }
  });

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: order.customerEmail,
        subject: email.subject,
        html: email.html,
        text: email.text
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || 'Resend delivery failed');
    }

    await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'sent',
        providerId: result.id || null,
        sentAt: new Date()
      }
    });

    await prisma.digitalOrder.update({
      where: { id: order.id },
      data: {
        deliveryStatus: 'sent',
        deliveryEmailSentAt: new Date(),
        deliveryError: null
      }
    });

    return { sent: true };
  } catch (error) {
    const message = error && error.message ? error.message : 'Delivery failed';

    await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'failed',
        error: message
      }
    });

    await prisma.digitalOrder.update({
      where: { id: order.id },
      data: {
        deliveryStatus: 'failed',
        deliveryError: message
      }
    });

    throw error;
  }
}

module.exports = {
  getDeliverables,
  sendDeliveryEmail
};
