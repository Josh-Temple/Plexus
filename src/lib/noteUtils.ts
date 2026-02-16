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
  const lines = body.split("\n");
  const blocks: string[] = [];
  let inList = false;

  const closeListIfNeeded = () => {
    if (!inList) return;
    blocks.push("</ul>");
    inList = false;
  };

  for (const line of lines) {
    const trimmedStart = line.replace(/^[\s\u3000]+/u, "");
    const normalizedLine = trimmedStart.replace(/^＃+/u, (hashes) => "#".repeat(hashes.length));

    if (!normalizedLine.trim()) {
      closeListIfNeeded();
      continue;
    }

    const headingMatch = normalizedLine.match(/^(#{1,3})[ \u3000]*(.+)$/u);
    if (headingMatch) {
      closeListIfNeeded();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    const listMatch = normalizedLine.match(/^([-*+]|[・●])[ \u3000]+(.+)$/u);
    if (listMatch) {
      if (!inList) {
        blocks.push("<ul>");
        inList = true;
      }
      blocks.push(`<li>${renderInline(listMatch[2])}</li>`);
      continue;
    }

    closeListIfNeeded();
    blocks.push(`<p>${renderInline(line)}</p>`);
  }

  closeListIfNeeded();
  return blocks.join("");
};
