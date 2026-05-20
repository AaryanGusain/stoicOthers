(function () {
  var STATE_REQUIRED = { US: true, CA: true, IN: true };
  var PRODUCT_PREVIEW = {
    book_pdf: { name: '14 Days to a Stoic Mind PDF', amount: 999, currency: 'USD' },
    audiobook: { name: '14 Days to a Stoic Mind Audiobook', amount: 999, currency: 'USD' },
    wallpaper_strength: { name: 'Wallpaper Bundle I: Strength & Discipline', amount: 500, currency: 'USD' },
    wallpaper_solitude: { name: 'Wallpaper Bundle II: Solitude & Stillness', amount: 500, currency: 'USD' },
    wallpaper_wisdom: { name: 'Wallpaper Bundle III: Wisdom & Reflection', amount: 500, currency: 'USD' },
    complete_pack: { name: 'Stoic Meditations Complete Pack', amount: 2000, currency: 'USD' }
  };
  var COUNTRY_CODES = 'AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(' ');
  var STATE_OPTIONS = {
    IN: 'Andhra Pradesh|Arunachal Pradesh|Assam|Bihar|Chhattisgarh|Goa|Gujarat|Haryana|Himachal Pradesh|Jharkhand|Karnataka|Kerala|Madhya Pradesh|Maharashtra|Manipur|Meghalaya|Mizoram|Nagaland|Odisha|Punjab|Rajasthan|Sikkim|Tamil Nadu|Telangana|Tripura|Uttar Pradesh|Uttarakhand|West Bengal|Andaman and Nicobar Islands|Chandigarh|Dadra and Nagar Haveli and Daman and Diu|Delhi|Jammu and Kashmir|Ladakh|Lakshadweep|Puducherry'.split('|'),
    US: 'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming'.split('|'),
    CA: 'Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland and Labrador|Northwest Territories|Nova Scotia|Nunavut|Ontario|Prince Edward Island|Quebec|Saskatchewan|Yukon'.split('|')
  };
  var modal;
  var activeProduct = null;
  var activeEmail = '';
  var activeCheckoutData = null;
  var quoteRequestId = 0;

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function utmPayload() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
      marketing_source: params.get('utm_source') || undefined
    };
  }

  function countryName(code) {
    try {
      if (window.Intl && Intl.DisplayNames) {
        return new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' }).of(code) || code;
      }
    } catch (_error) {}
    return code;
  }

  function countryOptionsHtml() {
    var preferred = ['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG'];
    var seen = {};
    var sorted = COUNTRY_CODES.slice().sort(function (a, b) {
      return countryName(a).localeCompare(countryName(b));
    });
    var ordered = preferred.concat(sorted.filter(function (code) { return preferred.indexOf(code) === -1; }));

    return '<option value="">Select billing country</option>' + ordered.map(function (code) {
      if (seen[code]) return '';
      seen[code] = true;
      return '<option value="' + code + '">' + escapeHtml(countryName(code)) + ' (' + code + ')</option>';
    }).join('');
  }

  function ensureModal() {
    if (modal) return modal;

    var style = document.createElement('style');
    style.textContent = [
      '.rzp-modal{position:fixed;inset:0;z-index:9999;background:rgba(28,26,23,.52);display:none;align-items:center;justify-content:center;padding:1rem}',
      '.rzp-modal.visible{display:flex}',
      '.rzp-card{width:min(520px,100%);background:#f0e9d8;border:1px solid #b9aa8f;box-shadow:0 28px 80px -34px rgba(0,0,0,.55);padding:1.35rem;color:#1c1a17;font-family:Georgia,serif;position:relative}',
      '.rzp-card:before,.rzp-card:after{content:"";position:absolute;width:18px;height:18px;border-color:#8f754d}.rzp-card:before{top:10px;left:10px;border-top:1px solid;border-left:1px solid}.rzp-card:after{right:10px;bottom:10px;border-right:1px solid;border-bottom:1px solid}',
      '.rzp-card h2{font-weight:500;font-size:1.7rem;line-height:1.1;margin:0 0 .35rem;text-align:center}',
      '.rzp-card p{margin:0 0 1rem;text-align:center;color:#75695b}',
      '.rzp-grid{display:grid;gap:.7rem}',
      '.rzp-grid input,.rzp-grid select{width:100%;border:1px solid #b9aa8f;background:#f8f3ea;color:#1c1a17;padding:.82rem;font:inherit}',
      '.rzp-grid select{appearance:auto}',
      '.rzp-grid label{font-size:.92rem;color:#5e5144}',
      '.rzp-consent{display:flex;gap:.6rem;align-items:flex-start;font-size:.86rem;line-height:1.35;color:#5e5144}',
      '.rzp-consent input{width:auto;margin-top:.15rem}',
      '.rzp-actions{display:flex;gap:.7rem;margin-top:1rem}',
      '.rzp-actions button{flex:1;border:1px solid #1c1a17;padding:.9rem 1rem;text-transform:uppercase;letter-spacing:.18em;font:600 .72rem Inter Tight,Arial,sans-serif;cursor:pointer}',
      '.rzp-primary{background:#1c1a17;color:#f6f1e7}.rzp-secondary{background:transparent;color:#1c1a17}',
      '.rzp-breakdown{display:none;border-top:1px solid #c8bda7;border-bottom:1px solid #c8bda7;margin-top:1rem;padding:.75rem 0;font-family:Inter Tight,Arial,sans-serif;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase}',
      '.rzp-breakdown.visible{display:block}',
      '.rzp-row{display:flex;justify-content:space-between;gap:1rem;padding:.28rem 0;color:#5e5144}',
      '.rzp-row.total{color:#1c1a17;font-weight:700;border-top:1px dotted #c8bda7;margin-top:.35rem;padding-top:.55rem}',
      '.rzp-status{min-height:1.25rem;margin-top:.7rem;text-align:center;color:#6b4d2a;font-style:italic}'
    ].join('');
    document.head.appendChild(style);

    modal = document.createElement('div');
    modal.className = 'rzp-modal';
    modal.innerHTML = '' +
      '<form class="rzp-card" id="rzpPrecheckoutForm">' +
        '<h2>Confirm billing details</h2>' +
        '<p>Required before secure Razorpay checkout for tax and sales records.</p>' +
        '<div class="rzp-breakdown" id="rzpBreakdown"></div>' +
        '<div class="rzp-grid">' +
          '<input type="email" name="customer_email" placeholder="Email address" required autocomplete="email">' +
          '<input type="text" name="customer_name" placeholder="Name (optional)" autocomplete="name">' +
          '<select name="declared_country" required autocomplete="country">' + countryOptionsHtml() + '</select>' +
          '<select name="declared_state_region_select" hidden disabled></select>' +
          '<input type="text" name="declared_state_region" placeholder="State / region (optional)" hidden disabled>' +
          '<label class="rzp-consent"><input type="checkbox" name="consent" required> <span>I confirm my billing country is accurate and understand this purchase is for a digital ebook.</span></label>' +
        '</div>' +
        '<div class="rzp-actions">' +
          '<button class="rzp-secondary" type="button" data-rzp-close>Cancel</button>' +
          '<button class="rzp-primary" type="submit" id="rzpPrimary">Continue</button>' +
        '</div>' +
        '<div class="rzp-status" id="rzpStatus"></div>' +
      '</form>';
    document.body.appendChild(modal);

    modal.addEventListener('click', function (event) {
      if (event.target === modal || event.target.hasAttribute('data-rzp-close')) closeModal();
    });

    qs('#rzpPrecheckoutForm', modal).addEventListener('submit', submitPrecheckout);
    qs('[name=declared_country]', modal).addEventListener('change', handleCountryChange);
    qs('[name=declared_state_region_select]', modal).addEventListener('change', function () {
      resetPreparedOrder();
    });

    return modal;
  }

  function openModal(product, email) {
    activeProduct = product;
    activeEmail = email || '';
    activeCheckoutData = null;
    quoteRequestId += 1;
    ensureModal();
    var form = qs('#rzpPrecheckoutForm', modal);
    delete form.dataset.ready;
    lockFormInputs(false);
    form.reset();
    qs('[name=customer_email]', modal).value = activeEmail;
    updateStateField('');
    renderBaseBreakdown();
    qs('#rzpPrimary', modal).textContent = 'Continue';
    qs('#rzpStatus', modal).textContent = '';
    modal.classList.add('visible');
    qs('[name=customer_email]', modal).focus();
  }

  function closeModal() {
    if (modal) {
      quoteRequestId += 1;
      modal.classList.remove('visible');
    }
  }

  function setBusy(busy, message) {
    qs('#rzpPrimary', modal).disabled = busy;
    qs('#rzpStatus', modal).textContent = message || '';
  }

  function lockFormInputs(locked) {
    var form = qs('#rzpPrecheckoutForm', modal);
    Array.prototype.forEach.call(form.querySelectorAll('input,select'), function (node) {
      node.disabled = locked;
    });
  }

  function formatMoney(currency, amount) {
    var prefix = currency === 'USD' ? '$' : currency + ' ';
    return prefix + (Number(amount || 0) / 100).toFixed(2);
  }

  function resetPreparedOrder() {
    activeCheckoutData = null;
    quoteRequestId += 1;
    var form = qs('#rzpPrecheckoutForm', modal);
    delete form.dataset.ready;
  }

  function renderBaseBreakdown() {
    var product = PRODUCT_PREVIEW[activeProduct] || { amount: 0, currency: 'USD' };
    qs('#rzpBreakdown', modal).innerHTML = '' +
      '<div class="rzp-row"><span>Product price</span><strong>' + formatMoney(product.currency, product.amount) + '</strong></div>' +
      '<div class="rzp-row"><span>Taxes & processing</span><strong>Select country</strong></div>' +
      '<div class="rzp-row total"><span>Total charged</span><strong>Select country</strong></div>';
    qs('#rzpBreakdown', modal).classList.add('visible');
  }

  function updateStateField(country) {
    var select = qs('[name=declared_state_region_select]', modal);
    var fallback = qs('[name=declared_state_region]', modal);
    var states = STATE_OPTIONS[country] || [];

    select.innerHTML = '';
    if (!country) {
      select.hidden = true;
      select.disabled = true;
      select.required = false;
      fallback.hidden = true;
      fallback.disabled = true;
      fallback.required = false;
      fallback.value = '';
      return;
    }

    if (states.length) {
      select.innerHTML = '<option value="">Select state / region</option>' + states.map(function (state) {
        return '<option value="' + escapeHtml(state) + '">' + escapeHtml(state) + '</option>';
      }).join('');
      select.hidden = false;
      select.disabled = false;
      select.required = true;
      fallback.hidden = true;
      fallback.disabled = true;
      fallback.required = false;
      fallback.value = '';
      return;
    }

    select.hidden = true;
    select.disabled = true;
    select.required = false;
    fallback.hidden = true;
    fallback.disabled = true;
    fallback.required = false;
    fallback.value = '';
  }

  function handleCountryChange(event) {
    var country = event.currentTarget.value;
    resetPreparedOrder();
    updateStateField(country);
    if (!country) {
      renderBaseBreakdown();
      qs('#rzpPrimary', modal).textContent = 'Continue';
      return;
    }
    refreshQuote(country);
  }

  function refreshQuote(country) {
    var currentRequest = ++quoteRequestId;
    qs('#rzpStatus', modal).textContent = 'Calculating taxes & processing...';

    fetch('/api/quote-checkout-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: activeProduct,
        declared_country: country
      })
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw new Error(data.error || 'Could not calculate total');
          return data;
        });
      })
      .then(function (data) {
        if (currentRequest !== quoteRequestId) return;
        renderBreakdown(data);
        qs('#rzpStatus', modal).textContent = '';
      })
      .catch(function (error) {
        if (currentRequest !== quoteRequestId) return;
        renderBaseBreakdown();
        qs('#rzpStatus', modal).textContent = error.message || 'Could not calculate total yet.';
      });
  }

  function renderBreakdown(data) {
    var breakdown = data.pricing_breakdown || {};
    var currency = data.currency || breakdown.currency || 'USD';
    var label = breakdown.recovery_label || 'Taxes & processing';
    var listed = breakdown.listed_amount;
    var adjustment = breakdown.taxes_and_processing_amount;
    var total = breakdown.total_amount;
    var display = breakdown.display || {};

    qs('#rzpBreakdown', modal).innerHTML = '' +
      '<div class="rzp-row"><span>Product price</span><strong>' + (display.listed_amount ? formatMoney(currency, listed) : formatMoney(currency, listed)) + '</strong></div>' +
      '<div class="rzp-row"><span>' + escapeHtml(label) + '</span><strong>' + formatMoney(currency, adjustment) + '</strong></div>' +
      '<div class="rzp-row total"><span>Total charged</span><strong>' + formatMoney(currency, total || data.amount) + '</strong></div>';
    qs('#rzpBreakdown', modal).classList.add('visible');
    qs('#rzpPrimary', modal).textContent = 'Pay ' + formatMoney(currency, total || data.amount);
  }

  function launchCheckout(data) {
    closeModal();
    var options = Object.assign({}, data.checkout, {
      key: data.key_id,
      amount: data.amount,
      currency: data.currency,
      handler: function (paymentResponse) {
        setBusy(true, 'Verifying payment...');
        fetch('/api/verify-razorpay-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentResponse)
        })
          .then(function (response) {
            return response.json().then(function (verifyData) {
              if (!response.ok) throw new Error(verifyData.reason || verifyData.error || 'Payment verification failed');
              return verifyData;
            });
          })
          .then(function (verifyData) {
            window.location.href = '/thank-you?order_id=' + encodeURIComponent(verifyData.local_order_id || data.local_order_id);
          })
          .catch(function () {
            alert('Payment was received but verification failed. Contact support with your Razorpay payment ID.');
          });
      },
      modal: {
        ondismiss: function () {
          setBusy(false, '');
        }
      }
    });

    var checkout = new window.Razorpay(options);
    checkout.open();
    setBusy(false, '');
  }

  function submitPrecheckout(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var country = form.declared_country.value.trim().toUpperCase();
    var state = STATE_REQUIRED[country]
      ? form.declared_state_region_select.value.trim()
      : form.declared_state_region.value.trim();

    if (!country) {
      qs('#rzpStatus', modal).textContent = 'Select your billing country first.';
      form.declared_country.focus();
      return;
    }

    if (STATE_REQUIRED[country] && !state) {
      qs('#rzpStatus', modal).textContent = 'State / region is required for US, Canada, and India.';
      form.declared_state_region_select.focus();
      return;
    }

    if (!window.Razorpay) {
      qs('#rzpStatus', modal).textContent = 'Razorpay checkout script did not load. Refresh and try again.';
      return;
    }

    setBusy(true, 'Opening secure Razorpay checkout...');
    var currentRequest = ++quoteRequestId;

    var payload = Object.assign({
      product_id: activeProduct,
      customer_email: form.customer_email.value.trim(),
      customer_name: form.customer_name.value.trim() || undefined,
      declared_country: country,
      declared_state_region: state || undefined,
      consent: form.consent.checked,
      browser_locale: navigator.language || undefined,
      referrer: document.referrer || undefined
    }, utmPayload());

    fetch('/api/create-ebook-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw new Error(data.message || data.error || 'Order creation failed');
          return data;
        });
      })
      .then(function (data) {
        if (currentRequest !== quoteRequestId) return;
        activeCheckoutData = data;
        renderBreakdown(data);
        launchCheckout(data);
      })
      .catch(function (error) {
        if (currentRequest !== quoteRequestId) return;
        setBusy(false, error.message || 'Checkout is unavailable right now.');
      });
  }

  function attachCheckoutHandlers() {
    document.querySelectorAll('form[data-razorpay-product]').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var emailInput = form.querySelector('input[type=email]');
        openModal(form.dataset.razorpayProduct, emailInput ? emailInput.value.trim() : '');
      });
    });

    document.querySelectorAll('[data-checkout-product], [data-razorpay-link-product]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        openModal(link.dataset.checkoutProduct || link.dataset.razorpayLinkProduct, '');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachCheckoutHandlers);
  } else {
    attachCheckoutHandlers();
  }
})();
