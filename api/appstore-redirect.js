module.exports = function handler(req, res) {
  // We use a 302 Found redirect to send the user to the App Store.
  // Because this request hits Vercel's servers, it will be logged in Vercel Analytics
  // completely bypassing any ad blockers the user might have installed.
  res.writeHead(302, {
    Location: 'https://apps.apple.com/us/app/stoic-widgets-daily-wisdom/id6769972958'
  });
  res.end();
};
