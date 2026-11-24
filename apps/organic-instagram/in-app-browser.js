(function (global) {
  "use strict";

  var META_BROWSER_PATTERN = /Instagram|Threads|Barcelona|FBAN|FBAV|FBIOS|FB_IAB|FB4A|MessengerForiOS|Messenger/i;
  var INSTAGRAM_PATTERN = /Instagram|Threads|Barcelona/i;
  var FACEBOOK_PATTERN = /FBAN|FBAV|FBIOS|FB_IAB|FB4A|MessengerForiOS|Messenger/i;

  function userAgent() {
    return (global.navigator && global.navigator.userAgent) || "";
  }

  function isInstagram() {
    return INSTAGRAM_PATTERN.test(userAgent());
  }

  function isFacebook() {
    return FACEBOOK_PATTERN.test(userAgent());
  }

  function isMetaInAppBrowser() {
    return META_BROWSER_PATTERN.test(userAgent());
  }

  function isIOS() {
    var ua = userAgent();
    var platform = (global.navigator && global.navigator.platform) || "";
    var touchPoints = (global.navigator && global.navigator.maxTouchPoints) || 0;
    return /iPhone|iPad|iPod/i.test(ua) || (/Mac/i.test(platform) && touchPoints > 1);
  }

  function isAndroid() {
    return /Android/i.test(userAgent());
  }

  function androidIntent(url) {
    var parsed = new URL(url);
    var target = parsed.host + parsed.pathname + parsed.search + parsed.hash;
    return "intent://" + target + "#Intent;scheme=" + parsed.protocol.replace(":", "") + ";end";
  }

  function createEscapeAttempt(options) {
    var destination = options.destination;
    var fallbackDelay = options.fallbackDelay || 1500;
    var onFallback = options.onFallback || function () {};
    var finished = false;
    var timer;

    function cleanup() {
      global.clearTimeout(timer);
      global.document.removeEventListener("visibilitychange", handleVisibility);
      global.removeEventListener("pagehide", succeed);
      global.removeEventListener("blur", succeed);
    }

    function succeed() {
      if (finished) return;
      finished = true;
      cleanup();
    }

    function handleVisibility() {
      if (global.document.hidden) succeed();
    }

    global.document.addEventListener("visibilitychange", handleVisibility);
    global.addEventListener("pagehide", succeed, { once: true });
    global.addEventListener("blur", succeed, { once: true });
    timer = global.setTimeout(function () {
      if (finished) return;
      finished = true;
      cleanup();
      onFallback(destination);
    }, fallbackDelay);

    return { cleanup: cleanup };
  }

  function openOutsideMeta(destination, options) {
    var settings = options || {};
    var attempt = createEscapeAttempt({
      destination: destination,
      fallbackDelay: settings.fallbackDelay,
      onFallback: settings.onFallback
    });

    // Keep this navigation synchronous inside the user's click handler. iOS
    // will discard a custom-scheme handoff if it happens after an async task.
    if (isAndroid()) {
      global.location.href = androidIntent(destination);
    } else if (isIOS() && isInstagram()) {
      global.location.href = "instagram://extbrowser/?url=" + encodeURIComponent(destination);
    } else if (isIOS() && isFacebook()) {
      global.open("x-safari-" + destination, "_blank");
    } else {
      global.location.href = destination;
    }

    return attempt;
  }

  function bindDownloadLinks(options) {
    var settings = options || {};
    var links = global.document.querySelectorAll(settings.selector || "[data-download-link]");

    Array.prototype.forEach.call(links, function (link) {
      link.addEventListener("click", function (event) {
        if (!isMetaInAppBrowser()) return;
        event.preventDefault();
        openOutsideMeta(link.href, settings);
      });
    });
  }

  global.MetaBrowserEscape = {
    bindDownloadLinks: bindDownloadLinks,
    isAndroid: isAndroid,
    isFacebook: isFacebook,
    isIOS: isIOS,
    isInstagram: isInstagram,
    isMetaInAppBrowser: isMetaInAppBrowser,
    openOutsideMeta: openOutsideMeta
  };
})(window);
