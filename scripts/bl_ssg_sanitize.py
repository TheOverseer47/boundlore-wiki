"""Shared BLMETA/content sanitizer for P5-E.9F.6 real-content entity SSG."""
import html
import re
from html.parser import HTMLParser

BLMETA_RE = re.compile(r"<!--\s*BLMETA[\s\S]*?-->", re.I)
UUID_RE = re.compile(
    r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.I
)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
FORBIDDEN_RE = re.compile(
    r"BLMETA|search_text|search_vector|service_role|SUPABASE_SERVICE_ROLE|"
    r"password|passwd|secret|token",
    re.I,
)
MARKER_RE = re.compile(
    r"\b(qa-test|qa-ssg|p5-e9e|fixture-only|prototype fixture|test fixture|content_origin.?test)\b",
    re.I,
)
SUPABASE_URL_RE = re.compile(r"https?://[^\"'\\s>]*supabase\.co[^\"'\\s>]*", re.I)
EVENT_HANDLER_RE = re.compile(r"\s+on[a-z]+\s*=\s*(['\"]).*?\1", re.I)
SCRIPT_STYLE_RE = re.compile(r"<\s*/?\s*(script|style|iframe|form|object|embed)\b[^>]*>", re.I)
JAVASCRIPT_URL_RE = re.compile(r"(href|src)\s*=\s*(['\"])javascript:[^'\"]*\2", re.I)
ATTACHMENTS_RE = re.compile(
    r"<h3[^>]*>\s*Discovery Attachments\s*</h3>[\s\S]*?(?=<h[23]|<!--|$)",
    re.I,
)
DISCOVERY_ATTACHMENTS_UL_RE = re.compile(
    r"<ul[^>]*class=[\"']discovery-attachments[\"'][\s\S]*?</ul>",
    re.I,
)
TAG_RE = re.compile(r"<[^>]+>")
ALLOWED_TAGS = {
    "p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "h2", "h3", "h4",
    "section", "div", "dl", "dt", "dd", "hr", "a", "span",
}


class _Stripper(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.out: list[str] = []

    def handle_starttag(self, tag: str, attrs: list) -> None:
        t = tag.lower()
        if t not in ALLOWED_TAGS:
            return
        safe = []
        for k, v in attrs:
            kl = k.lower()
            if kl.startswith("on"):
                continue
            if kl in {"href", "src"} and v and v.strip().lower().startswith("javascript:"):
                continue
            if kl in {"href", "src"} and v and SUPABASE_URL_RE.search(v):
                continue
            if kl == "style":
                continue
            if kl == "href" and v and v.startswith("/wiki/post/?slug="):
                slug = v.split("slug=", 1)[-1].split("&", 1)[0]
                v = f"/wiki/post/{slug}/"
            safe.append(f'{kl}="{html.escape(v, quote=True)}"' if v is not None else kl)
        attr_str = (" " + " ".join(safe)) if safe else ""
        self.out.append(f"<{t}{attr_str}>")

    def handle_endtag(self, tag: str) -> None:
        t = tag.lower()
        if t in ALLOWED_TAGS:
            self.out.append(f"</{t}>")

    def handle_data(self, data: str) -> None:
        self.out.append(html.escape(data))

    def get_html(self) -> str:
        return "".join(self.out)


def strip_blmeta(text: str) -> str:
    return BLMETA_RE.sub("", text or "").strip()


def plain_text(text: str) -> str:
    s = strip_blmeta(text)
    s = SCRIPT_STYLE_RE.sub("", s)
    s = TAG_RE.sub(" ", s)
    s = html.unescape(re.sub(r"\s+", " ", s)).strip()
    return s


def sanitize_html_body(raw: str) -> str:
    cleaned = strip_blmeta(raw or "")
    cleaned = ATTACHMENTS_RE.sub("", cleaned)
    cleaned = DISCOVERY_ATTACHMENTS_UL_RE.sub("", cleaned)
    cleaned = SCRIPT_STYLE_RE.sub("", cleaned)
    cleaned = EVENT_HANDLER_RE.sub("", cleaned)
    cleaned = JAVASCRIPT_URL_RE.sub("", cleaned)
    cleaned = SUPABASE_URL_RE.sub("", cleaned)
    cleaned = re.sub(r"<\s*img\b[^>]*>", "", cleaned, flags=re.I)
    cleaned = re.sub(r"<\s*a\b[^>]*>\s*\([^)]*KB\)\s*</a>", "", cleaned, flags=re.I)
    parser = _Stripper()
    parser.feed(cleaned)
    parser.close()
    result = parser.get_html()
    result = UUID_RE.sub("", result)
    result = re.sub(r"\s+", " ", result)
    result = re.sub(r">\s+<", "><", result).strip()
    return result


def sanitize_excerpt(raw: str, fallback_body: str = "", max_len: int = 160) -> str:
    text = plain_text(raw)
    if not text or len(text) < 20:
        text = plain_text(fallback_body)
    text = re.sub(r"^(Community Discovery|Knowledge Node|Discovery)+", "", text, flags=re.I).strip()
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > max_len:
        text = text[: max_len - 1].rstrip() + "…"
    return text


def assert_public_safe(text: str, label: str) -> None:
    if not text or not text.strip():
        raise ValueError(f"{label}: empty after sanitize")
    for pat, name in [
        (FORBIDDEN_RE, "forbidden pattern"),
        (UUID_RE, "uuid"),
        (EMAIL_RE, "email"),
        (MARKER_RE, "qa/test marker"),
        (SUPABASE_URL_RE, "supabase url"),
    ]:
        if pat.search(text):
            raise ValueError(f"{label}: {name} leak")
