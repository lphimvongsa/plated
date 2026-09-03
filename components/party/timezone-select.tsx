"use client";

import { timezoneSelectOptions } from "@/lib/timezone";

export function TimezoneSelect({
  value,
  onChange,
  name,
  labelClassName = "mb-2 block text-xs font-semibold",
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  labelClassName?: string;
}) {
  return (
    <label>
      <span className={labelClassName}>Time zone</span>
      <select className="field" name={name} value={value} onChange={(event) => onChange(event.target.value)}>
        {timezoneSelectOptions(value).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
