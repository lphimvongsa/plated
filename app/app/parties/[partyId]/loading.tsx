export default function PartySectionLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-10 w-64 rounded bg-ink/10" />
      <div className="h-4 w-80 max-w-full rounded bg-ink/[0.08]" />
      <div className="h-[420px] rounded-[3px] border border-ink/10 bg-paper-2" />
    </div>
  );
}
