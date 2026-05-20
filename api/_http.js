function readRawBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body) {
      if (Buffer.isBuffer(req.body)) return resolve(req.body);
      if (typeof req.body === 'string') return resolve(Buffer.from(req.body));
      return resolve(Buffer.from(JSON.stringify(req.body)));
    }

    const chunks = [];
    req.on('data', chunk => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  const raw = await readRawBody(req);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch (_error) {
    return {};
  }
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : null;
}

function requireAdmin(req, res) {
  if (!process.env.ADMIN_PASSWORD) {
    sendJson(res, 500, { error: 'ADMIN_PASSWORD is not configured' });
    return false;
  }

  const password = req.headers['x-admin-password'];
  if (password !== process.env.ADMIN_PASSWORD) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return false;
  }

  return true;
}

function centsToAmount(value) {
  return (Number(value || 0) / 100).toFixed(2);
}

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

module.exports = {
  readRawBody,
  readJson,
  sendJson,
  getOrigin,
  getClientIp,
  requireAdmin,
  centsToAmount,
  csvEscape
};
