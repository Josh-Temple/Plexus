import { ChangeEvent } from "react";

export type GitHubRepoConfig = {
  owner: string;
  repo: string;
  branch: string;
  path: string;
};

type Props = {
  config: GitHubRepoConfig;
  token: string;
  commitMessage: string;
  isCommitting: boolean;
  onConfigChange: (key: keyof GitHubRepoConfig, value: string) => void;
  onTokenChange: (value: string) => void;
  onCommitMessageChange: (value: string) => void;
  onCommit: () => void;
};

const onInput = (handler: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => handler(event.target.value);

export function GitHubCommitPanel({
  config,
  token,
  commitMessage,
  isCommitting,
  onConfigChange,
  onTokenChange,
  onCommitMessageChange,
  onCommit,
}: Props) {
  return (
    <section className="mb-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <h2 className="mb-2 text-sm font-semibold text-slate-100">Commit to GitHub</h2>
      <div className="grid gap-2 md:grid-cols-2">
        <input
          value={config.owner}
          onChange={onInput((value) => onConfigChange("owner", value.trim()))}
          className="input-base"
          placeholder="Owner (e.g. octocat)"
        />
        <input
          value={config.repo}
          onChange={onInput((value) => onConfigChange("repo", value.trim()))}
          className="input-base"
          placeholder="Repository (e.g. notes)"
        />
        <input
          value={config.branch}
          onChange={onInput((value) => onConfigChange("branch", value.trim()))}
          className="input-base"
          placeholder="Branch"
        />
        <input
          value={config.path}
          onChange={onInput((value) => onConfigChange("path", value))}
          className="input-base"
          placeholder="File path (e.g. notes/<id>.md)"
        />
      </div>
      <input
        value={token}
        onChange={onInput((value) => onTokenChange(value.trim()))}
        className="input-base mt-2"
        placeholder="GitHub token (repo contents:write)"
        type="password"
      />
      <input
        value={commitMessage}
        onChange={onInput(onCommitMessageChange)}
        className="input-base mt-2"
        placeholder="Commit message"
      />
      <p className="mt-2 text-xs text-muted">Token is used only for this session and is not saved to localStorage.</p>
      <div className="mt-3 flex justify-end">
        <button className="btn-primary" onClick={onCommit} disabled={isCommitting}>
          {isCommitting ? "Committing..." : "Commit current note"}
        </button>
      </div>
    </section>
  );
}
