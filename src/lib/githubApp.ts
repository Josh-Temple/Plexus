import { createSign } from "node:crypto";

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

const isBlank = (value?: string) => !value || !value.trim();

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

export const toBase64 = (value: string) => Buffer.from(value, "utf8").toString("base64");

export const parseAllowList = (raw?: string) =>
  (raw ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export const assertRepoAllowed = (owner: string, repo: string, allowList: string[]) => {
  if (!allowList.length) return;
  const key = `${owner}/${repo}`.toLowerCase();
  if (!allowList.includes(key)) {
    throw new Error("This repository is not allowed by server policy.");
  }
};

export const getInstallationToken = async (owner: string, repo: string) => {
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

export const buildContentsEndpoint = (owner: string, repo: string, path: string) =>
  `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;

export const githubJsonHeaders = jsonHeaders;
