import React from 'react';
import { Layers, Cpu, Gamepad2, Building2, Atom, Wallet } from 'lucide-react';

type IconName = 'blockchain' | 'ai' | 'gaming' | 'fintech' | 'saas' | 'other';

const iconFor: Record<IconName, React.ReactNode> = {
  blockchain: <Layers className="text-black" size={20} />,
  ai: <Cpu className="text-black" size={20} />,
  gaming: <Gamepad2 className="text-black" size={20} />,
  fintech: <Wallet className="text-black" size={20} />,
  saas: <Building2 className="text-black" size={20} />,
  other: <Atom className="text-black" size={20} />,
};

export function FeedLeaderTagCard({
  label,
  count,
  percent,
  icon = 'other',
}: { label: string; count: number; percent: number; icon?: IconName }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="card-elevated p-4 rounded-[15px] border-4 border-black bg-card shadow-card max-w-[360px] w-full">
      <div className="flex items-center gap-2 mb-2">
        <span className="relative inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary border-2 border-black">
          {iconFor[icon]}
        </span>
        <p className="title-text font-black text-foreground text-base">Leading Tag</p>
        <p className="ml-auto text-xs font-bold text-black inline-flex items-center gap-1 bg-primary px-2 py-0.5 rounded-full border-2 border-black">
          <svg width="16" height="16" viewBox="0 0 1792 1792" fill="currentColor" className="text-black">
            <path d="M1408 1216q0 26-19 45t-45 19h-896q-26 0-45-19t-19-45 19-45l448-448q19-19 45-19t45 19l448 448q19 19 19 45z" />
          </svg>
          {pct}%
        </p>
      </div>
      <div className="data">
        <p className="text-4xl font-black leading-none text-foreground">{count}</p>
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        <div className="range relative w-full h-2 rounded bg-secondary">
          <div className="fill absolute left-0 top-0 h-full rounded bg-primary border-2 border-black" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

