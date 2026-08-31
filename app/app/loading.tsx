export default function AppLoading() {
  return (
    <div className="px-4 py-8 md:px-8 xl:px-12">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-3 w-28 rounded bg-ink/10" />
        <div className="mt-4 h-12 w-2/3 max-w-xl rounded bg-ink/10" />
        <div className="mt-4 h-4 w-1/2 max-w-md rounded bg-ink/[0.08]" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="h-44 rounded-[3px] border border-ink/10 bg-[#f8f4ec]" />
          <div className="h-44 rounded-[3px] border border-ink/10 bg-[#f8f4ec]" />
          <div className="h-44 rounded-[3px] border border-ink/10 bg-[#f8f4ec]" />
        </div>
      </div>
    </div>
  );
}
