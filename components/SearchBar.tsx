"use client";

import { SearchIcon } from "./Icons";

// Search your house by name. Matching is done in the page (shared name list).
export default function SearchBar({
  query,
  onQuery,
  match,
}: {
  query: string;
  onQuery: (q: string) => void;
  match: string | null;
}) {
  return (
    <div className="anim-rise-x absolute left-1/2 top-5 -translate-x-1/2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search a house"
          className="w-72 rounded-full border border-white/10 bg-white/[0.06] py-2 pl-10 pr-4 text-sm text-white placeholder-white/35 outline-none backdrop-blur-xl transition focus:border-white/25 focus:bg-white/[0.09]"
        />
      </div>
      {query && (
        <div className="mt-1.5 text-center text-[11px] text-white/55">
          {match ? `Found ${match}` : "No match"}
        </div>
      )}
    </div>
  );
}
