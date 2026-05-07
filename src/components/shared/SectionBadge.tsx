export function SectionBadge({ name }: { name?: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
      {name ?? '—'}
    </span>
  );
}
