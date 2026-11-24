(function () {
  "use strict";

  var STORAGE_KEY = "stoic_widgets_web_funnel_v1";
  var INTRO_SESSION_KEY = "stoic_widgets_web_funnel_intro_seen";
  var TOTAL_STEPS = 22;
  var INTRO_DURATION = 2600;
  var LOADING_STAGE_DURATION = 3200;
  var LOADING_DURATION = LOADING_STAGE_DURATION * 3;
  var LOADING_COMPLETE_HOLD = 400;
  var LOADING_STAGES = [
    { label: "Matching your widget" },
    { label: "Building your theme" },
    { label: "Setting your rhythm" }
  ];
  var HOME_SCREEN_ICONS = [
    { id: "calendar", label: "Calendar", dock: false },
    { id: "notes", label: "Notes", dock: false },
    { id: "maps", label: "Maps", dock: false },
    { id: "camera", label: "Camera", dock: false },
    { id: "phone", label: "Phone", dock: true },
    { id: "safari", label: "Safari", dock: true },
    { id: "messages", label: "Messages", dock: true },
    { id: "music", label: "Music", dock: true }
  ];
  var app = document.getElementById("app");
  var introFrame = null;
  var introCompletionTimer = null;
  var loadingFrame = null;
  var loadingCompletionTimer = null;
  var autoAdvanceTimer = null;
  var lastLoadingPercent = -1;
  var lastLoadingAnnouncement = -1;
  var checkoutOpened = false;
  var completed = false;
  var preloadedAssets = {};

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  var QUOTES = [
    { id: "epictetus", text: "Of things some are in our power, and others are not.", author: "Epictetus", cite: "Enchiridion 1 · trans. George Long, 1890" },
    { id: "marcus", text: "The happiness of thy life depends upon the quality of thy thoughts.", author: "Marcus Aurelius", cite: "Meditations 5.16 · trans. George Long, 1862" },
    { id: "seneca", text: "We suffer more often in imagination than in reality.", author: "Seneca", cite: "Moral Letters 13.4 · trans. R. M. Gummere, 1917" }
  ];

  var WIDGETS = [
    { id: "daily_quote", appType: "quotes", label: "Daily Quote", detail: "A Stoic thought that changes with your rhythm." },
    { id: "sisyphus", appType: "sisyphus", label: "Sisyphus", detail: "A visual nudge to keep going." },
    { id: "memento_mori", appType: "memento", label: "Memento Mori", detail: "A clear view of the time still yours." },
    { id: "retro", appType: "retro", label: "Retro Memento Mori", detail: "Today, this year, and life in the app's retro grid." },
    { id: "year_progress", appType: "year", label: "Year Progress", detail: "Every day of this year, at a glance." }
  ];

  var THEME_BUNDLES = [
    { id: "discipline", label: "Discipline", detail: "Iron, fire, and the will to continue." },
    { id: "solitude", label: "Solitude", detail: "Still water, fog, and room to think." },
    { id: "philosophers", appCategory: "wisdom", label: "Philosophers", detail: "Marble, parchment, and the old voices." }
  ];

  function theme(id, name, bundle, fontId, overlay) {
    return { id: id, name: name, bundle: bundle, fontId: fontId, overlay: overlay, image: "/funnel/assets/themes/" + id + ".webp" };
  }

  var THEMES = [
    theme("discipline-spartan-helmet-stone", "Spartan Helmet", "discipline", "typewriter", 0.28),
    theme("discipline-forge-anvil-sparks", "The Forge", "discipline", "typewriter", 0.30),
    theme("discipline-gladius-on-stone", "Gladius", "discipline", "playfair", 0.32),
    theme("discipline-centurion-back", "Centurion", "discipline", "playfair", 0.34),
    theme("discipline-bronze-chestplate", "Bronze Armor", "discipline", "playfair", 0.34),
    theme("discipline-helmet-plume-side", "Crimson Plume", "discipline", "playfair", 0.30),
    theme("discipline-aquila-standard", "Aquila", "discipline", "garamond", 0.34),
    theme("discipline-boxer-hands-wrapped", "Wrapped Hands", "discipline", "roboto", 0.34),
    theme("discipline-torch-on-wall", "Wall Torch", "discipline", "garamond", 0.28),
    theme("discipline-aurelius-equestrian-night", "Emperor at Night", "discipline", "garamond", 0.34),
    theme("discipline-storm-cliffs", "Storm Cliffs", "discipline", "garamond", 0.28),
    theme("discipline-cold-discipline", "Cold Resolve", "discipline", "roboto", 0.28),
    theme("solitude-lone-monk-bridge", "The Long Bridge", "solitude", "handwritten", 0.18),
    theme("solitude-lighthouse-dawn", "Lighthouse Dawn", "solitude", "playfair", 0.18),
    theme("solitude-empty-dock-lake", "Empty Dock", "solitude", "handwritten", 0.28),
    theme("solitude-single-tree-hill", "Single Tree", "solitude", "script", 0.68),
    theme("solitude-rowboat-still-water", "Still Water", "solitude", "handwritten", 0.20),
    theme("solitude-lone-fisherman-dawn", "Fisherman at Dawn", "solitude", "playfair", 0.20),
    theme("solitude-snowy-pass-hiker", "Snow Pass", "solitude", "roboto", 0.20),
    theme("solitude-foggy-forest-path", "Forest Path", "solitude", "garamond", 0.24),
    theme("solitude-rain-window-chair", "Rain Window", "solitude", "script", 0.28),
    theme("solitude-shore-footprints-dusk", "Footprints at Dusk", "solitude", "handwritten", 0.30),
    theme("solitude-cliff-edge-figure", "At the Edge", "solitude", "playfair", 0.22),
    theme("solitude-cliffside-monastery", "Cliff Monastery", "solitude", "garamond", 0.62),
    theme("wisdom-marcus-aurelius-head", "Marcus Aurelius", "philosophers", "garamond", 0.28),
    theme("wisdom-plato-silanion", "Plato", "philosophers", "playfair", 0.24),
    theme("wisdom-laozi-riding-ox", "Laozi", "philosophers", "handwritten", 0.22),
    theme("wisdom-aged-parchment", "Aged Parchment", "philosophers", "garamond", 0.20),
    theme("wisdom-white-marble", "White Marble", "philosophers", "serif", 0.22)
  ];

  var FONT_CATALOG = [
    { id: "dynamic", label: "Dynamic", category: "Theme default", family: null },
    { id: "serif", label: "Classic", category: "Serif", family: "'Noto Serif', Georgia, serif" },
    { id: "playfair", label: "Playfair Display", category: "Serif", family: "'Playfair Display', Georgia, serif" },
    { id: "garamond", label: "EB Garamond", category: "Serif", family: "'EB Garamond', Garamond, serif" },
    { id: "roboto", label: "Clean", category: "Sans", family: "Roboto, Arial, sans-serif" },
    { id: "typewriter", label: "Typewriter", category: "Special Elite", family: "'Special Elite', monospace" },
    { id: "courier", label: "Courier Prime", category: "Typewriter", family: "'Courier Prime', monospace" },
    { id: "script", label: "Dancing Script", category: "Handwritten", family: "'Dancing Script', cursive" },
    { id: "handwritten", label: "Handwritten", category: "Shadows Into Light", family: "'Shadows Into Light', cursive" }
  ];
  var FONT_CHOICE_IDS = ["serif", "roboto", "typewriter", "handwritten"];

  var STEPS = [
    {
      id: "outcome", kind: "single", eyebrow: "Your daily anchor", title: "What do you want one good line to help with?",
      options: [
        ["calmer", "Stay calmer when the day gets loud", "Less reaction, more space before the next move.", "🌊"],
        ["grounded", "Feel grounded each morning", "A steady thought before the day gathers speed.", "🌅"],
        ["discipline", "Keep discipline close", "A useful line when effort starts to slip.", "🔥"],
        ["perspective", "Hold a wider perspective", "A reminder that the present moment is workable.", "🧭"]
      ]
    },
    {
      id: "practice", kind: "multi", eyebrow: "What you already use", title: "Where do you turn for perspective now?",
      options: [
        ["books", "Books and essays", "Long-form reading when time allows.", "📚"],
        ["journaling", "Journaling", "Writing thoughts down to make them clearer.", "✍️"],
        ["meditation", "Meditation", "A deliberate pause in the day.", "🧘"],
        ["social", "Quote accounts", "Short ideas found while scrolling.", "💬"],
        ["none", "Nothing consistent", "The intention is there, the habit is not.", "🌱"]
      ]
    },
    {
      id: "friction", kind: "multi", eyebrow: "What gets in the way", title: "Why do useful habits fade?",
      options: [
        ["time", "They ask for too much time", "The day moves before the routine begins.", "⏳"],
        ["remember", "I forget to return", "The book or app disappears from view.", "🔔"],
        ["effort", "They feel like another task", "Even a good habit can become a demand.", "🧱"],
        ["consistency", "I start, then lose the thread", "A few missed days become a full stop.", "🧵"]
      ]
    },
    {
      id: "right_place", kind: "benefit", dark: true, eyebrow: "A smaller way in", title: "You do not need another routine.", cta: "Show me how",
      visual: {
        className: "is-right-place",
        label: "A Stoic Widgets Home Screen and Lock Screen placing Stoic ideas on the phone surfaces you already look at.",
        background: { src: "/funnel/assets/benefit-right-place-bg.webp", width: 840, height: 1050 },
        layers: [
          { src: "/funnel/assets/benefit-right-place-lock-black.webp", width: 480, height: 1040, className: "is-lock-screen" },
          { src: "/funnel/assets/benefit-right-place-home-blue.webp", width: 560, height: 1004, className: "is-home-screen" }
        ]
      }
    },
    {
      id: "frequency", kind: "single", eyebrow: "The right rhythm", title: "How often would a quiet reset help?",
      options: [
        ["morning", "Once each morning", "Start with one thought worth carrying.", "☀️"],
        ["few_times", "A few times through the day", "Meet the same idea in different moments.", "🕰️"],
        ["every_unlock", "Whenever I unlock my phone", "Let ordinary glances do the repetition.", "📱"],
        ["when_needed", "Only when I need it", "Keep one line fixed until it has done its work.", "🧘"]
      ]
    },
    { id: "glances", kind: "glances", dark: true, eyebrow: "From our user study", title: "Stoic ideas stay with you when they stay in sight.", cta: "Keep building my plan" },
    {
      id: "familiarity", kind: "single", eyebrow: "Your starting point", title: "How familiar is Stoicism to you?",
      options: [
        ["new", "I am new to it", "Plain ideas with clear context.", "🌱"],
        ["curious", "I know the main ideas", "Familiar names with a few less obvious lines.", "👀"],
        ["reader", "I have read the Stoics", "A broader mix across authors and works.", "📖"],
        ["deep", "It is already part of my life", "Less explanation, more range.", "🏛️"]
      ]
    },
    {
      id: "authors", kind: "multi", eyebrow: "The voices", title: "Whose words do you want nearby?",
      options: [
        ["marcus", "Marcus Aurelius", "Private notes on conduct and perspective.", "🏛️"],
        ["seneca", "Seneca", "Letters on time, fear, friendship, and enough.", "✉️"],
        ["epictetus", "Epictetus", "A sharp line between what is yours and what is not.", "🧭"],
        ["mixed", "A wider philosophy mix", "Stoics alongside related ancient and later voices.", "🌐"]
      ]
    },
    { id: "quote", kind: "quotes", eyebrow: "Pick your first line", title: "Which thought should meet you first?" },
    {
      id: "effortless", kind: "benefit", dark: true, eyebrow: "Daily wisdom, made effortless", title: "One line. No new habit to maintain.", cta: "Choose my widget",
      visual: {
        className: "is-effortless",
        label: "Three authentic Stoic quote widgets arranged as a gently cycling deck, showing daily wisdom delivered without a new routine.",
        background: { src: "/funnel/assets/benefit-effortless-bg.webp", width: 840, height: 1050 },
        layers: [
          { src: "/funnel/assets/benefit-effortless-quote-blue.webp", width: 600, height: 536, className: "is-widget-blue" },
          { src: "/funnel/assets/benefit-effortless-quote-dark.webp", width: 600, height: 620, className: "is-widget-dark" },
          { src: "/funnel/assets/benefit-effortless-quote-fire.webp", width: 600, height: 276, className: "is-widget-fire" }
        ]
      }
    },
    { id: "widget", kind: "widgets", dark: true, eyebrow: "Start with one", title: "Which one speaks to you?" },
    { id: "theme", kind: "themes", eyebrow: "Choose the atmosphere", title: "What should the widget feel like?" },
    { id: "preview", kind: "preview", dark: true, eyebrow: "Make it yours", title: "This is the part you will actually see.", cta: "Make it mine" },
    { id: "font", kind: "fonts", eyebrow: "Make it yours", title: "Choose the reading voice." },
    {
      id: "refresh", kind: "single", eyebrow: "Quote rotation", title: "How should new lines arrive?",
      options: [
        ["daily", "A new quote each day", "The default, quiet and automatic.", "🌤️"],
        ["fixed", "Keep one quote fixed", "Stay with a line until you are done with it.", "📌"],
        ["liked", "Rotate through saved quotes", "Build a smaller library that is yours.", "❤️"],
        ["frequent", "Refresh more often", "See more variety across the day.", "🔄"]
      ]
    },
    {
      id: "reminder", kind: "single", eyebrow: "Optional reminder", title: "Would you like one quiet notification too?",
      options: [
        ["morning", "Morning", "One line near the start of the day.", "🌅"],
        ["evening", "Evening", "A short pause before the day closes.", "🌙"],
        ["none", "Widget only", "No notification. The screen is enough.", "📱"]
      ]
    },
    { id: "set_once", kind: "study", dark: true, eyebrow: "What users reported", title: "More mindful. Less pulled around.", cta: "See the proof" },
    { id: "proof", kind: "social", dark: true, eyebrow: "On the App Store", title: "Built for people who already care about these ideas.", cta: "Build my plan" },
    { id: "loading", kind: "loading", dark: true, eyebrow: "Putting it together", title: "Building your widget plan" },
    { id: "email", kind: "email", eyebrow: "Save your plan", title: "Where should we send access details?" },
    { id: "result", kind: "result", eyebrow: "Your plan is ready", title: "A Stoic line where you will see it.", cta: "See subscription options" },
    { id: "paywall", kind: "paywall", dark: true, eyebrow: "Stoic Widgets Pro", title: "Keep the wisdom present." }
  ];

  function makeSessionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "sw_" + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function collectAttribution() {
    var params = new URLSearchParams(window.location.search);
    return ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].reduce(function (result, field) {
      var value = params.get(field);
      if (value) result[field] = value.slice(0, 240);
      return result;
    }, {});
  }

  function firstThemeForBundle(bundleId) {
    return THEMES.find(function (item) { return item.bundle === bundleId; }) || THEMES[0];
  }

  function findTheme(themeId) {
    return THEMES.find(function (item) { return item.id === themeId; }) || null;
  }

  function fontChoiceForStoredValue(fontId, themeItem) {
    var resolvedId = fontId === "dynamic" ? ((themeItem && themeItem.fontId) || "serif") : fontId;
    var fontMap = {
      serif: "serif",
      playfair: "serif",
      garamond: "serif",
      cormorant: "serif",
      source_serif: "serif",
      eb_garamond: "serif",
      roboto: "roboto",
      typewriter: "typewriter",
      courier: "typewriter",
      script: "handwritten",
      handwritten: "handwritten"
    };
    return fontMap[resolvedId] || "serif";
  }

  function normalizeStoredAnswers(answers) {
    var normalized = answers && typeof answers === "object" ? answers : {};
    if (normalized.theme === "wisdom") normalized.theme = "philosophers";
    if (normalized.themeId && !findTheme(normalized.themeId)) delete normalized.themeId;
    if (!normalized.themeId && normalized.theme) normalized.themeId = firstThemeForBundle(normalized.theme).id;
    var exactTheme = normalized.themeId ? findTheme(normalized.themeId) : null;
    if (exactTheme) normalized.theme = exactTheme.bundle;
    if (normalized.font) normalized.font = fontChoiceForStoredValue(normalized.font, exactTheme || firstThemeForBundle(normalized.theme || "discipline"));
    return normalized;
  }

  function loadState() {
    var stored = {};
    try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch (_error) {}
    var answers = normalizeStoredAnswers(stored.answers);
    return {
      step: Number.isInteger(stored.step) ? Math.max(0, Math.min(TOTAL_STEPS - 1, stored.step)) : 0,
      answers: answers,
      themeBundleView: typeof stored.themeBundleView === "string" ? stored.themeBundleView : (answers.theme || "discipline"),
      email: typeof stored.email === "string" ? stored.email : "",
      marketingConsent: stored.marketingConsent === true,
      plan: stored.plan === "lifetime" ? "lifetime" : "annual",
      sessionId: typeof stored.sessionId === "string" ? stored.sessionId : makeSessionId(),
      attribution: stored.attribution && typeof stored.attribution === "object" ? stored.attribution : collectAttribution()
    };
  }

  var state = loadState();
  saveState();

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_error) {}
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function sanitizedAnswers() {
    var copy = {};
    Object.keys(state.answers).forEach(function (key) {
      var value = state.answers[key];
      if (typeof value === "string") copy[key] = value.slice(0, 120);
      if (Array.isArray(value)) copy[key] = value.slice(0, 10).map(function (item) { return String(item).slice(0, 120); });
    });
    return copy;
  }

  function widgetFor(id) {
    return WIDGETS.find(function (item) { return item.id === id; }) || WIDGETS[0];
  }

  function selectedWidgetUsesQuoteTheme() {
    return widgetFor(state.answers.widget).appType === "quotes";
  }

  function selectedTheme() {
    return findTheme(state.answers.themeId) || firstThemeForBundle(state.answers.theme || "discipline");
  }

  function selectedQuote() {
    return QUOTES.find(function (item) { return item.id === state.answers.quote; }) || QUOTES[0];
  }

  function fontFor(id) {
    return FONT_CATALOG.find(function (item) { return item.id === id; }) || FONT_CATALOG[0];
  }

  function fontChoices() {
    return FONT_CHOICE_IDS.map(fontFor);
  }

  function effectiveFont(fontId, themeItem) {
    var option = fontFor(fontId || "dynamic");
    if (option.id !== "dynamic") return option;
    return fontFor((themeItem || selectedTheme()).fontId);
  }

  function track(name, properties) {
    var step = STEPS[state.step];
    var currentTheme = selectedTheme();
    var currentWidget = widgetFor(state.answers.widget);
    var payload = {
      event: name,
      session_id: state.sessionId,
      step_id: step ? step.id : null,
      step_index: state.step,
      funnel_version: "stoic_web_v1",
      properties: Object.assign({}, state.attribution, {
        selected_options: sanitizedAnswers(),
        selected_plan: state.plan,
        theme_id: currentTheme.id,
        theme_bundle: currentTheme.bundle,
        app_widget_type: currentWidget.appType
      }, properties || {})
    };
    try {
      fetch("/api/funnel-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
      if (window.va) window.va("event", { name: name });
    } catch (_error) {}
  }

  function shouldShowIntro() {
    if (state.step !== 0 || Object.keys(state.answers).length > 0) return false;
    try { return sessionStorage.getItem(INTRO_SESSION_KEY) !== "1"; } catch (_error) { return true; }
  }

  function renderIntro() {
    document.body.classList.remove("is-dark");
    document.body.classList.add("is-intro");
    app.innerHTML = '<main class="funnel-intro" aria-labelledby="funnel-intro-title">' +
      '<div class="intro-brand"><img src="/funnel/assets/app-icon.png" alt="" width="56" height="56" decoding="async"><span>Stoic Widgets</span></div>' +
      '<div class="intro-message"><p class="intro-eyebrow">A quieter way to remember</p><h1 id="funnel-intro-title">You won’t believe how much Stoic Widgets can simplify your daily practice.</h1><p>Preparing a plan that puts the right words where you already look.</p></div>' +
      '<div class="intro-loading" role="status"><span>Preparing your experience</span><div class="intro-progress" aria-hidden="true"><span class="intro-progress-fill"></span></div></div>' +
    '</main>';
    try { sessionStorage.setItem(INTRO_SESSION_KEY, "1"); } catch (_error) {}
    track("funnel_intro_viewed", { screen: "intro", index: -1 });
    var fill = document.querySelector(".intro-progress-fill");
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var duration = reduceMotion ? 900 : INTRO_DURATION;
    var startedAt = performance.now();
    function finishIntro() {
      introFrame = null;
      introCompletionTimer = window.setTimeout(function () {
        track("funnel_intro_completed", { screen: "intro", index: -1, duration_ms: duration });
        renderCurrentStep();
      }, reduceMotion ? 80 : 140);
    }
    function tick(now) {
      var progress = Math.min(1, Math.max(0, (now - startedAt) / duration));
      if (fill) fill.style.transform = "scaleX(" + progress + ")";
      if (progress < 1) {
        introFrame = window.requestAnimationFrame(tick);
        return;
      }
      finishIntro();
    }
    introFrame = window.requestAnimationFrame(tick);
  }

  function headerMarkup() {
    return '<header class="funnel-header"><div class="header-row">' +
      '<button class="back-button" type="button" data-action="back">Back</button>' +
      '<div class="brand"><img src="/funnel/assets/app-icon.png" alt="" width="25" height="25" decoding="async"><span>Stoic Widgets</span></div>' +
      '<div class="step-counter"></div>' +
      '</div><div class="progress-track" aria-label="Funnel progress"><div class="progress-fill"></div></div></header>';
  }

  function mountShell() {
    if (document.querySelector(".funnel-shell")) return;
    app.innerHTML = '<div class="funnel-shell">' + headerMarkup() + '<main class="screen" id="funnel-screen"></main></div>';
    document.querySelector('[data-action="back"]').addEventListener("click", previousStep);
  }

  function syncHeader() {
    var placeholder = state.step === 0;
    var back = document.querySelector('[data-action="back"]');
    var counter = document.querySelector(".step-counter");
    var progress = document.querySelector(".progress-fill");
    back.classList.toggle("is-placeholder", placeholder);
    if (placeholder) {
      back.setAttribute("aria-hidden", "true");
      back.setAttribute("tabindex", "-1");
    } else {
      back.removeAttribute("aria-hidden");
      back.removeAttribute("tabindex");
    }
    counter.textContent = (state.step + 1) + " / " + TOTAL_STEPS;
    progress.style.width = (((state.step + 1) / TOTAL_STEPS) * 100).toFixed(2) + "%";
  }

  function headingMarkup(step) {
    return '<div class="screen-heading">' +
      (step.eyebrow ? '<p class="eyebrow">' + escapeHtml(step.eyebrow) + '</p>' : '') +
      '<h1>' + escapeHtml(step.title) + '</h1>' +
      '</div>';
  }

  function footerMarkup(label, disabled, extraClass) {
    return '<div class="action-footer"><button type="button" class="primary-button ' + (extraClass || '') + '" data-action="continue"' + (disabled ? ' disabled' : '') + '>' + escapeHtml(label || "Continue") + '</button></div>';
  }

  function selectedValues(stepId) {
    var value = state.answers[stepId];
    return Array.isArray(value) ? value : value ? [value] : [];
  }

  function optionsMarkup(step) {
    var selected = selectedValues(step.id);
    var isMulti = step.kind === "multi";
    return '<div class="options ' + (isMulti ? 'multi' : '') + '">' + step.options.map(function (option) {
      var active = selected.indexOf(option[0]) >= 0;
      return '<button type="button" class="option-card' + (active ? ' is-selected' : '') + '" data-option="' + escapeHtml(option[0]) + '" aria-pressed="' + active + '">' +
        '<span class="option-emoji" aria-hidden="true">' + option[3] + '</span>' +
        '<span class="option-copy"><strong>' + escapeHtml(option[1]) + '</strong><small>' + escapeHtml(option[2]) + '</small></span>' +
        '<span class="selection-check" aria-hidden="true">✓</span>' +
        '<input class="selection-control" type="' + (isMulti ? 'checkbox' : 'radio') + '" tabindex="-1" aria-hidden="true"' + (active ? ' checked' : '') + '>' +
        '</button>';
    }).join("") + '</div>';
  }

  function renderQuestion(step) {
    var selected = selectedValues(step.id);
    return headingMarkup(step) + '<div class="screen-content">' + optionsMarkup(step) + '</div>' + (step.kind === "multi" ? footerMarkup("Continue", selected.length === 0) : "");
  }

  function renderBenefit(step) {
    if (step.visual) {
      var visual = step.visual;
      var background = visual.background || {};
      var backgroundDimensions = background.width && background.height ? ' width="' + background.width + '" height="' + background.height + '"' : '';
      var backgroundMarkup = background.src ? '<img class="benefit-composition-bg" src="' + background.src + '" alt="" aria-hidden="true"' + backgroundDimensions + ' decoding="async" fetchpriority="high">' : '';
      var layersMarkup = (visual.layers || []).map(function (layer) {
        var layerDimensions = layer.width && layer.height ? ' width="' + layer.width + '" height="' + layer.height + '"' : '';
        return '<img class="benefit-shot ' + escapeHtml(layer.className || '') + '" src="' + layer.src + '" alt="" aria-hidden="true"' + layerDimensions + ' decoding="async" fetchpriority="high">';
      }).join("");
      return headingMarkup(step) + '<div class="screen-content"><div class="benefit-visual"><figure class="benefit-composition ' + escapeHtml(visual.className || '') + '" role="img" aria-label="' + escapeHtml(visual.label || "Stoic Widgets shown on an iPhone") + '">' + backgroundMarkup + layersMarkup + '</figure></div></div>' + footerMarkup(step.cta, false);
    }
    var dimensions = step.imageWidth && step.imageHeight ? ' width="' + step.imageWidth + '" height="' + step.imageHeight + '"' : '';
    return headingMarkup(step) + '<div class="screen-content"><div class="benefit-visual ' + (step.visualClass || '') + '"><img class="hero-phone" src="' + step.image + '" alt="' + escapeHtml(step.imageAlt || "Stoic Widgets shown on an iPhone") + '"' + dimensions + ' decoding="async" fetchpriority="high"></div></div>' + footerMarkup(step.cta, false);
  }

  function renderGlances(step) {
    return headingMarkup(step) + '<div class="screen-content"><section class="evidence-card exposure-evidence" aria-labelledby="exposure-result">' +
      '<div class="evidence-kicker"><span>Stoic ideas encountered</span><strong id="exposure-result">15× more</strong></div>' +
      '<div class="study-chart exposure-chart" role="img" aria-label="People using Stoic Widgets encountered fifteen times more Stoic quotes, stories, and philosophy than people without a widget.">' +
        '<div class="exposure-axis" aria-hidden="true"><span>15×</span><span>10×</span><span>5×</span><span>0</span></div>' +
        '<div class="exposure-plot"><span class="exposure-gridline is-top"></span><span class="exposure-gridline is-middle"></span><span class="exposure-gridline is-low"></span>' +
          '<div class="exposure-column is-baseline" style="--bar-height:6.67%"><span class="exposure-bar-wrap"><span class="exposure-bar"></span></span><small><span>Without a widget</span><strong>1×</strong></small></div>' +
          '<div class="exposure-column is-highlight" style="--bar-height:100%"><span class="exposure-bar-wrap"><span class="exposure-bar"></span></span><small><span>With Stoic Widgets</span><strong>15×</strong></small></div>' +
        '</div>' +
      '</div><p class="evidence-copy">Participants encountered 15× more Stoic quotes, stories, and philosophy with Stoic Widgets.</p>' +
      '<p class="study-note">Based on a Stoic Widgets user study.</p></section></div>' + footerMarkup(step.cta, false);
  }

  function renderStudy(step) {
    return headingMarkup(step) + '<div class="screen-content"><section class="evidence-card mindfulness-evidence" aria-labelledby="mindfulness-result">' +
      '<div class="mindfulness-result"><span>Self-reported mindfulness</span><strong id="mindfulness-result">+35%</strong></div>' +
      '<div class="index-chart" role="img" data-index-series="100,135" data-line-style="curved" aria-label="Self-reported mindfulness rose from a normalized index of one hundred before to one hundred thirty-five with Stoic Widgets, a thirty-five percent increase.">' +
        '<svg class="index-plot" viewBox="0 0 320 176" aria-hidden="true" focusable="false">' +
          '<defs><linearGradient id="mindfulness-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8b55e" stop-opacity=".2"></stop><stop offset="1" stop-color="#d8b55e" stop-opacity="0"></stop></linearGradient></defs>' +
          '<line class="index-gridline is-zero" x1="30" y1="138" x2="300" y2="138"></line>' +
          '<path class="index-area" d="M48 57 C82 63 96 49 126 53 C155 57 165 43 193 47 C222 51 241 31 278 29 L278 138 L48 138 Z"></path>' +
          '<path class="index-line-echo" d="M48 57 C82 63 96 49 126 53 C155 57 165 43 193 47 C222 51 241 31 278 29"></path>' +
          '<path class="index-line" d="M48 57 C82 63 96 49 126 53 C155 57 165 43 193 47 C222 51 241 31 278 29"></path>' +
          '<circle class="index-point is-before" data-index-value="100" cx="48" cy="57" r="6"></circle>' +
          '<circle class="index-point is-after" data-index-value="135" cx="278" cy="29" r="7"></circle>' +
        '</svg>' +
        '<span class="index-axis-mark is-zero" aria-hidden="true">0</span>' +
        '<span class="index-value is-before" aria-hidden="true">100</span><span class="index-value is-after" aria-hidden="true">135</span>' +
        '<span class="index-label is-before">Before</span><span class="index-label is-after">With Stoic Widgets</span>' +
      '</div><p class="distraction-note"><span aria-hidden="true">↓</span> Users also reported feeling less distracted.</p>' +
      '<p class="study-note">Based on a Stoic Widgets user study. Outcomes are self-reported.</p></section></div>' + footerMarkup(step.cta, false);
  }

  function renderQuotes(step) {
    var value = state.answers.quote;
    return headingMarkup(step) + '<div class="screen-content"><div class="quote-grid">' + QUOTES.map(function (quote) {
      var active = value === quote.id;
      return '<button type="button" class="quote-card' + (active ? ' is-selected' : '') + '" data-quote="' + quote.id + '" aria-pressed="' + active + '"><blockquote>“' + escapeHtml(quote.text) + '”</blockquote><cite>' + escapeHtml(quote.author + ' · ' + quote.cite) + '</cite><span class="card-check" aria-hidden="true">✓</span></button>';
    }).join("") + '</div></div>' + footerMarkup("Use this quote", !value);
  }

  function elapsedPercent(now, start, end) {
    var total = end.getTime() - start.getTime();
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.floor(((now.getTime() - start.getTime()) / total) * 100)));
  }

  function retroProgressRows() {
    var now = new Date();
    var dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    var weekday = (now.getDay() + 6) % 7;
    var weekStart = new Date(dayStart); weekStart.setDate(weekStart.getDate() - weekday);
    var weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    var yearStart = new Date(now.getFullYear(), 0, 1);
    var yearEnd = new Date(now.getFullYear() + 1, 0, 1);
    var birth = new Date(now); birth.setFullYear(birth.getFullYear() - 30); birth.setHours(12, 0, 0, 0);
    var lifeEnd = new Date(birth); lifeEnd.setFullYear(lifeEnd.getFullYear() + 80);
    return [
      ["TODAY", elapsedPercent(now, dayStart, dayEnd)],
      ["WEEK", elapsedPercent(now, weekStart, weekEnd)],
      ["MONTH", elapsedPercent(now, monthStart, monthEnd)],
      ["YEAR", elapsedPercent(now, yearStart, yearEnd)],
      ["LIFE", elapsedPercent(now, birth, lifeEnd)]
    ];
  }

  function retroRowsMarkup() {
    return retroProgressRows().map(function (row) {
      var active = Math.floor((row[1] / 100) * 25);
      var bars = Array.from({ length: 25 }, function (_item, index) {
        return '<i class="' + (index < active ? 'is-active' : '') + '"></i>';
      }).join("");
      return '<div class="retro-row' + (row[0] === 'LIFE' ? ' is-life' : '') + '"><span>' + row[0] + '</span><div class="retro-bars">' + bars + '</div><b>' + row[1] + '%</b></div>';
    }).join("");
  }

  function yearStats() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 1);
    var end = new Date(now.getFullYear() + 1, 0, 1);
    var total = Math.round((end.getTime() - start.getTime()) / 86400000);
    var day = Math.max(Math.floor((now.getTime() - start.getTime()) / 86400000) + 1, 1);
    var done = Math.min(Math.max(day - 1, 0), total);
    return { year: now.getFullYear(), day: day, done: done, total: total, left: Math.max(total - done, 0), percent: Math.floor((done / total) * 100) };
  }

  function widgetPreviewMarkup(options) {
    options = options || {};
    var widget = widgetFor(options.widgetId || state.answers.widget);
    var themeItem = options.themeId ? (findTheme(options.themeId) || selectedTheme()) : selectedTheme();
    var quote = selectedQuote();
    var font = effectiveFont(options.fontId || state.answers.font || "dynamic", themeItem);
    var imageLoading = options.eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"';
    var attrs = ' data-widget-renderer="' + widget.id + '" data-app-widget-type="' + widget.appType + '" data-theme-id="' + themeItem.id + '" data-font-id="' + font.id + '" style="--widget-font:' + font.family + ';"';
    if (widget.appType === "sisyphus") {
      return '<div class="widget-preview widget-sisyphus"' + attrs + '><img src="/funnel/assets/sisyphus.webp" alt="" width="1254" height="1254"' + imageLoading + ' decoding="async"><div class="widget-shade"></div><strong>Keep on pushing</strong></div>';
    }
    if (widget.appType === "memento") {
      return '<div class="widget-preview widget-memento"' + attrs + '><span class="memento-eyebrow">MEMENTO MORI</span><strong class="memento-days">21,470</strong><span class="memento-label">DAYS REMAIN</span><div class="memento-stats"><span><b>706</b><small>MONTHS</small></span><i></i><span><b>58</b><small>YEARS</small></span></div></div>';
    }
    if (widget.appType === "retro") {
      return '<div class="widget-preview widget-retro"' + attrs + '><div class="retro-header">MEMENTO MORI // V.1.0.4</div><div class="retro-divider"></div><div class="retro-rows">' + retroRowsMarkup() + '</div></div>';
    }
    if (widget.appType === "year") {
      var stats = yearStats();
      var dots = Array.from({ length: stats.total }, function (_item, index) { return '<i class="' + (index < stats.done ? 'is-done' : '') + '"></i>'; }).join("");
      return '<div class="widget-preview widget-year"' + attrs + '><div class="year-header"><span><b>' + stats.year + '</b><small>Day ' + stats.day + ' · ' + stats.percent + '%</small></span><span><b>' + stats.left + '</b><small>days left</small></span></div><div class="year-grid">' + dots + '</div></div>';
    }
    return '<div class="widget-preview widget-quote"' + attrs + '><img src="' + themeItem.image + '" alt="" width="645" height="860"' + imageLoading + ' decoding="async"><div class="widget-shade"></div><div class="widget-quote-copy"><blockquote>“' + escapeHtml(quote.text) + '”</blockquote><cite>' + escapeHtml(quote.author.toUpperCase()) + '</cite></div></div>';
  }

  function renderWidgets(step) {
    var value = state.answers.widget || "daily_quote";
    if (!state.answers.widget) { state.answers.widget = value; saveState(); }
    return headingMarkup(step) + '<div class="screen-content"><div class="carousel" role="list" aria-label="Widget previews">' + WIDGETS.map(function (widget) {
      var active = value === widget.id;
      return '<button type="button" class="carousel-card' + (active ? ' is-selected' : '') + '" data-widget="' + widget.id + '" aria-pressed="' + active + '"><span class="widget-card-preview">' + widgetPreviewMarkup({ widgetId: widget.id }) + '</span><span class="carousel-copy"><strong>' + escapeHtml(widget.label) + '</strong><small>' + escapeHtml(widget.detail) + '</small></span><span class="card-check" aria-hidden="true">✓</span></button>';
    }).join("") + '</div><p class="swipe-note">Swipe through all five · add or switch anytime</p></div>' + footerMarkup("Start with this one", false);
  }

  function themeCardsMarkup(bundleId) {
    return '<div class="theme-grid">' + THEMES.filter(function (item) { return item.bundle === bundleId; }).map(function (item) {
      var active = state.answers.themeId === item.id;
      return '<button type="button" class="theme-card' + (active ? ' is-selected' : '') + '" data-theme-id="' + item.id + '" data-theme-bundle-id="' + item.bundle + '" aria-pressed="' + active + '"><span class="theme-image"><img src="' + item.image + '" alt="" width="645" height="860" loading="lazy" decoding="async"><span class="theme-check" aria-hidden="true">✓</span></span><span class="theme-name">' + escapeHtml(item.name) + '</span></button>';
    }).join("") + '</div>';
  }

  function themePanelMarkup(bundleId) {
    var bundle = THEME_BUNDLES.find(function (item) { return item.id === bundleId; }) || THEME_BUNDLES[0];
    return '<p class="theme-blurb">' + escapeHtml(bundle.detail) + '</p>' + themeCardsMarkup(bundle.id);
  }

  function renderThemes(step) {
    var activeBundle = THEME_BUNDLES.some(function (item) { return item.id === state.themeBundleView; }) ? state.themeBundleView : "discipline";
    var usesQuoteTheme = selectedWidgetUsesQuoteTheme();
    var heading = usesQuoteTheme ? step : Object.assign({}, step, {
      title: "Choose a quote theme too."
    });
    return headingMarkup(heading) + '<div class="screen-content"><div class="theme-tabs" role="tablist" aria-label="Theme collections">' + THEME_BUNDLES.map(function (item) {
      var active = item.id === activeBundle;
      return '<button type="button" role="tab" id="theme-tab-' + item.id + '" aria-controls="theme-panel-' + item.id + '" aria-selected="' + active + '" tabindex="' + (active ? '0' : '-1') + '" class="theme-tab' + (active ? ' is-selected' : '') + '" data-theme-bundle="' + item.id + '">' + escapeHtml(item.label) + '</button>';
    }).join("") + '</div><div class="theme-panels">' + THEME_BUNDLES.map(function (item) {
      var active = item.id === activeBundle;
      return '<div class="theme-panel" id="theme-panel-' + item.id + '" role="tabpanel" aria-labelledby="theme-tab-' + item.id + '" data-theme-panel="' + item.id + '"' + (active ? '' : ' hidden') + '>' + themePanelMarkup(item.id) + '</div>';
    }).join("") + '</div></div>' + footerMarkup(usesQuoteTheme ? "Use this theme" : "Save this quote theme", !state.answers.themeId);
  }

  function labelFor(list, id, fallback) {
    var found = list.find(function (item) { return item.id === id; });
    return found ? (found.label || found.name) : fallback;
  }

  function homeScreenIconMarkup(icon) {
    return '<span class="home-screen-app' + (icon.dock ? ' is-dock-app' : '') + '"><img src="/funnel/assets/home-icon-' + icon.id + '.webp" alt="" width="72" height="72" decoding="async"><span>' + (icon.dock ? '' : escapeHtml(icon.label)) + '</span></span>';
  }

  function homeScreenPreviewMarkup() {
    var themeItem = selectedTheme();
    var widget = widgetFor(state.answers.widget);
    var screenIcons = HOME_SCREEN_ICONS.filter(function (icon) { return !icon.dock; }).map(homeScreenIconMarkup).join("");
    var dockIcons = HOME_SCREEN_ICONS.filter(function (icon) { return icon.dock; }).map(homeScreenIconMarkup).join("");
    var description = widget.label + " widget on an iPhone Home Screen using the " + themeItem.name + " theme as its wallpaper.";
    return '<figure class="home-screen-preview" role="img" aria-label="' + escapeHtml(description) + '" data-theme-id="' + themeItem.id + '" data-widget-id="' + widget.id + '">' +
      '<img class="home-screen-wallpaper" src="' + themeItem.image + '" alt="" width="645" height="860" loading="eager" fetchpriority="high" decoding="async">' +
      '<span class="home-screen-scrim" aria-hidden="true"></span>' +
      '<div class="home-screen-body" aria-hidden="true">' +
        '<div class="home-screen-widget">' + widgetPreviewMarkup({ eager: true }) + '</div>' +
        '<div class="home-screen-app-row">' + screenIcons + '</div>' +
        '<span class="home-screen-spacer"></span>' +
        '<span class="home-screen-search">Search</span>' +
        '<div class="home-screen-dock">' + dockIcons + '</div>' +
      '</div>' +
    '</figure>';
  }

  function renderPreview(step) {
    var usesQuoteTheme = selectedWidgetUsesQuoteTheme();
    var heading = usesQuoteTheme ? step : Object.assign({}, step, {
      title: "See your starting widget."
    });
    return headingMarkup(heading) + '<div class="screen-content"><div class="personalization-preview">' + homeScreenPreviewMarkup() + '</div></div>' + footerMarkup(step.cta, false);
  }

  function renderFonts(step) {
    var value = state.answers.font || "serif";
    if (!state.answers.font) { state.answers.font = value; saveState(); }
    var fontPreviewWidget = widgetFor(state.answers.widget).appType === "quotes" ? state.answers.widget : "daily_quote";
    var previewNote = widgetFor(state.answers.widget).appType === "retro" ? "Retro keeps its original type. This applies to quote widgets." : "Live quote widget preview";
    return headingMarkup(step) + '<div class="screen-content"><div class="font-live-preview">' + widgetPreviewMarkup({ fontId: value, widgetId: fontPreviewWidget, eager: true }) + '</div><p class="font-preview-note">' + previewNote + '</p><div class="font-grid">' + fontChoices().map(function (font) {
      var active = value === font.id;
      var sampleFont = effectiveFont(font.id, selectedTheme());
      return '<button type="button" class="font-card' + (active ? ' is-selected' : '') + '" data-font="' + font.id + '" aria-pressed="' + active + '"><span class="font-sample" style="font-family:' + sampleFont.family + '">Aa</span><span class="font-meta"><strong>' + escapeHtml(font.label) + '</strong><small>' + escapeHtml(font.category) + '</small></span><span class="card-check" aria-hidden="true">✓</span></button>';
    }).join("") + '</div></div>' + footerMarkup("Keep this type", false);
  }

  function renderSocial(step) {
    return headingMarkup(step) + '<div class="screen-content"><div class="social-showcase">' +
      '<figure class="social-figure" role="img" aria-label="Marcus Aurelius standing above five gold stars and laurel branches.">' +
        '<img class="social-aurelius" src="/funnel/assets/social-proof-aurelius.webp" alt="" width="640" height="640" decoding="async" fetchpriority="high">' +
        '<img class="social-stars" src="/funnel/assets/social-proof-stars-laurels.webp" alt="" width="580" height="160" decoding="async" fetchpriority="high">' +
      '</figure>' +
      '<div class="rating-row"><strong>4.8</strong><span class="rating-meta">from 169 App Store ratings</span></div>' +
      '<article class="review"><h2>Perfect for any stoicism lover</h2><p>“Great app. I was always into stoicism and this gave me exactly what I was looking for!”</p></article>' +
    '</div></div>' + footerMarkup(step.cta, false);
  }

  function renderLoading(step) {
    return headingMarkup(step) + '<div class="screen-content"><div class="loading-composer">' +
      '<p class="loading-current-stage" id="loading-current-stage">' + LOADING_STAGES[0].label + '</p>' +
      '<div class="loading-stage-list" id="loading-progress" role="progressbar" aria-label="Building your widget plan" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' + LOADING_STAGES.map(function (stage, index) {
        return '<div class="loading-stage' + (index === 0 ? ' is-working' : '') + '" data-loading-stage="' + index + '" data-progress="0">' +
          '<div class="loading-stage-copy"><span class="loading-stage-number">0' + (index + 1) + '</span><strong class="loading-label">' + stage.label + '</strong><span class="loading-percent" aria-hidden="true">0%</span></div>' +
          '<div class="loading-stage-track" aria-hidden="true"><span class="loading-stage-fill"></span></div>' +
        '</div>';
      }).join("") + '</div><p class="sr-only" id="loading-status" aria-live="polite">' + LOADING_STAGES[0].label + '.</p></div></div>';
  }

  function renderEmail(step) {
    return headingMarkup(step) + '<div class="screen-content"><form class="email-form" id="email-form" novalidate><label class="field-label" for="email">Email address</label><input class="email-input" id="email" name="email" type="email" inputmode="email" autocomplete="email" required placeholder="you@example.com" value="' + escapeHtml(state.email) + '"><label class="consent"><input id="marketing-consent" type="checkbox"' + (state.marketingConsent ? ' checked' : '') + '><span>Send me occasional Stoic Widgets product notes. This is optional and does not affect the purchase.</span></label><p class="form-message" id="email-message" role="alert"></p><button class="primary-button" type="submit">Save my plan</button></form><p class="privacy-note">We use this address for your receipt, activation, and subscription management. Read the <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</p></div>';
  }

  function answerLabel(stepId) {
    var step = STEPS.find(function (item) { return item.id === stepId; });
    var value = state.answers[stepId];
    if (!step || !step.options || !value) return "Not set";
    var id = Array.isArray(value) ? value[0] : value;
    var option = step.options.find(function (item) { return item[0] === id; });
    return option ? option[1] : "Not set";
  }

  function renderResult(step) {
    var themeItem = selectedTheme();
    var usesQuoteTheme = selectedWidgetUsesQuoteTheme();
    var themeLabel = usesQuoteTheme ? "Theme" : "Quote theme";
    var typeLabel = usesQuoteTheme ? "Type" : "Quote type";
    return headingMarkup(step) + '<div class="screen-content"><div class="result-card"><div class="result-widget">' + widgetPreviewMarkup({ eager: true }) + '</div><div class="result-copy"><h2>Your daily anchor</h2><ul class="result-list"><li><span>Widget</span><strong>' + escapeHtml(labelFor(WIDGETS, state.answers.widget, "Daily Quote")) + '</strong></li><li><span>' + themeLabel + '</span><strong>' + escapeHtml(themeItem.name) + '</strong></li><li><span>Collection</span><strong>' + escapeHtml(labelFor(THEME_BUNDLES, themeItem.bundle, "Discipline")) + '</strong></li><li><span>' + typeLabel + '</span><strong>' + escapeHtml(labelFor(fontChoices(), state.answers.font, "Classic")) + '</strong></li><li><span>Rotation</span><strong>' + escapeHtml(answerLabel("refresh")) + '</strong></li><li><span>Reminder</span><strong>' + escapeHtml(answerLabel("reminder")) + '</strong></li></ul></div></div></div>' + footerMarkup(step.cta, false);
  }

  function renderPaywall(step) {
    var annual = state.plan !== "lifetime";
    return headingMarkup(step) + '<div class="screen-content"><div class="plan-grid"><button type="button" class="plan-card' + (annual ? ' is-selected' : '') + '" data-plan="annual" aria-pressed="' + annual + '"><span class="plan-name"><strong>Annual</strong><small>Renews each year until canceled</small></span><span class="plan-price"><strong>$40</strong><small>USD per year</small></span></button><button type="button" class="plan-card' + (!annual ? ' is-selected' : '') + '" data-plan="lifetime" aria-pressed="' + (!annual) + '"><span class="plan-name"><strong>Lifetime</strong><small>One payment, no renewals</small></span><span class="plan-price"><strong>$100</strong><small>USD once</small></span></button></div><p class="billing-note">Annual access is charged immediately with no free trial and renews at $40 USD per year until canceled. Lifetime access is one payment for the operating lifetime of Stoic Widgets. Applicable taxes will be shown before payment. A $60 USD lifetime save offer may be available when specifically presented.</p><p class="billing-note" role="status">These web plans are coming soon. Web checkout is not yet available.</p><div class="legal-links"><a href="/pricing">Plan details</a> · <a href="/terms" target="_blank" rel="noopener">Terms</a> · <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a> · <a href="/refund" target="_blank" rel="noopener">Refund Policy</a></div></div>' + footerMarkup("Web checkout coming soon", true, "checkout-button");
  }

  function cancelTransientWork() {
    window.clearTimeout(autoAdvanceTimer);
    window.clearTimeout(introCompletionTimer);
    window.clearTimeout(loadingCompletionTimer);
    if (introFrame !== null) window.cancelAnimationFrame(introFrame);
    if (loadingFrame !== null) window.cancelAnimationFrame(loadingFrame);
    introFrame = null;
    introCompletionTimer = null;
    loadingFrame = null;
    loadingCompletionTimer = null;
    autoAdvanceTimer = null;
    lastLoadingPercent = -1;
    lastLoadingAnnouncement = -1;
  }

  function updateLoadingProgress(elapsed, reduceMotion) {
    var boundedElapsed = Math.min(LOADING_DURATION, Math.max(0, elapsed));
    var rawValue = Math.min(100, Math.floor((boundedElapsed / LOADING_DURATION) * 100));
    var completedStages = Math.min(LOADING_STAGES.length, Math.floor(boundedElapsed / LOADING_STAGE_DURATION));
    var value = reduceMotion ? [0, 33, 67, 100][completedStages] : rawValue;
    lastLoadingPercent = value;
    var overall = document.getElementById("loading-progress");
    var status = document.getElementById("loading-status");
    var currentStage = document.getElementById("loading-current-stage");
    if (!overall) return;
    overall.setAttribute("aria-valuenow", String(value));
    var activeStage = Math.min(LOADING_STAGES.length - 1, Math.floor(boundedElapsed / LOADING_STAGE_DURATION));
    var announcement = boundedElapsed >= LOADING_DURATION ? LOADING_STAGES.length : activeStage;
    if (status && announcement !== lastLoadingAnnouncement) {
      lastLoadingAnnouncement = announcement;
      status.textContent = boundedElapsed >= LOADING_DURATION ? "Your plan is ready." : LOADING_STAGES[activeStage].label + ".";
    }
    if (currentStage) currentStage.textContent = boundedElapsed >= LOADING_DURATION ? "Your plan is ready" : LOADING_STAGES[activeStage].label;
    document.querySelectorAll("[data-loading-stage]").forEach(function (item, index) {
      var stageElapsed = boundedElapsed - (index * LOADING_STAGE_DURATION);
      var stageProgress = Math.min(100, Math.max(0, (stageElapsed / LOADING_STAGE_DURATION) * 100));
      var shownProgress = reduceMotion ? (stageProgress >= 100 ? 100 : 0) : stageProgress;
      var ready = stageProgress >= 100;
      var working = stageElapsed >= 0 && !ready;
      var roundedProgress = Math.floor(shownProgress);
      var percent = item.querySelector(".loading-percent");
      percent.textContent = roundedProgress + "%";
      item.classList.toggle("is-ready", ready);
      item.classList.toggle("is-working", working);
      item.setAttribute("data-progress", String(roundedProgress));
      item.setAttribute("aria-label", LOADING_STAGES[index].label + ": " + roundedProgress + " percent");
      item.querySelector(".loading-stage-fill").style.transform = "scaleX(" + (shownProgress / 100) + ")";
    });
  }

  function startLoadingProgress() {
    var start = performance.now();
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    lastLoadingPercent = -1;
    lastLoadingAnnouncement = -1;
    updateLoadingProgress(0, reduceMotion);
    function tick(now) {
      var elapsed = Math.min(LOADING_DURATION, now - start);
      updateLoadingProgress(elapsed, reduceMotion);
      if (elapsed < LOADING_DURATION) {
        loadingFrame = window.requestAnimationFrame(tick);
        return;
      }
      updateLoadingProgress(LOADING_DURATION, reduceMotion);
      loadingFrame = null;
      loadingCompletionTimer = window.setTimeout(function () {
        track("funnel_personalization_completed", { answers_count: Object.keys(state.answers).length, duration_ms: LOADING_DURATION + LOADING_COMPLETE_HOLD, progress: 100 });
        nextStep();
      }, LOADING_COMPLETE_HOLD);
    }
    loadingFrame = window.requestAnimationFrame(tick);
  }

  function preloadImage(source) {
    if (!source || preloadedAssets[source]) return;
    preloadedAssets[source] = true;
    var image = new Image();
    image.decoding = "async";
    image.src = source;
    if (typeof image.decode === "function") image.decode().catch(function () {});
  }

  function preloadVisualAssets(visual) {
    if (!visual) return;
    if (visual.background) preloadImage(visual.background.src);
    (visual.layers || []).forEach(function (layer) { preloadImage(layer.src); });
  }

  function preloadNextAssets() {
    var work = function () {
      var next = STEPS[state.step + 1];
      if (!next) return;
      if (next.image) preloadImage(next.image);
      preloadVisualAssets(next.visual);
      if (["widgets", "themes", "preview", "fonts", "result"].indexOf(next.kind) >= 0) preloadImage(selectedTheme().image);
      if (next.kind === "widgets") preloadImage("/funnel/assets/sisyphus.webp");
      if (next.kind === "preview") HOME_SCREEN_ICONS.forEach(function (icon) { preloadImage("/funnel/assets/home-icon-" + icon.id + ".webp"); });
      if (next.kind === "social") {
        preloadImage("/funnel/assets/social-proof-aurelius.webp");
        preloadImage("/funnel/assets/social-proof-stars-laurels.webp");
      }
      if (next.kind === "fonts" && document.fonts) {
        var fontsToLoad = fontChoices().concat([effectiveFont("dynamic", selectedTheme())]);
        fontsToLoad.forEach(function (font) { if (font.family) document.fonts.load("16px " + font.family).catch(function () {}); });
      }
    };
    if (window.requestIdleCallback) window.requestIdleCallback(work, { timeout: 900 });
    else window.setTimeout(work, 120);
  }

  function renderCurrentStep() {
    cancelTransientWork();
    document.body.classList.remove("is-intro");
    mountShell();
    var step = STEPS[state.step];
    document.body.classList.toggle("is-dark", step.dark === true);
    var body = "";
    if (step.kind === "single" || step.kind === "multi") body = renderQuestion(step);
    if (step.kind === "benefit") body = renderBenefit(step);
    if (step.kind === "glances") body = renderGlances(step);
    if (step.kind === "study") body = renderStudy(step);
    if (step.kind === "quotes") body = renderQuotes(step);
    if (step.kind === "widgets") body = renderWidgets(step);
    if (step.kind === "themes") body = renderThemes(step);
    if (step.kind === "preview") body = renderPreview(step);
    if (step.kind === "fonts") body = renderFonts(step);
    if (step.kind === "social") body = renderSocial(step);
    if (step.kind === "loading") body = renderLoading(step);
    if (step.kind === "email") body = renderEmail(step);
    if (step.kind === "result") body = renderResult(step);
    if (step.kind === "paywall") body = renderPaywall(step);
    var screen = document.getElementById("funnel-screen");
    screen.dataset.step = step.id;
    screen.innerHTML = body;
    syncHeader();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    bindCurrentStep(step);
    track("funnel_screen_viewed", { screen: step.id, index: state.step });
    if (step.kind === "loading") startLoadingProgress();
    preloadNextAssets();
  }

  function nextStep() {
    if (state.step >= TOTAL_STEPS - 1) return;
    state.step += 1;
    saveState();
    renderCurrentStep();
  }

  function previousStep() {
    if (state.step <= 0) return;
    track("funnel_back_tapped", { from_index: state.step });
    state.step -= 1;
    saveState();
    renderCurrentStep();
  }

  function setSelectionState(node, active) {
    node.classList.toggle("is-selected", active);
    node.setAttribute("aria-pressed", String(active));
    var control = node.querySelector(".selection-control");
    if (control) control.checked = active;
  }

  function syncExclusive(selector, dataAttribute, value) {
    document.querySelectorAll(selector).forEach(function (node) {
      var active = node.getAttribute(dataAttribute) === value;
      setSelectionState(node, active);
    });
  }

  function syncOptionSelection(step) {
    var selected = selectedValues(step.id);
    document.querySelectorAll("[data-option]").forEach(function (button) {
      var active = selected.indexOf(button.dataset.option) >= 0;
      setSelectionState(button, active);
    });
    var continueButton = document.querySelector('[data-action="continue"]');
    if (continueButton && step.kind === "multi") continueButton.disabled = selected.length === 0;
  }

  function chooseOption(step, value) {
    if (step.kind === "multi") {
      var values = selectedValues(step.id).slice();
      var index = values.indexOf(value);
      if (index >= 0) values.splice(index, 1);
      else values.push(value);
      if (value === "none" && index < 0) values = ["none"];
      if (value !== "none") values = values.filter(function (item) { return item !== "none"; });
      state.answers[step.id] = values;
      saveState();
      track("funnel_answer_selected", { answer: value, selected: index < 0, multi: true });
      syncOptionSelection(step);
      return;
    }
    state.answers[step.id] = value;
    saveState();
    track("funnel_answer_selected", { answer: value, selected: true, multi: false });
    syncOptionSelection(step);
    window.clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = window.setTimeout(nextStep, 240);
  }

  function bindThemeCards(root) {
    (root || document).querySelectorAll("[data-theme-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.answers.themeId = button.dataset.themeId;
        state.answers.theme = button.dataset.themeBundleId;
        state.themeBundleView = state.answers.theme;
        saveState();
        var selected = selectedTheme();
        track("funnel_theme_selected", { theme: selected.bundle, theme_id: selected.id, theme_bundle: selected.bundle, app_theme_category: selected.bundle === "philosophers" ? "wisdom" : selected.bundle });
        syncExclusive("[data-theme-id]", "data-theme-id", selected.id);
        var continueButton = document.querySelector('[data-action="continue"]');
        if (continueButton) continueButton.disabled = false;
      });
    });
  }

  function updateThemePanel(bundleId) {
    state.themeBundleView = bundleId;
    saveState();
    document.querySelectorAll("[data-theme-bundle]").forEach(function (tab) {
      var active = tab.dataset.themeBundle === bundleId;
      tab.classList.toggle("is-selected", active);
      tab.setAttribute("aria-selected", String(active));
      tab.setAttribute("tabindex", active ? "0" : "-1");
    });
    document.querySelectorAll("[data-theme-panel]").forEach(function (panel) {
      panel.hidden = panel.dataset.themePanel !== bundleId;
    });
  }

  async function submitEmail(form) {
    var input = form.querySelector("#email");
    var consent = form.querySelector("#marketing-consent");
    var message = form.querySelector("#email-message");
    var submit = form.querySelector("button[type=submit]");
    var email = input.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message.textContent = "Enter a valid email address.";
      input.focus();
      track("funnel_email_failed", { reason: "invalid_email" });
      return;
    }
    state.email = email;
    state.marketingConsent = consent.checked;
    saveState();
    submit.disabled = true;
    submit.textContent = "Saving your plan";
    message.textContent = "";
    try {
      var response = await fetch("/api/web-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.email, marketing_consent: state.marketingConsent, session_id: state.sessionId, answers: sanitizedAnswers(), attribution: state.attribution, referrer: document.referrer || null })
      });
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(result.message || result.error || "Could not save your plan");
      track("funnel_email_submitted", { marketing_consent: state.marketingConsent });
      nextStep();
    } catch (error) {
      message.textContent = error && error.message ? error.message : "Could not save your plan. Try again.";
      submit.disabled = false;
      submit.textContent = "Save my plan";
      track("funnel_email_failed", { reason: "request_failed" });
    }
  }

  function bindCurrentStep(step) {
    document.querySelectorAll("[data-option]").forEach(function (button) {
      button.addEventListener("click", function () { chooseOption(step, button.dataset.option); });
    });
    document.querySelectorAll("[data-quote]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.answers.quote = button.dataset.quote;
        saveState();
        track("funnel_quote_selected", { quote: state.answers.quote });
        syncExclusive("[data-quote]", "data-quote", state.answers.quote);
        var continueButton = document.querySelector('[data-action="continue"]');
        if (continueButton) continueButton.disabled = false;
      });
    });
    document.querySelectorAll("[data-widget]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.answers.widget = button.dataset.widget;
        saveState();
        var widget = widgetFor(state.answers.widget);
        track("funnel_widget_selected", { widget: widget.id, app_widget_type: widget.appType });
        syncExclusive("[data-widget]", "data-widget", widget.id);
        var carousel = button.closest(".carousel");
        if (carousel) {
          var left = button.offsetLeft - ((carousel.clientWidth - button.offsetWidth) / 2);
          var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          carousel.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? "auto" : "smooth" });
        }
      });
    });
    var themeTabs = Array.from(document.querySelectorAll("[data-theme-bundle]"));
    themeTabs.forEach(function (button, index) {
      button.addEventListener("click", function () {
        track("funnel_theme_bundle_selected", { theme_bundle: button.dataset.themeBundle });
        updateThemePanel(button.dataset.themeBundle);
      });
      button.addEventListener("keydown", function (event) {
        var targetIndex = null;
        if (event.key === "ArrowRight") targetIndex = (index + 1) % themeTabs.length;
        if (event.key === "ArrowLeft") targetIndex = (index - 1 + themeTabs.length) % themeTabs.length;
        if (event.key === "Home") targetIndex = 0;
        if (event.key === "End") targetIndex = themeTabs.length - 1;
        if (targetIndex === null) return;
        event.preventDefault();
        themeTabs[targetIndex].focus();
        themeTabs[targetIndex].click();
      });
      button.addEventListener("mouseenter", function () {
        THEMES.filter(function (item) { return item.bundle === button.dataset.themeBundle; }).slice(0, 3).forEach(function (item) { preloadImage(item.image); });
      });
      button.addEventListener("focus", function () {
        THEMES.filter(function (item) { return item.bundle === button.dataset.themeBundle; }).slice(0, 3).forEach(function (item) { preloadImage(item.image); });
      });
    });
    bindThemeCards(document);
    document.querySelectorAll("[data-font]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.answers.font = button.dataset.font;
        saveState();
        var resolved = effectiveFont(state.answers.font, selectedTheme());
        track("funnel_font_selected", { font: state.answers.font, resolved_font: resolved.id });
        syncExclusive("[data-font]", "data-font", state.answers.font);
        var preview = document.querySelector(".font-live-preview [data-widget-renderer]");
        if (preview) {
          preview.style.setProperty("--widget-font", resolved.family);
          preview.dataset.fontId = resolved.id;
        }
      });
    });
    document.querySelectorAll("[data-plan]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.plan = button.dataset.plan;
        saveState();
        track("funnel_plan_selected", { plan: state.plan });
        syncExclusive("[data-plan]", "data-plan", state.plan);
        var checkoutButton = document.querySelector(".checkout-button");
        if (checkoutButton) checkoutButton.textContent = "Web checkout coming soon";
        var error = document.getElementById("checkout-error");
        if (error) error.textContent = "";
      });
    });
    var form = document.getElementById("email-form");
    if (form) form.addEventListener("submit", function (event) { event.preventDefault(); submitEmail(form); });
    var continueButton = document.querySelector('[data-action="continue"]');
    if (continueButton) continueButton.addEventListener("click", function () {
      track("funnel_primary_cta_tapped", { screen: step.id });
      if (step.kind !== "paywall") nextStep();
    });
  }

  window.addEventListener("pagehide", function () {
    cancelTransientWork();
    if (completed || checkoutOpened) return;
    var data = JSON.stringify({
      event: "funnel_abandoned",
      session_id: state.sessionId,
      step_id: STEPS[state.step].id,
      step_index: state.step,
      funnel_version: "stoic_web_v1",
      properties: Object.assign({}, state.attribution, {
        selected_options: sanitizedAnswers(),
        selected_plan: state.plan,
        theme_id: selectedTheme().id,
        theme_bundle: selectedTheme().bundle,
        app_widget_type: widgetFor(state.answers.widget).appType
      })
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/funnel-event", new Blob([data], { type: "application/json" }));
  });

  if (shouldShowIntro()) renderIntro();
  else renderCurrentStep();
})();
