// npm widget — Dev.to articles live in the dedicated Blog section.

import { useUi } from '../../i18n/ui';

export function ExternalWidgets() {
  const t = useUi();
  const npm = t.metrics.npm;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="reveal rounded-xl border border-dashed border-line p-5">
        <p className="text-xs font-medium text-faint uppercase tracking-wide">{npm.title}</p>
        <p className="mt-1.5 text-sm text-muted">
          {npm.noPackages} <span className="font-mono text-accent">{npm.mcpServers}</span> {npm.noPackagesTail}
        </p>
      </div>
      <div className="reveal rounded-xl border border-dashed border-line p-5">
        <p className="text-xs font-medium text-faint uppercase tracking-wide">{npm.writing}</p>
        <p className="mt-1.5 text-sm text-muted">
          {npm.writingLead} <a href="#blog" className="text-accent hover:underline">{npm.blog}</a> {npm.writingTail}
        </p>
      </div>
    </div>
  );
}