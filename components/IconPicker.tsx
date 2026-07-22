"use client";

import { useMemo, useState } from "react";
import { SERVICE_PICKER_LIST } from "@/lib/awsIconMap";

export default function IconPicker({
  onPick,
  onClose,
  title = "Pick a service",
}: {
  onPick: (serviceKey: string) => void;
  onClose: () => void;
  title?: string;
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SERVICE_PICKER_LIST;
    return SERVICE_PICKER_LIST.filter(
      ({ key, meta }) =>
        key.includes(q) ||
        meta.name.toLowerCase().includes(q) ||
        meta.category.includes(q),
    );
  }, [query]);

  return (
    <div className="w-72 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-200">{title}</span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search services…"
        className="mb-2 w-full rounded bg-slate-800 px-2 py-1 text-xs text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
      />
      <div className="archgen-scroll grid max-h-64 grid-cols-3 gap-1 overflow-y-auto">
        {results.map(({ key, meta }) => (
          <button
            key={key}
            onClick={() => onPick(key)}
            className="flex flex-col items-center gap-1 rounded p-2 hover:bg-slate-800"
            title={meta.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={meta.icon} alt={meta.name} width={28} height={28} />
            <span className="w-full truncate text-center text-[9px] text-slate-300">
              {meta.name}
            </span>
          </button>
        ))}
        {results.length === 0 && (
          <p className="col-span-3 py-4 text-center text-xs text-slate-500">
            No matches
          </p>
        )}
      </div>
    </div>
  );
}
