export const runtime = "nodejs";

import { createSign } from "node:crypto";
import { NextResponse } from "next/server";

type CommitRequest = {
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

const base64UrlEncode = (value: string | Buffer) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const createGitHubAppJwt = (appId: string, privateKey: string) => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iat: now - 60,
      exp: now + 9 * 60,
      iss: appId,
    }),
  );

  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKey);
  return `${signingInput}.${base64UrlEncode(signature)}`;
};

const getInstallationToken = async (owner: string, repo: string) => {
  const appId = process.env.GITHUB_APP_ID;
  const rawPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY;

  if (isBlank(appId) || isBlank(rawPrivateKey)) {
    throw new Error("GitHub App credentials are not configured on server.");
  }

  const privateKey = rawPrivateKey!.replace(/\\n/g, "\n");
  const jwt = createGitHubAppJwt(appId!.trim(), privateKey);

  const installationResponse = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/installation`,
    {
      method: "GET",
      headers: {
        ...jsonHeaders,
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
    },
  );

  if (!installationResponse.ok) {
    const text = await installationResponse.text();
    throw new Error(`Failed to resolve app installation: ${text || installationResponse.statusText}`);
  }

  const installation = (await installationResponse.json()) as { id?: number };
  if (!installation.id) {
    throw new Error("GitHub App installation id is missing.");
  }

  const tokenResponse = await fetch(`https://api.github.com/app/installations/${installation.id}/access_tokens`, {
    method: "POST",
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new Error(`Failed to issue installation token: ${text || tokenResponse.statusText}`);
  }

  const tokenResult = (await tokenResponse.json()) as { token?: string };
  if (isBlank(tokenResult.token)) {
    throw new Error("Installation token was not returned.");
  }

  return tokenResult.token!.trim();
};

const isBlank = (value?: string) => !value || !value.trim();

const toBase64 = (value: string) => Buffer.from(value, "utf8").toString("base64");

export async function POST(request: Request) {
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


  let token = "";
  try {
    token = await getInstallationToken(owner, repo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to authenticate with GitHub App.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

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
