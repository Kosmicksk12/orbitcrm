export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-line px-4 py-5 dark:border-line-dark sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink dark:text-ink-dark">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-sm text-ink-muted dark:text-ink-dark-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
