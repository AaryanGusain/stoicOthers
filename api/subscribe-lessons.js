const fs = require('fs');
const path = require('path');
const { readJson, sendJson, getClientIp } = require('./_http');
const { prisma } = require('./_prisma');

function cleanString(value, max = 500) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

async function recordSubscriber(email, req, body) {
  const ipCountryHeader = req.headers['x-vercel-ip-country'];
  const ipCountry = typeof ipCountryHeader === 'string' && ipCountryHeader.length === 2
    ? ipCountryHeader.toUpperCase()
    : null;
  const now = new Date();

  const baseFields = {
    source: cleanString(body.source, 80) || 'main_home_signup',
    ipCountry,
    ipAddress: getClientIp(req),
    userAgent: cleanString(req.headers['user-agent'], 1000),
    referrer: cleanString(body.referrer || req.headers.referer, 1000),
    utmSource: cleanString(body.utm_source, 160),
    utmMedium: cleanString(body.utm_medium, 160),
    utmCampaign: cleanString(body.utm_campaign, 240),
    utmContent: cleanString(body.utm_content, 240),
    utmTerm: cleanString(body.utm_term, 240),
    lessonsSentAt: now
  };

  try {
    await prisma.subscriber.upsert({
      where: { email },
      update: {
        ...baseFields,
        signupCount: { increment: 1 }
      },
      create: {
        email,
        ...baseFields
      }
    });
  } catch (error) {
    console.error('subscribe-lessons: failed to persist subscriber', error && error.message);
  }
}

function cleanEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || '');
}

function parseLesson(markdown, file) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { subject: 'Five Free Stoic Lessons', preview: '', body: markdown, slug: file };
  }

  const meta = {};
  match[1].split('\n').forEach(line => {
    const index = line.indexOf(':');
    if (index === -1) return;
    meta[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  });

  return {
    subject: meta.subject || 'Five Free Stoic Lessons',
    preview: meta.preview || '',
    body: match[2].trim(),
    slug: file
  };
}

function markdownToHtml(markdown) {
  const blocks = markdown.split(/\n{2,}/);
  return blocks.map(block => {
    if (block.startsWith('# ')) return `<h2 class="lesson-title">${inlineMarkdown(block.slice(2))}</h2>`;
    if (block.startsWith('> ')) {
      return `<blockquote>${inlineMarkdown(block.replace(/^> ?/gm, '')).replace(/\n/g, '<br>')}</blockquote>`;
    }
    if (block.startsWith('Stoic Meditations')) return '';
    if (block.startsWith('P.S.')) return `<p class="postscript">${inlineMarkdown(block)}</p>`;
    if (block.startsWith('**Try this today.**')) return `<div class="practice">${inlineMarkdown(block).replace(/\n/g, '<br>')}</div>`;
    return `<p>${inlineMarkdown(block).replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadLessons() {
  const dir = path.join(process.cwd(), 'newsletters');
  return fs.readdirSync(dir)
    .filter(file => /^\d+-.+\.md$/.test(file))
    .sort()
    .map(file => parseLesson(fs.readFileSync(path.join(dir, file), 'utf8'), file));
}

function buildLessonsHtml(lessons) {
  const sections = lessons.map((lesson, index) => `
    <section class="lesson">
      <div class="lesson-kicker">Lesson ${index + 1} of ${lessons.length}</div>
      ${markdownToHtml(lesson.body)}
    </section>
  `).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; background: #f6f1e7; color: #1c1a17; }
    .shell { max-width: 720px; margin: 0 auto; padding: 32px 18px; font-family: Georgia, 'Times New Roman', serif; line-height: 1.64; }
    .header { text-align: center; padding: 28px 22px 24px; border: 1px solid #c8bda7; background: #ede5d3; }
    .brand { font-size: 13px; letter-spacing: 0.24em; text-transform: uppercase; color: #6b4d2a; font-family: Arial, sans-serif; }
    h1 { margin: 12px 0 8px; font-size: 38px; line-height: 1.04; font-weight: 500; }
    .intro { margin: 0 auto; max-width: 520px; color: #75695b; font-size: 18px; }
    .lesson { margin-top: 22px; padding: 28px 24px; border: 1px solid #c8bda7; background: rgba(255,255,255,0.34); }
    .lesson-kicker { margin-bottom: 8px; font: 700 11px Arial, sans-serif; letter-spacing: 0.22em; text-transform: uppercase; color: #6b4d2a; }
    .lesson-title { margin: 0 0 14px; font-size: 30px; line-height: 1.08; font-weight: 500; color: #1c1a17; }
    p { margin: 0 0 16px; font-size: 18px; }
    blockquote { margin: 22px 0; padding: 18px 20px; border-left: 3px solid #c9a253; background: #f0e9d8; color: #1c1a17; font-size: 19px; font-style: italic; }
    .practice { margin: 22px 0 16px; padding: 18px 20px; background: #1c1a17; color: #f6f1e7; font-size: 18px; }
    .practice strong { color: #c9a253; }
    .postscript { color: #75695b; font-size: 16px; }
    a { color: #6b4d2a; text-decoration: underline; text-underline-offset: 3px; }
    .footer { text-align: center; color: #75695b; font: 12px Arial, sans-serif; letter-spacing: 0.12em; text-transform: uppercase; padding: 26px 12px 6px; }
    @media (max-width: 560px) {
      h1 { font-size: 31px; }
      .lesson-title { font-size: 26px; }
      .lesson { padding: 22px 18px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="header">
      <div class="brand">Stoic Meditations</div>
      <h1>Five FREE Stoic Lessons</h1>
      <p class="intro">All five lessons are below, sent at once. Read them in order, or save this email and return when you have ten quiet minutes.</p>
    </div>
    ${sections}
    <div class="footer">You requested these lessons at stoicmeditations.site</div>
  </div>
</body>
</html>`;
}

function buildLessonsText(lessons) {
  return [
    'Five FREE Stoic Lessons',
    'All five lessons are below, sent at once.',
    '',
    ...lessons.flatMap((lesson, index) => [
      `LESSON ${index + 1}: ${lesson.subject}`,
      lesson.preview,
      '',
      lesson.body,
      ''
    ]),
    'You requested these lessons at stoicmeditations.site.'
  ].join('\n');
}

async function sendLessonsEmail(email, lessons) {
  const from = process.env.EMAIL_FROM || 'Stoic Meditations <onboarding@resend.dev>';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.EMAIL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Five FREE Stoic Lessons',
      html: buildLessonsHtml(lessons),
      text: buildLessonsText(lessons)
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Lesson email failed');
  }
  return result;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  if (!process.env.EMAIL_API_KEY) {
    return sendJson(res, 500, { error: 'EMAIL_API_KEY is not configured' });
  }

  const body = await readJson(req);
  const email = cleanEmail(body.email || body.email_address);

  if (!isValidEmail(email)) {
    return sendJson(res, 400, { error: 'A valid email is required' });
  }

  try {
    const lessons = loadLessons();
    await sendLessonsEmail(email, lessons);
    await recordSubscriber(email, req, body);
    return sendJson(res, 200, { ok: true, sent: 1, lessons: lessons.length });
  } catch (error) {
    return sendJson(res, 502, {
      error: 'Could not send lessons',
      message: error && error.message ? error.message : 'Unknown error'
    });
  }
};
