export const normalizeBody = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

export const cheapHash = async (raw: string) => {
  const text = normalizeBody(raw);
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const extractWikiLinks = (body: string): string[] => {
  const matches = body.match(/\[\[([^\]]+)\]\]/g) ?? [];
  return [...new Set(matches.map((raw) => raw.slice(2, -2).trim()).filter(Boolean))];
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderInline = (value: string) =>
  escapeHtml(value).replace(/\[\[([^\]]+)\]\]/g, (_raw, text: string) => `<a href=\"/\">${escapeHtml(text)}</a>`);

export const markdownLite = (body: string) => {
  return body
    .split("\n")
    .map((line) => {
      const normalizedLine = line.replace(/^\s+/, "").replace(/^＃/u, "#");

      if (normalizedLine.startsWith("### ")) return `<h3>${renderInline(normalizedLine.slice(4))}</h3>`;
      if (normalizedLine.startsWith("## ")) return `<h2>${renderInline(normalizedLine.slice(3))}</h2>`;
      if (normalizedLine.startsWith("# ")) return `<h1>${renderInline(normalizedLine.slice(2))}</h1>`;
      if (normalizedLine.startsWith("- ")) return `<li>${renderInline(normalizedLine.slice(2))}</li>`;
      return `<p>${renderInline(line)}</p>`;
    })
    .join("")
    .replace(/(<li>.*?<\/li>)+/g, (list) => `<ul>${list}</ul>`);
};
