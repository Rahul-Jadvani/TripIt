import React from 'react';
import { Layers, Users } from 'lucide-react';

interface FeedStatCardsProps {
  projectsCount: number;
  buildersCount: number;
}

export default function FeedStatCards({ projectsCount, buildersCount }: FeedStatCardsProps) {
  return (
    <div className="grid grid-cols-2 w-full max-w-3xl gap-3 max-[500px]:grid-cols-1 px-3 mx-auto">
      {/* Projects card */}
      <a
        href="/gallery/all"
        className="group relative block w-full rounded-[15px] p-5 border-4 border-black bg-primary text-black shadow-card transition duration-300 hover:translate-y-[3px] hover:shadow-[0_-8px_0px_0px_hsl(var(--primary))]"
      >
        <p className="text-2xl font-black leading-none">{projectsCount}</p>
        <p className="text-sm font-medium">projects</p>
        <Layers className="absolute right-[10%] top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition duration-300" size={36} />
      </a>

      {/* Builders card */}
      <a
        href="/leaderboard?tab=builders"
        className="group relative block w-full rounded-[15px] p-5 border-4 border-black bg-secondary text-secondary-foreground shadow-card transition duration-300 hover:translate-y-[3px] hover:shadow-[0_-8px_0px_0px_hsl(var(--primary))]"
      >
        <p className="text-2xl font-black leading-none">{buildersCount}</p>
        <p className="text-sm font-medium">top builders</p>
        <Users className="absolute right-[10%] top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-40 group-hover:scale-110 transition duration-300" size={36} />
      </a>
    </div>
  );
}
