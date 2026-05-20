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
  const linksHtml = deliverables
    .map(item => `<li><a href="${item.url}">${item.label}</a> <span style="color:#75695b">(${item.type})</span></li>`)
    .join('');
  const linksText = deliverables
    .map(item => `- ${item.label}: ${item.url}`)
    .join('\n');

  return {
    subject: `Your Stoic Meditations download: ${order.productName}`,
    html: `
      <div style="font-family: Georgia, serif; color: #1c1a17; line-height: 1.55;">
        <h1 style="font-weight: 500;">Your download is ready</h1>
        <p>Thank you for purchasing ${order.productName}. Use the links below to download your files.</p>
        <ul>${linksHtml}</ul>
        <p style="color:#75695b">Order ID: ${order.id}</p>
      </div>
    `,
    text: `Your download is ready\n\n${linksText}\n\nOrder ID: ${order.id}`
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
