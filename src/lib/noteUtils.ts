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

type MarkdownOptions = {
  resolveWikiLink?: (title: string) => { href: string; status?: "resolved" | "ambiguous" | "unresolved" };
};

type ListState = {
  indents: number[];
  itemOpen: boolean[];
};

type NormalizedLine = {
  raw: string;
  normalized: string;
};

const renderInline = (value: string, options?: MarkdownOptions) =>
  escapeHtml(value).replace(/\[\[([^\]]+)\]\]/g, (_raw, text: string) => {
    const clean = text.trim();
    const resolved = options?.resolveWikiLink?.(clean);
    const href = resolved?.href ?? "/";
    const status = resolved?.status ? ` data-link-status=\"${resolved.status}\"` : "";

    return `<a href=\"${escapeHtml(href)}\"${status}>${escapeHtml(clean)}</a>`;
  });

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

const normalizeIndent = (indent: string) => {
  const width = Array.from(indent).reduce((count, char) => {
    if (char === "\t" || char === "\u3000") return count + 2;
    if (char === " ") return count + 1;
    return count;
  }, 0);

  return Math.floor(width / 2);
};

const normalizeMarkdownLine = (line: string): NormalizedLine => {
  const trimmedStart = line.replace(/^[\s\u3000]+/u, "");
  const normalized = trimmedStart.replace(/^＃+/u, (hashes) => "#".repeat(hashes.length));
  return { raw: line, normalized };
};

const closeListAtDepth = (blocks: string[], listState: ListState, depth: number) => {
  if (listState.itemOpen[depth]) {
    blocks.push("</li>");
    listState.itemOpen[depth] = false;
  }

  blocks.push("</ul>");
  listState.indents.pop();
  listState.itemOpen.pop();
};

const closeAllLists = (blocks: string[], listState: ListState) => {
  while (listState.indents.length) {
    closeListAtDepth(blocks, listState, listState.indents.length - 1);
  }
};

const ensureListDepth = (blocks: string[], listState: ListState, indentLevel: number) => {
  if (!listState.indents.length) {
    blocks.push("<ul>");
    listState.indents.push(indentLevel);
    listState.itemOpen.push(false);
    return;
  }

  while (listState.indents.length && indentLevel < listState.indents[listState.indents.length - 1]) {
    closeListAtDepth(blocks, listState, listState.indents.length - 1);
  }

  if (!listState.indents.length || indentLevel > listState.indents[listState.indents.length - 1]) {
    blocks.push("<ul>");
    listState.indents.push(indentLevel);
    listState.itemOpen.push(false);
  }
};

export const markdownLite = (body: string, options?: MarkdownOptions) => {
  const lines = body.split("\n");
  const blocks: string[] = [];
  const listState: ListState = { indents: [], itemOpen: [] };
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeLines: string[] = [];

  for (const line of lines) {
    const codeFenceMatch = line.match(/^```([\w-]*)\s*$/u);
    if (codeFenceMatch) {
      closeAllLists(blocks, listState);

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

    const normalizedLine = normalizeMarkdownLine(line);

    if (!normalizedLine.normalized.trim()) {
      closeAllLists(blocks, listState);
      continue;
    }

    const headingMatch = normalizedLine.normalized.match(/^(#{1,3})[ \u3000]*(.+)$/u);
    if (headingMatch) {
      closeAllLists(blocks, listState);
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInline(headingMatch[2], options)}</h${level}>`);
      continue;
    }

    const horizontalRuleMatch = normalizedLine.normalized.match(/^-{3,}\s*$/u);
    if (horizontalRuleMatch) {
      closeAllLists(blocks, listState);
      blocks.push("<hr />");
      continue;
    }

    const listMatch = normalizedLine.raw.match(/^([\t \u3000]*)([-*+]|[・●])[ \u3000]+(.+)$/u);
    if (listMatch) {
      const indentLevel = normalizeIndent(listMatch[1]);
      ensureListDepth(blocks, listState, indentLevel);

      const depth = listState.indents.length - 1;
      if (listState.itemOpen[depth]) {
        blocks.push("</li>");
      }

      blocks.push(`<li>${renderInline(listMatch[3], options)}`);
      listState.itemOpen[depth] = true;
      continue;
    }

    closeAllLists(blocks, listState);
    blocks.push(`<p>${renderInline(normalizedLine.raw, options)}</p>`);
  }

  if (inCodeBlock) {
    blocks.push(renderCodeBlock(codeLines.join("\n"), codeLanguage));
  }

  closeAllLists(blocks, listState);
  return blocks.join("");
};
