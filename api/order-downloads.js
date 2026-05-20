const { prisma } = require('./_prisma');
const { getDeliverables } = require('./_delivery');
const { sendJson, getOrigin } = require('./_http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const orderId = req.query && typeof req.query.order_id === 'string' ? req.query.order_id.trim() : '';
  if (!orderId) {
    return sendJson(res, 400, { error: 'Missing order_id' });
  }

  const order = await prisma.digitalOrder.findUnique({
    where: { id: orderId }
  });

  if (!order || order.status !== 'paid') {
    return sendJson(res, 404, { error: 'Paid order not found' });
  }

  return sendJson(res, 200, {
    product: order.productId,
    title: order.productName,
    order_id: order.id,
    deliverables: getDeliverables(order.productId, getOrigin(req))
  });
};
