export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  assertRepoAllowed,
  buildContentsEndpoint,
  getInstallationToken,
  githubJsonHeaders,
  parseAllowList,
  toBase64,
} from "@/lib/githubApp";

type SaveNoteRequest = {
  title?: string;
  content?: string;
  path?: string;
  tags?: string[];
  owner?: string;
  repo?: string;
  branch?: string;
  message?: string;
};

const isBlank = (value?: string) => !value || !value.trim();

const toIsoDate = () => new Date().toISOString().slice(0, 10);

const sanitizeTag = (tag: string) => tag.trim().replace(/[\n\r,]+/g, " ").replace(/\s+/g, " ");

const normalizePath = (path: string) => path.trim().replace(/^\/+/, "");

const isValidNotesPath = (path: string) => {
  if (!path.endsWith(".md")) return false;
  if (path.includes("..")) return false;
  return path.startsWith("notes/");
};

const toMarkdown = ({ title, content, tags }: { title: string; content: string; tags: string[] }) => {
  const escapedTitle = title.replace(/[\r\n]+/g, " ").trim() || "Untitled";
  const cleanTags = tags.map(sanitizeTag).filter(Boolean);
  const tagLine = cleanTags.length ? cleanTags.join(", ") : "";

  return `---\ntitle: ${escapedTitle}\ntags: ${tagLine}\ncreated: ${toIsoDate()}\n---\n\n${content}`;
};

export async function POST(request: Request) {
  const body = (await request.json()) as SaveNoteRequest;

  if ([body.title, body.content, body.path].some((item) => isBlank(item))) {
    return NextResponse.json({ error: "title, content and path are required." }, { status: 400 });
  }

  const owner = (body.owner ?? process.env.GITHUB_NOTES_OWNER ?? "").trim();
  const repo = (body.repo ?? process.env.GITHUB_NOTES_REPO ?? "").trim();
  const branch = (body.branch ?? process.env.GITHUB_NOTES_BRANCH ?? "main").trim();
  const path = normalizePath(body.path!);

  if ([owner, repo, branch].some((item) => isBlank(item))) {
    return NextResponse.json({ error: "owner/repo/branch is missing. Pass them in request or server env." }, { status: 400 });
  }

  if (!isValidNotesPath(path)) {
    return NextResponse.json({ error: "path must be inside notes/ and end with .md" }, { status: 400 });
  }

  try {
    assertRepoAllowed(owner, repo, parseAllowList(process.env.GITHUB_ALLOWED_REPOS));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repository is blocked by server policy.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const markdown = toMarkdown({
    title: body.title!.trim(),
    content: body.content!,
    tags: Array.isArray(body.tags) ? body.tags : [],
  });

  const message = body.message?.trim() || `feat(note): save ${path.split("/").pop()?.replace(/\.md$/, "") || "note"}`;

  let token = "";
  try {
    token = await getInstallationToken(owner, repo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to authenticate with GitHub App.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const contentsEndpoint = buildContentsEndpoint(owner, repo, path);

  let sha: string | undefined;

  const getResponse = await fetch(`${contentsEndpoint}?ref=${encodeURIComponent(branch)}`, {
    method: "GET",
    headers: {
      ...githubJsonHeaders,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (getResponse.ok) {
    const existing = (await getResponse.json()) as { sha?: string };
    sha = existing.sha;
  } else if (getResponse.status !== 404) {
    const text = await getResponse.text();
    return NextResponse.json({ error: `Failed to fetch existing file: ${text || getResponse.statusText}` }, { status: getResponse.status });
  }

  const putResponse = await fetch(contentsEndpoint, {
    method: "PUT",
    headers: {
      ...githubJsonHeaders,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: toBase64(markdown),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putResponse.ok) {
    const text = await putResponse.text();
    return NextResponse.json({ error: `Commit failed: ${text || putResponse.statusText}` }, { status: putResponse.status });
  }

  const result = (await putResponse.json()) as { content?: { path?: string }; commit?: { sha?: string; html_url?: string } };

  return NextResponse.json({
    ok: true,
    path: result.content?.path ?? path,
    commitSha: result.commit?.sha,
    commitUrl: result.commit?.html_url,
  });
}
