import React, { useEffect, useMemo, useState } from 'react';

type InvestorItem = {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  industries?: string[];
};

export function FeedTopInvestorsGrid({ list, allHref = '/investors' }: { list: InvestorItem[]; allHref?: string }) {
  const cleaned = useMemo(() => (list || []).filter(Boolean).slice(0, 12), [list]);
  const [start, setStart] = useState(0);

  // Rotate visible trio every 6 seconds
  useEffect(() => {
    if (cleaned.length <= 3) return;
    const id = setInterval(() => {
      setStart((s) => (s + 3) % cleaned.length);
    }, 6000);
    return () => clearInterval(id);
  }, [cleaned.length]);

  const trio = useMemo(() => {
    if (cleaned.length <= 3) return cleaned;
    const items: InvestorItem[] = [];
    for (let i = 0; i < 3; i++) items.push(cleaned[(start + i) % cleaned.length]);
    return items;
  }, [cleaned, start]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {trio.map((inv, idx) => (
        <InvestorCard key={(inv.username || 'inv') + idx} investor={inv} allHref={allHref} />
      ))}
    </div>
  );
}

function InvestorCard({ investor, allHref }: { investor: InvestorItem; allHref: string }) {
  const name = investor.display_name || investor.username || 'Investor';
  const caption = investor.industries && investor.industries.length
    ? `Focused on ${investor.industries.slice(0, 3).join(', ')}`
    : 'Open to new opportunities';
  const profileHref = `/u/${investor.username || ''}`;

  return (
    <div className="relative group">
      <div className="rounded-[20px] bg-[#161616] text-white p-5 border-[3px] border-black shadow-[14px_14px_0_0_#000] transition-transform duration-200 group-hover:-translate-y-0.5 min-h-[230px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="h-10 w-10 rounded-full border-[3px] border-black shadow-[4px_4px_0_0_#000]"
            style={{
              background: investor.avatar_url
                ? `url(${investor.avatar_url}) center/cover no-repeat`
                : 'linear-gradient(135deg, #ffb56b, #ff926b)'
            }}
          />
          <a href={profileHref} className="font-extrabold tracking-tight hover:opacity-90">
            {name}
          </a>
        </div>

        {/* Body box */}
        <div className="rounded-[16px] border-[3px] border-black p-3 bg-[#1d1d1d] shadow-[inset_0_0_0_2px_rgba(0,0,0,0.3)]">
          <div className="rounded-[10px] h-16 border-[3px] border-black bg-gradient-to-r from-orange-300 to-blue-200" />
          <p className="mt-3 font-extrabold text-white/95 text-sm leading-snug">{caption}</p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-4">
          <a
            href={profileHref}
            className="inline-flex items-center justify-center h-10 w-10 rounded-[14px] border-[3px] border-black bg-orange-300 text-black shadow-[0_6px_0_0_#000] hover:shadow-[0_8px_0_0_#000] hover:-translate-y-0.5 transition"
            aria-label="View profile"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 11.1a7.8 7.8 0 1 1-13.6-5.5 5 5 0 0 1 7.1 0l.7.7.7-.7a5 5 0 0 1 7.1 7.1l-7.8 7.8-7.1-7.1" />
            </svg>
          </a>
          <a
            href="/intros"
            className="inline-flex items-center justify-center h-10 w-10 rounded-[14px] border-[3px] border-black bg-[#2a2a2a] text-white shadow-[0_6px_0_0_#000] hover:bg-[#303030] hover:shadow-[0_8px_0_0_#000] hover:-translate-y-0.5 transition"
            aria-label="Start intro"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.7 8.7 0 0 1-3.8-.9L3 21l1.9-5.7a8.7 8.7 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z" />
            </svg>
          </a>
          <a
            href={allHref}
            className="inline-flex items-center justify-center h-10 w-10 rounded-[14px] border-[3px] border-black bg-[#2a2a2a] text-white shadow-[0_6px_0_0_#000] hover:bg-[#303030] hover:shadow-[0_8px_0_0_#000] hover:-translate-y-0.5 transition"
            aria-label="View all investors"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

export default FeedTopInvestorsGrid;
