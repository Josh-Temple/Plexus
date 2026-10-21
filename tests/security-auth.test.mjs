import assert from "node:assert/strict";
import test from "node:test";
import { authorizeGitHubApiRequest } from "../src/lib/githubApiAuth.ts";
import { assertRepoAllowed, parseAllowList } from "../src/lib/githubApp.ts";

const oldEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  editors: process.env.GITHUB_EDITOR_USER_IDS,
};
function restore() {
  for (const [key, name] of Object.entries({
    url: "NEXT_PUBLIC_SUPABASE_URL",
    anon: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    editors: "GITHUB_EDITOR_USER_IDS",
  })) {
    if (oldEnv[key] === undefined) delete process.env[name];
    else process.env[name] = oldEnv[key];
  }
}

test("GitHub endpoints fail closed without configured editor IDs", async () => {
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fake-publishable-key";
    delete process.env.GITHUB_EDITOR_USER_IDS;
    const value = await authorizeGitHubApiRequest(new Request("https://example.test/api/github/open", {method:"POST"}));
    assert.equal(value.ok, false);
    assert.equal(value.response.status, 503);
  } finally { restore(); }
});

test("GitHub endpoints demand a bearer token when configured", async () => {
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fake-publishable-key";
    process.env.GITHUB_EDITOR_USER_IDS = "11111111-1111-4111-8111-111111111111";
    const value = await authorizeGitHubApiRequest(new Request("https://example.test/api/github/commit", {method:"POST"}));
    assert.equal(value.ok, false);
    assert.equal(value.response.status, 401);
  } finally { restore(); }
});

test("missing repository allowlist denies all access", () => {
  assert.throws(() => assertRepoAllowed("Josh-Temple","Plexus",parseAllowList(undefined)),/not configured/);
  assert.throws(() => assertRepoAllowed("Josh-Temple","Plexus",parseAllowList("")),/not configured/);
  assert.throws(() => assertRepoAllowed("Other","Example",parseAllowList("Josh-Temple/Plexus")),/not allowed/);
  assert.doesNotThrow(() => assertRepoAllowed("Josh-Temple","Plexus",parseAllowList("josh-temple/plexus")));
});
