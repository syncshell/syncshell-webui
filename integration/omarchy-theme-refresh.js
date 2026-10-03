(function () {
  'use strict';

  var script = document.currentScript;
  var activeVersion = script
    ? script.getAttribute('data-theme-version') || ''
    : '';
  var loadingVersion = '';

  function luminance(rgb) {
    return rgb.reduce(function (sum, value, index) {
      var linear =
        value <= 0.04045
          ? value / 12.92
          : Math.pow((value + 0.055) / 1.055, 2.4);
      return sum + linear * [0.2126, 0.7152, 0.0722][index];
    }, 0);
  }

  function semanticPair(fill, colors) {
    // Keep readable native fills; otherwise shade toward the native page.
    for (var step = 10; step >= 0; step--) {
      var backgrounds = [1, 0.9, 0.8].map(function (state) {
        var weight = (state * step) / 10;
        return luminance(
          fill.rgb.map(function (value, channel) {
            return value * weight + colors[0].rgb[channel] * (1 - weight);
          }),
        );
      });
      var text = colors.find(function (color) {
        var foreground = luminance(color.rgb);
        return backgrounds.every(function (background) {
          return (
            (Math.max(foreground, background) + 0.05) /
              (Math.min(foreground, background) + 0.05) >=
            4.5
          );
        });
      });
      if (text)
        return {
          text: text.css,
          fill:
            step === 10
              ? fill.css
              : 'color-mix(in srgb, ' +
                fill.css +
                ' ' +
                step * 10 +
                '%, ' +
                colors[0].css +
                ')',
        };
    }
    throw new Error('No readable Omarchy foreground for ' + fill.name);
  }

  function applySemanticColors() {
    var root = document.documentElement;
    var style = getComputedStyle(root);
    var names = [
      'page',
      'text',
      'text-strong',
      'surface-muted',
      'success',
      'warning',
      'danger',
    ];
    var colors = names.map(function (name) {
      var css = style.getPropertyValue('--color-' + name).trim();
      if (!/^#[0-9a-f]{6}$/i.test(css))
        throw new Error('Invalid Omarchy color: ' + name);
      return {
        name: name,
        css: css,
        rgb: css
          .slice(1)
          .match(/../g)
          .map(function (hex) {
            return parseInt(hex, 16) / 255;
          }),
      };
    });
    colors.slice(-3).forEach(function (fill) {
      var pair = semanticPair(fill, colors);
      root.style.setProperty('--color-' + fill.name + '-text', pair.text);
      root.style.setProperty('--color-' + fill.name + '-fill', pair.fill);
    });
  }

  function currentStylesheet() {
    return document.querySelector(
      'link[rel~="stylesheet"][href^="assets/css/theme.css"]',
    );
  }

  function applyTheme(version) {
    if (!version || version === activeVersion || loadingVersion) {
      return;
    }

    var current = currentStylesheet();
    if (!current || !current.parentNode) return;

    loadingVersion = version;
    var replacement = current.cloneNode();
    replacement.href = 'assets/css/theme.css?v=' + encodeURIComponent(version);
    replacement.addEventListener(
      'load',
      function () {
        activeVersion = version;
        loadingVersion = '';
        current.remove();
        applySemanticColors();
      },
      { once: true },
    );
    replacement.addEventListener(
      'error',
      function () {
        loadingVersion = '';
        replacement.remove();
      },
      { once: true },
    );
    current.parentNode.insertBefore(replacement, current.nextSibling);
  }

  function ignoreThemeCheckFailure() {
    // Theme refresh is best effort; the next poll retries transient failures.
  }

  function checkTheme() {
    if (document.hidden) return;

    fetch('/theme-assets/syncthing-omarchy/theme-version.txt', {
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(function (response) {
        if (!response.ok) throw new Error('theme version unavailable');
        return response.text();
      })
      .then(function (value) {
        var version = value.trim();
        if (/^[A-Za-z0-9._-]+$/.test(version)) applyTheme(version);
      })
      .catch(ignoreThemeCheckFailure);
  }

  document.addEventListener('visibilitychange', checkTheme);
  window.setInterval(checkTheme, 1000);
  checkTheme();
  applySemanticColors();
})();
