export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div>
      {label ? <div className="mb-2 flex items-center justify-between text-xs font-semibold"><span>{label}</span><span>{value}%</span></div> : null}
      <div className="h-2 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-tomato transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
