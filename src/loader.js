// The light half, and the only file an app links to. It wires up buttons and
// fetches the engine (pdfbot-engine.js, the large file) on the first click, so
// pages that never save a PDF never pay for it.
//
//   <script src="/pdfbot/pdfbot.js" defer></script>
//   <button data-pdfbot>Save as PDF</button>

(function () {
  if (window.pdfbot) return;

  var VERSION = __PDFBOT_VERSION__;
  var script = document.currentScript;
  var enginePromise = null;

  function engineUrl() {
    if (script && script.getAttribute('data-pdfbot-engine')) {
      return script.getAttribute('data-pdfbot-engine');
    }
    // The version in the URL means a cached engine from an older release is
    // never paired with this loader.
    if (script && script.src) return new URL('pdfbot-engine.js?v=' + VERSION, script.src).href;
    throw new Error('pdfbot: cannot find pdfbot-engine.js; set data-pdfbot-engine on the script tag');
  }

  function loadEngine() {
    if (window.__pdfbotEngine) return Promise.resolve(window.__pdfbotEngine);
    if (enginePromise) return enginePromise;
    enginePromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = engineUrl();
      s.onload = function () {
        if (window.__pdfbotEngine) resolve(window.__pdfbotEngine);
        else reject(new Error('pdfbot: the engine loaded but did not start'));
      };
      s.onerror = function () {
        enginePromise = null; // allow a retry on the next click
        reject(new Error('pdfbot: could not load ' + s.src));
      };
      document.head.appendChild(s);
    });
    return enginePromise;
  }

  function save(options) {
    return loadEngine().then(function (e) { return e.save(options); });
  }

  function toBlob(options) {
    return loadEngine().then(function (e) { return e.toBlob(options); });
  }

  // Reads options off a button: data-pdfbot="#report" data-pdfbot-filename="x"
  function optionsFrom(el) {
    var d = el.dataset;
    return {
      target: d.pdfbot || null,
      filename: d.pdfbotFilename,
      format: d.pdfbotFormat,
      orientation: d.pdfbotOrientation,
      margin: d.pdfbotMargin,
      scale: d.pdfbotScale,
      image: d.pdfbotImage,
      pageNumbers: d.pdfbotPageNumbers,
      text: d.pdfbotText,
    };
  }

  // Runs a save from a button, showing progress on the button itself.
  function run(el, options) {
    if (el.getAttribute('aria-busy') === 'true') return Promise.resolve(null);
    var plainText = el.children.length === 0;
    var label = el.textContent;
    var wasDisabled = el.disabled;
    el.setAttribute('aria-busy', 'true');
    el.dataset.pdfbotState = 'busy';
    if ('disabled' in el) el.disabled = true;
    if (plainText) el.textContent = el.dataset.pdfbotBusyLabel || 'Saving…';

    function restore(state) {
      el.removeAttribute('aria-busy');
      el.dataset.pdfbotState = state;
      if ('disabled' in el) el.disabled = wasDisabled;
      if (plainText) el.textContent = label;
    }

    return save(options).then(
      function (result) { restore('done'); return result; },
      function (error) {
        restore('error');
        console.error(error);
        if (plainText) {
          el.textContent = el.dataset.pdfbotErrorLabel || 'Could not save PDF';
          setTimeout(function () { el.textContent = label; }, 3000);
        }
        return null;
      }
    );
  }

  // Any element with data-pdfbot is a save button, including ones added to
  // the page later.
  document.addEventListener('click', function (event) {
    var el = event.target && event.target.closest && event.target.closest('[data-pdfbot]');
    if (!el) return;
    event.preventDefault();
    run(el, optionsFrom(el));
  });

  // Makes a ready-made button for apps that would rather not write markup.
  function button(options) {
    options = options || {};
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = options.label || 'Save as PDF';
    b.setAttribute('data-pdfbot-ignore', '');
    b.addEventListener('click', function () { run(b, options); });
    return b;
  }

  // Adds a floating button to the corner of the page.
  function mount(options) {
    var b = button(options);
    b.className = 'pdfbot-floating';
    b.style.cssText = [
      'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483000',
      'padding:10px 16px', 'border:0', 'border-radius:999px',
      'background:#1f2933', 'color:#fff', 'font:600 14px/1 system-ui,sans-serif',
      'box-shadow:0 2px 8px rgba(0,0,0,.25)', 'cursor:pointer',
    ].join(';');
    (document.body || document.documentElement).appendChild(b);
    return b;
  }

  window.pdfbot = {
    version: VERSION,
    save: save,
    toBlob: toBlob,
    button: button,
    mount: mount,
    preload: loadEngine,
  };

  // <script src="pdfbot.js" data-pdfbot-auto> adds the floating button itself.
  if (script && script.hasAttribute('data-pdfbot-auto')) {
    var auto = optionsFrom(script);
    auto.target = script.getAttribute('data-pdfbot-auto') || null;
    if (document.body) mount(auto);
    else document.addEventListener('DOMContentLoaded', function () { mount(auto); });
  }
})();
