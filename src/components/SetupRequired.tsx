import { missingSupabaseEnvKeys } from "@/lib/supabaseClient";

type SetupRequiredProps = {
  title: string;
  description: string;
};

export function SetupRequired({ title, description }: SetupRequiredProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="surface w-full max-w-xl p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Setup required</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted">{description}</p>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-wide text-muted">Missing .env.local keys</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {missingSupabaseEnvKeys.map((key) => (
              <li key={key}>
                <code>{key}</code>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-3 text-xs text-muted">Add these keys to <code>.env.local</code>, restart the dev server, then reload this page.</p>
      </div>
    </div>
  );
}
