export const runtime = "nodejs";

import { NextResponse } from "next/server";

type CommitRequest = {
  token?: string;
  owner?: string;
  repo?: string;
  branch?: string;
  path?: string;
  message?: string;
  content?: string;
};

const jsonHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

const isBlank = (value?: string) => !value || !value.trim();

const toBase64 = (value: string) => Buffer.from(value, "utf8").toString("base64");

export async function POST(request: Request) {
  const body = (await request.json()) as CommitRequest;

  if ([body.token, body.owner, body.repo, body.branch, body.path, body.message, body.content].some((item) => isBlank(item))) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const token = body.token!.trim();
  const owner = body.owner!.trim();
  const repo = body.repo!.trim();
  const branch = body.branch!.trim();
  const path = body.path!.trim();
  const message = body.message!.trim();
  const content = body.content!;

  const contentsEndpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

  let sha: string | undefined;

  const getResponse = await fetch(`${contentsEndpoint}?ref=${encodeURIComponent(branch)}`, {
    method: "GET",
    headers: {
      ...jsonHeaders,
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
      ...jsonHeaders,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      content: toBase64(content),
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
