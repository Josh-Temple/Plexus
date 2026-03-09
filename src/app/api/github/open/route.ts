import { NextRequest, NextResponse } from "next/server";
import { assertRepoAllowed, buildContentsEndpoint, getInstallationToken, githubJsonHeaders, parseAllowList } from "@/lib/githubApp";

type OpenRequest = {
  owner?: string;
  repo?: string;
  branch?: string;
  path?: string;
  url?: string;
};

type RepoTarget = {
  owner: string;
  repo: string;
  branch: string;
  path: string;
};

const isBlank = (value?: string) => !value || !value.trim();

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

const parseApiContentsUrl = (input: URL): RepoTarget | null => {
  if (input.hostname !== "api.github.com") return null;

  const parts = trimSlashes(input.pathname).split("/");
  if (parts.length < 6 || parts[0] !== "repos" || parts[3] !== "contents") return null;

  const owner = decodeURIComponent(parts[1]);
  const repo = decodeURIComponent(parts[2]);
  const path = parts.slice(4).map((segment) => decodeURIComponent(segment)).join("/");
  const branch = input.searchParams.get("ref")?.trim() || "main";
  if ([owner, repo, path, branch].some(isBlank)) return null;

  return { owner, repo, path, branch };
};

const parseCandidateFromUrl = (input: string): { owner: string; repo: string; refAndPath: string[] } | null => {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  const pathnameParts = trimSlashes(url.pathname).split("/").filter(Boolean);

  if (url.hostname === "github.com") {
    if (pathnameParts.length < 5 || pathnameParts[2] !== "blob") return null;
    return {
      owner: decodeURIComponent(pathnameParts[0]),
      repo: decodeURIComponent(pathnameParts[1]),
      refAndPath: pathnameParts.slice(3).map((segment) => decodeURIComponent(segment)),
    };
  }

  if (url.hostname === "raw.githubusercontent.com") {
    if (pathnameParts.length < 4) return null;
    return {
      owner: decodeURIComponent(pathnameParts[0]),
      repo: decodeURIComponent(pathnameParts[1]),
      refAndPath: pathnameParts.slice(2).map((segment) => decodeURIComponent(segment)),
    };
  }

  return null;
};

const fetchFile = async (token: string, target: RepoTarget) => {
  const endpoint = buildContentsEndpoint(target.owner, target.repo, target.path);
  const response = await fetch(`${endpoint}?ref=${encodeURIComponent(target.branch)}`, {
    method: "GET",
    headers: {
      ...githubJsonHeaders,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return { ok: false as const, status: response.status };
  }

  const payload = (await response.json()) as { content?: string; encoding?: string; type?: string; size?: number; sha?: string };
  if (payload.type !== "file" || !payload.content || payload.encoding !== "base64") {
    return { ok: false as const, status: 422 };
  }

  return {
    ok: true as const,
    content: payload.content.replace(/\n/g, ""),
    sha: payload.sha,
    size: payload.size,
  };
};

const resolveTargetFromUrl = async (url: string, token: string): Promise<RepoTarget> => {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error("URL is invalid.");
  }

  const directApiTarget = parseApiContentsUrl(parsed);
  if (directApiTarget) return directApiTarget;

  const candidate = parseCandidateFromUrl(url.trim());
  if (!candidate) {
    throw new Error("Unsupported URL format. Use github.com/.../blob/... or raw.githubusercontent.com/... URLs.");
  }

  const { owner, repo, refAndPath } = candidate;
  if (refAndPath.length < 2) {
    throw new Error("URL must include both ref and file path.");
  }

  for (let split = refAndPath.length - 1; split >= 1; split -= 1) {
    const branch = refAndPath.slice(0, split).join("/");
    const path = refAndPath.slice(split).join("/");
    const fileResult = await fetchFile(token, { owner, repo, branch, path });
    if (fileResult.ok) {
      return { owner, repo, branch, path };
    }
  }

  throw new Error("Could not resolve branch/path from URL. Check the URL and repository permissions.");
};

const decodeContent = (content: string) => Buffer.from(content, "base64").toString("utf8");

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as OpenRequest | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const hasUrl = !isBlank(body.url);
  const hasManualTarget = ![body.owner, body.repo, body.branch, body.path].some(isBlank);

  if (!hasUrl && !hasManualTarget) {
    return NextResponse.json({ error: "Provide either url or owner/repo/branch/path." }, { status: 400 });
  }

  const owner = body.owner?.trim();
  const repo = body.repo?.trim();

  let token = "";
  try {
    const tokenOwner = owner || "placeholder";
    const tokenRepo = repo || "placeholder";
    if (!owner || !repo) {
      if (!hasUrl) {
        return NextResponse.json({ error: "Owner and repo are required when URL is not provided." }, { status: 400 });
      }
      const candidate = parseCandidateFromUrl(body.url!.trim());
      const apiCandidate = (() => {
        try {
          return parseApiContentsUrl(new URL(body.url!.trim()));
        } catch {
          return null;
        }
      })();
      const inferredOwner = apiCandidate?.owner || candidate?.owner;
      const inferredRepo = apiCandidate?.repo || candidate?.repo;
      if (!inferredOwner || !inferredRepo) {
        return NextResponse.json({ error: "Could not infer owner/repo from URL." }, { status: 400 });
      }
      assertRepoAllowed(inferredOwner, inferredRepo, parseAllowList(process.env.GITHUB_ALLOWED_REPOS));
      token = await getInstallationToken(inferredOwner, inferredRepo);
    } else {
      assertRepoAllowed(owner, repo, parseAllowList(process.env.GITHUB_ALLOWED_REPOS));
      token = await getInstallationToken(tokenOwner, tokenRepo);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to authenticate with GitHub App.";
    const status = message.includes("allowed") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  let target: RepoTarget;
  try {
    if (hasUrl) {
      target = await resolveTargetFromUrl(body.url!.trim(), token);
    } else {
      target = {
        owner: body.owner!.trim(),
        repo: body.repo!.trim(),
        branch: body.branch!.trim(),
        path: body.path!.trim(),
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse target.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    assertRepoAllowed(target.owner, target.repo, parseAllowList(process.env.GITHUB_ALLOWED_REPOS));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Repository is blocked by server policy.";
    return NextResponse.json({ error: message }, { status: 403 });
  }

  const fileResult = await fetchFile(token, target);
  if (!fileResult.ok) {
    return NextResponse.json({ error: "Failed to fetch file from GitHub." }, { status: fileResult.status });
  }

  return NextResponse.json({
    ok: true,
    target,
    sha: fileResult.sha,
    size: fileResult.size,
    content: decodeContent(fileResult.content),
  });
}
