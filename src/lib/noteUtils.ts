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

const renderCodeBlock = (code: string, language: string) => {
  const safeCode = escapeHtml(code);
  const safeLanguage = escapeHtml(language.trim());
  const encodedCode = encodeURIComponent(code);

  return [
    "<div class=\"code-block\">",
    "<div class=\"code-block-header\">",
    `<span class=\"code-block-language\">${safeLanguage || "code"}</span>`,
    `<button type=\"button\" class=\"code-copy-btn\" data-code=\"${encodedCode}\">Copy</button>`,
    "</div>",
    `<pre><code>${safeCode}</code></pre>`,
    "</div>",
  ].join("");
};

export const markdownLite = (body: string) => {
  const lines = body.split("\n");
  const blocks: string[] = [];
  const listIndents: number[] = [];
  const listItemOpen: boolean[] = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeLines: string[] = [];

  const normalizeIndent = (indent: string) => {
    const width = Array.from(indent).reduce((count, char) => {
      if (char === "\t" || char === "\u3000") return count + 2;
      if (char === " ") return count + 1;
      return count;
    }, 0);

    return Math.floor(width / 2);
  };

  const closeListAtDepth = (depth: number) => {
    if (listItemOpen[depth]) {
      blocks.push("</li>");
      listItemOpen[depth] = false;
    }

    blocks.push("</ul>");
    listIndents.pop();
    listItemOpen.pop();
  };

  const closeAllLists = () => {
    while (listIndents.length) {
      closeListAtDepth(listIndents.length - 1);
    }
  };

  const ensureListDepth = (indentLevel: number) => {
    if (!listIndents.length) {
      blocks.push("<ul>");
      listIndents.push(indentLevel);
      listItemOpen.push(false);
      return;
    }

    while (listIndents.length && indentLevel < listIndents[listIndents.length - 1]) {
      closeListAtDepth(listIndents.length - 1);
    }

    if (!listIndents.length || indentLevel > listIndents[listIndents.length - 1]) {
      blocks.push("<ul>");
      listIndents.push(indentLevel);
      listItemOpen.push(false);
    }
  };

  for (const line of lines) {
    const codeFenceMatch = line.match(/^```([\w-]*)\s*$/u);
    if (codeFenceMatch) {
      closeAllLists();

      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = codeFenceMatch[1] ?? "";
        codeLines = [];
      } else {
        blocks.push(renderCodeBlock(codeLines.join("\n"), codeLanguage));
        inCodeBlock = false;
        codeLanguage = "";
        codeLines = [];
      }

      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmedStart = line.replace(/^[\s\u3000]+/u, "");
    const normalizedLine = trimmedStart.replace(/^＃+/u, (hashes) => "#".repeat(hashes.length));

    if (!normalizedLine.trim()) {
      closeAllLists();
      continue;
    }

    const headingMatch = normalizedLine.match(/^(#{1,3})[ \u3000]*(.+)$/u);
    if (headingMatch) {
      closeAllLists();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    const horizontalRuleMatch = normalizedLine.match(/^-{3,}\s*$/u);
    if (horizontalRuleMatch) {
      closeAllLists();
      blocks.push("<hr />");
      continue;
    }

    const listMatch = line.match(/^([\t \u3000]*)([-*+]|[・●])[ \u3000]+(.+)$/u);
    if (listMatch) {
      const indentLevel = normalizeIndent(listMatch[1]);
      ensureListDepth(indentLevel);

      const depth = listIndents.length - 1;
      if (listItemOpen[depth]) {
        blocks.push("</li>");
      }

      blocks.push(`<li>${renderInline(listMatch[3])}`);
      listItemOpen[depth] = true;
      continue;
    }

    closeAllLists();
    blocks.push(`<p>${renderInline(line)}</p>`);
  }

  if (inCodeBlock) {
    blocks.push(renderCodeBlock(codeLines.join("\n"), codeLanguage));
  }

  closeAllLists();
  return blocks.join("");
};
