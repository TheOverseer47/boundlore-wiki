// Central HTML sanitization and content URL safety policy (P5-D.1 / S+-03).
// No fetches, no Supabase, no exceptions thrown.
(function() {
  var CONTENT_SAFETY_VERSION = "p5-d1";

  var UNSAFE_SCHEME_RE = /^\s*(javascript|data|vbscript|file|blob|ftp)\s*:/i;
  var ABSOLUTE_HTTP_RE = /^\s*https?:\/\//i;
  var RELATIVE_INTERNAL_RE = /^\s*\//;
  var PROTOCOL_RELATIVE_RE = /^\s*\/\//;
  var BACKSLASH_OBFUSCATION_RE = /^\s*\/\\/;
  var CONTROL_CHAR_RE = /[\u0000-\u001f\u007f]/;
  var PERCENT_ENCODING_RE = /%[0-9a-f]{2}/i;
  var CLASS_TOKEN_RE = /^[a-zA-Z0-9_-]+$/;

  var ALLOWED_TAGS = {
    p: true, br: true, strong: true, b: true, em: true, i: true, u: true, s: true,
    blockquote: true, pre: true, code: true, ul: true, ol: true, li: true,
    h2: true, h3: true, h4: true, a: true, img: true
  };

  var DROP_WITHOUT_CONTENT = {
    script: true, style: true, meta: true, base: true, object: true, iframe: true,
    embed: true, svg: true, math: true, form: true, input: true, button: true,
    select: true, textarea: true, link: true, video: true, audio: true,
    source: true, canvas: true
  };

  var GLOBAL_ATTRS = { class: true };
  var TAG_ATTRS = {
    a: { href: true, title: true, target: true, rel: true },
    img: { src: true, alt: true, title: true, width: true, height: true }
  };

  function toStringValue(value) {
    if (value == null) return "";
    return String(value);
  }

  function stripControlChars(value) {
    return value.replace(/[\u0000-\u001f\u007f]/g, "");
  }

  function collapseSchemeWhitespace(value) {
    return value.replace(/[\s\u0000-\u001f\u007f]+/g, "");
  }

  function tryDecodePercentEncoding(value) {
    if (!PERCENT_ENCODING_RE.test(value)) return value;
    try {
      return decodeURIComponent(value);
    } catch (err) {
      return value;
    }
  }

  function detectDangerousScheme(value) {
    var trimmed = value.trim();
    if (!trimmed) return false;

    var candidates = [trimmed, stripControlChars(trimmed), collapseSchemeWhitespace(trimmed)];
    var seen = {};
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      if (!candidate || seen[candidate]) continue;
      seen[candidate] = true;
      if (UNSAFE_SCHEME_RE.test(candidate)) return true;

      var decoded = tryDecodePercentEncoding(candidate);
      if (decoded !== candidate) {
        if (UNSAFE_SCHEME_RE.test(decoded)) return true;
        if (UNSAFE_SCHEME_RE.test(stripControlChars(decoded))) return true;
        if (UNSAFE_SCHEME_RE.test(collapseSchemeWhitespace(decoded))) return true;
      }
    }
    return false;
  }

  function hasBackslashObfuscation(value) {
    if (/^\s*https?:\\+/i.test(value)) return true;
    if (BACKSLASH_OBFUSCATION_RE.test(value)) return true;
    return false;
  }

  function normalizeContentUrl(value, options) {
    options = options || {};
    var raw = toStringValue(value).trim();
    if (!raw) return "";

    var normalized = stripControlChars(raw).trim();
    if (!normalized) return "";
    if (CONTROL_CHAR_RE.test(raw)) return "";
    if (PROTOCOL_RELATIVE_RE.test(normalized)) return "";
    if (hasBackslashObfuscation(normalized)) return "";
    if (detectDangerousScheme(normalized)) return "";

    if (RELATIVE_INTERNAL_RE.test(normalized)) {
      if (options.allowRelative === false) return "";
      if (normalized.indexOf("//") === 0) return "";
      if (/\\/.test(normalized)) return "";
      return normalized;
    }

    if (ABSOLUTE_HTTP_RE.test(normalized)) {
      if (options.allowAbsoluteHttp === false) return "";
      return normalized;
    }

    return "";
  }

  function classifyContentUrl(value, options) {
    var raw = toStringValue(value);
    if (!raw.trim()) {
      return { kind: "empty", safe: true, reason: "empty" };
    }
    if (CONTROL_CHAR_RE.test(raw)) {
      return { kind: "unsafe", safe: false, reason: "control_chars" };
    }
    if (PROTOCOL_RELATIVE_RE.test(raw.trim())) {
      return { kind: "unsafe", safe: false, reason: "protocol_relative" };
    }
    if (hasBackslashObfuscation(raw)) {
      return { kind: "unsafe", safe: false, reason: "backslash_obfuscation" };
    }
    if (detectDangerousScheme(raw)) {
      return { kind: "unsafe", safe: false, reason: "dangerous_scheme" };
    }

    var normalized = normalizeContentUrl(raw, options);
    if (!normalized) {
      return { kind: "unsafe", safe: false, reason: "blocked" };
    }
    if (RELATIVE_INTERNAL_RE.test(normalized)) {
      return { kind: "relative", safe: true, reason: "relative_internal" };
    }
    if (/^https:\/\//i.test(normalized)) {
      return { kind: "https", safe: true, reason: "https" };
    }
    if (/^http:\/\//i.test(normalized)) {
      return { kind: "http", safe: true, reason: "http" };
    }
    return { kind: "unsafe", safe: false, reason: "unknown" };
  }

  function isSafeContentUrl(value, options) {
    return classifyContentUrl(value, options).safe === true;
  }

  function sanitizeContentUrl(value, options) {
    options = options || {};
    if (!isSafeContentUrl(value, options)) return "";
    return normalizeContentUrl(value, options);
  }

  function sanitizeHref(value, options) {
    return sanitizeContentUrl(value, Object.assign({ allowRelative: true }, options || {}));
  }

  function sanitizeImageSrc(value, options) {
    return sanitizeContentUrl(value, Object.assign({ allowRelative: true }, options || {}));
  }

  function isAllowedClassValue(value) {
    var raw = toStringValue(value).trim();
    if (!raw) return false;
    if (CONTROL_CHAR_RE.test(raw)) return false;
    var tokens = raw.split(/\s+/).filter(Boolean);
    if (!tokens.length) return false;
    for (var i = 0; i < tokens.length; i++) {
      if (!CLASS_TOKEN_RE.test(tokens[i])) return false;
    }
    return true;
  }

  function sanitizePlainAttribute(name, value) {
    var raw = toStringValue(value);
    if (CONTROL_CHAR_RE.test(raw)) return "";
    if (/^on/i.test(name)) return "";
    if (name === "style") return "";
    return stripControlChars(raw.trim());
  }

  function isExternalHttpUrl(url) {
    return /^https?:\/\//i.test(toStringValue(url).trim());
  }

  function applySafeLinkAttributes(anchorElement, url, options) {
    options = options || {};
    if (!anchorElement || typeof anchorElement.setAttribute !== "function") return "";
    var safeHref = sanitizeHref(url, options);
    if (!safeHref) {
      anchorElement.removeAttribute("href");
      return "";
    }
    anchorElement.setAttribute("href", safeHref);
    if (options.targetBlank === true || anchorElement.getAttribute("target") === "_blank") {
      anchorElement.setAttribute("target", "_blank");
    }
    if (isExternalHttpUrl(safeHref)) {
      anchorElement.setAttribute("rel", "noopener noreferrer ugc");
    }
    return safeHref;
  }

  function copyAllowedAttributes(sourceEl, targetEl, tagName, doc) {
    var allowed = TAG_ATTRS[tagName] || {};
    var attrs = sourceEl.attributes;
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i];
      var name = attr.name.toLowerCase();
      if (/^on/.test(name) || name === "style") continue;
      if (!allowed[name] && !GLOBAL_ATTRS[name]) continue;

      if (name === "href") {
        var href = sanitizeHref(attr.value);
        if (href) targetEl.setAttribute("href", href);
        continue;
      }
      if (name === "src") {
        var src = sanitizeImageSrc(attr.value);
        if (src) targetEl.setAttribute("src", src);
        continue;
      }
      if (name === "class") {
        if (isAllowedClassValue(attr.value)) targetEl.setAttribute("class", attr.value.trim());
        continue;
      }
      if (name === "target") {
        if (attr.value === "_blank") targetEl.setAttribute("target", "_blank");
        continue;
      }
      if (name === "rel") continue;
      if (name === "width" || name === "height") {
        var num = String(attr.value || "").trim();
        if (/^\d{1,4}$/.test(num)) targetEl.setAttribute(name, num);
        continue;
      }
      var cleaned = sanitizePlainAttribute(name, attr.value);
      if (cleaned) targetEl.setAttribute(name, cleaned);
    }

    if (tagName === "a") {
      var currentHref = targetEl.getAttribute("href");
      if (currentHref) applySafeLinkAttributes(targetEl, currentHref, { targetBlank: targetEl.getAttribute("target") === "_blank" });
    }
  }

  function sanitizeNodeTree(sourceNode, targetParent, doc) {
    var child = sourceNode.firstChild;
    while (child) {
      var next = child.nextSibling;
      if (child.nodeType === 3) {
        targetParent.appendChild(doc.createTextNode(child.nodeValue || ""));
      } else if (child.nodeType === 8) {
        // Drop comments.
      } else if (child.nodeType === 1) {
        var tag = child.tagName ? child.tagName.toLowerCase() : "";
        if (DROP_WITHOUT_CONTENT[tag]) {
          child = next;
          continue;
        }
        if (!ALLOWED_TAGS[tag]) {
          sanitizeNodeTree(child, targetParent, doc);
          child = next;
          continue;
        }
        if (tag === "br") {
          targetParent.appendChild(doc.createElement("br"));
          child = next;
          continue;
        }
        if (tag === "img") {
          var src = sanitizeImageSrc(child.getAttribute("src") || "");
          if (src) {
            var img = doc.createElement("img");
            copyAllowedAttributes(child, img, "img", doc);
            if (!img.getAttribute("src")) img.setAttribute("src", src);
            targetParent.appendChild(img);
          }
          child = next;
          continue;
        }
        var el = doc.createElement(tag);
        copyAllowedAttributes(child, el, tag, doc);
        if (tag === "a" && !el.getAttribute("href")) {
          sanitizeNodeTree(child, targetParent, doc);
        } else {
          sanitizeNodeTree(child, el, doc);
          targetParent.appendChild(el);
        }
      }
      child = next;
    }
  }

  function sanitizeRichTextHtml(value, options) {
    var raw = toStringValue(value);
    if (!raw.trim()) return "";
    try {
      var parsed = new DOMParser().parseFromString("<div id=\"__bl_cs_root\">" + raw + "</div>", "text/html");
      var sourceRoot = parsed.getElementById("__bl_cs_root");
      if (!sourceRoot) return "";

      var outDoc = document.implementation.createHTMLDocument("");
      var outRoot = outDoc.createElement("div");
      sanitizeNodeTree(sourceRoot, outRoot, outDoc);
      return outRoot.innerHTML;
    } catch (err) {
      return "";
    }
  }

  function sanitizePlainText(value) {
    var raw = toStringValue(value);
    if (!raw.trim()) return "";
    try {
      var parsed = new DOMParser().parseFromString("<div>" + raw + "</div>", "text/html");
      return parsed.body ? (parsed.body.textContent || "") : "";
    } catch (err2) {
      return "";
    }
  }

  function shouldAllowUnsafeHtml() {
    return false;
  }

  function shouldAllowUnsafeUrl() {
    return false;
  }

  function getContentSafetyDiagnostics() {
    return {
      version: CONTENT_SAFETY_VERSION,
      allowUnsafeHtml: shouldAllowUnsafeHtml(),
      allowUnsafeUrl: shouldAllowUnsafeUrl(),
      allowedTags: Object.keys(ALLOWED_TAGS),
      blockedSchemes: ["javascript", "data", "vbscript", "file", "blob", "ftp"],
      engine: "domparser-allowlist"
    };
  }

  window.BoundLoreContentSafety = {
    CONTENT_SAFETY_VERSION: CONTENT_SAFETY_VERSION,
    sanitizeRichTextHtml: sanitizeRichTextHtml,
    sanitizePlainText: sanitizePlainText,
    isSafeContentUrl: isSafeContentUrl,
    sanitizeContentUrl: sanitizeContentUrl,
    sanitizeHref: sanitizeHref,
    sanitizeImageSrc: sanitizeImageSrc,
    classifyContentUrl: classifyContentUrl,
    applySafeLinkAttributes: applySafeLinkAttributes,
    shouldAllowUnsafeHtml: shouldAllowUnsafeHtml,
    shouldAllowUnsafeUrl: shouldAllowUnsafeUrl,
    getContentSafetyDiagnostics: getContentSafetyDiagnostics
  };
})();
