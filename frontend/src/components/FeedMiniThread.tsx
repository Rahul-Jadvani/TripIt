import React from 'react';

type MiniThreadProps = {
  title: string;
  subtitle?: string;
  href?: string;
  badge?: string;
  icon?: React.ReactNode;
};

export function FeedMiniThread({ title, subtitle, href, badge, icon }: MiniThreadProps) {
  const content = (
    <div className="card-elevated p-4 flex items-center gap-3 rounded-xl hover:shadow-card transition-shadow">
      <div className="h-9 w-9 rounded-[10px] bg-primary/20 border-2 border-black flex items-center justify-center text-xs font-black text-black">
        {icon ?? '★'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {badge && <span className="badge badge-primary whitespace-nowrap">{badge}</span>}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }
  return content;
}

