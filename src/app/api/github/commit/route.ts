import { authorizeGitHubApiRequest } from "@/lib/githubApiAuth";
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

type CommitRequest = {
  owner?: string;
  repo?: string;
  branch?: string;
  path?: string;
  message?: string;
  content?: string;
};

const isBlank = (value?: string) => !value || !value.trim();

export async function POST(request: Request) {
  const authorization = await authorizeGitHubApiRequest(request);
  if (!authorization.ok) return authorization.response;

  const body = (await request.json()) as CommitRequest;

  if ([body.owner, body.repo, body.branch, body.path, body.message, body.content].some((item) => isBlank(item))) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const owner = body.owner!.trim();
  const repo = body.repo!.trim();
  const branch = body.branch!.trim();
  const path = body.path!.trim();
  const message = body.message!.trim();
  const content = body.content!;

  try {
    assertRepoAllowed(owner, repo, parseAllowList(process.env.GITHUB_ALLOWED_REPOS));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repository is blocked by server policy.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

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
