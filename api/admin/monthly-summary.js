const { prisma } = require('../_prisma');
const { requireAdmin, sendJson } = require('../_http');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const summaries = await prisma.monthlySummary.findMany({
    orderBy: { month: 'desc' },
    take: 24
  });

  return sendJson(res, 200, { summaries });
};
