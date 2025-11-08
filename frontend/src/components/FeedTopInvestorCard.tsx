import React from 'react';

type InvestorLike = {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  industries?: string[];
};

export function FeedTopInvestorCard({ investor, allHref }: { investor: InvestorLike, allHref?: string }) {
  const name = investor.display_name || investor.username || 'Investor';
  const caption = investor.industries && investor.industries.length
    ? `Focused on ${investor.industries.slice(0, 3).join(', ')}`
    : 'Open to new opportunities';

  return (
    <div className="flex items-center justify-center">
      <div className="feed-pixar-card">
        <div className="card-container">
          <div className="pixar-card" role="article" aria-labelledby="card-username">
            <div className="card-header">
              <div className="card-avatar" />
              <p className="card-username" id="card-username">{name}</p>
            </div>
            <div className="card-image-area">
              <div className="card-image-placeholder" />
              <p className="card-caption">{caption}</p>
            </div>
            <div className="card-actions">
              <a className="action-button like-button" aria-label="View Profile" href={`/u/${investor.username || ''}`}>
                <svg className="action-button-icon" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </a>
              <a className="action-button comment-button" aria-label="Start Intro" href="/intros">
                <svg className="action-button-icon" viewBox="0 0 24 24">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </a>
              {allHref ? (
                <a className="action-button" aria-label="View All Investors" href={allHref}>
                  <svg className="action-button-icon" viewBox="0 0 24 24">
                    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
                  </svg>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Scoped styles (ported from styled-components; themed with CSS vars) */}
      <style>
        {`
        .feed-pixar-card .card-container{display:flex;justify-content:center;align-items:center;width:100%}
        .feed-pixar-card .pixar-card{--ui-blue:hsl(var(--primary));--ui-green:hsl(var(--accent));--ui-dark:#000;--button-press-depth:.15em;position:relative;width:19em;max-width:320px;max-height:420px;background-color:hsl(var(--card));border-radius:1.5em;padding:1.2em;border:.2em solid var(--ui-dark);box-shadow:.6em .6em 0 var(--ui-dark);display:flex;flex-direction:column;transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s cubic-bezier(.34,1.56,.64,1)}
        .feed-pixar-card .pixar-card:hover{transform:translateY(-.5em) rotate(-2deg);box-shadow:.8em .8em 0 var(--ui-dark)}
        .feed-pixar-card .card-header{display:flex;align-items:center;margin-bottom:1em}
        .feed-pixar-card .card-avatar{width:3.5em;height:3.5em;border-radius:50%;background:linear-gradient(45deg,hsl(var(--primary)),#f48a58);border:.2em solid var(--ui-dark);box-shadow:.2em .2em 0 var(--ui-dark);flex-shrink:0;transition:transform .3s ease}
        .feed-pixar-card .pixar-card:hover .card-avatar{transform:scale(1.05) rotate(5deg)}
        .feed-pixar-card .card-username{margin:0 0 0 .8em;font-size:1.1em;font-weight:800;color:hsl(var(--foreground))}
        .feed-pixar-card .card-image-area{background-color:hsl(var(--accent));border-radius:1em;padding:.8em;border:.2em solid var(--ui-dark);box-shadow:inset .2em .2em 0 #00000033}
        .feed-pixar-card .card-image-placeholder{width:100%;height:5em;border-radius:.6em;background:linear-gradient(135deg,hsl(var(--primary)),#8cb9e8);border:.2em solid var(--ui-dark);transition:transform .4s cubic-bezier(.175,.885,.32,1.275)}
        .feed-pixar-card .pixar-card:hover .card-image-placeholder{transform:scale(1.03)}
        .feed-pixar-card .card-caption{margin:1em 0 0 0;font-size:.9em;line-height:1.4;color:hsl(var(--foreground));font-weight:700}
        .feed-pixar-card .card-actions{display:flex;justify-content:space-around;margin-top:1.2em}
        .feed-pixar-card .action-button{background:hsl(var(--secondary));border:.2em solid var(--ui-dark);border-radius:1em;padding:.5em;cursor:pointer;box-shadow:0 var(--button-press-depth) 0 #00000055,0 .4em 0 var(--ui-dark);transition:transform .1s ease,box-shadow .1s ease}
        .feed-pixar-card .action-button:active{transform:translateY(var(--button-press-depth));box-shadow:0 0 0 #00000055,0 var(--button-press-depth) 0 var(--ui-dark)}
        .feed-pixar-card .like-button{background:hsl(var(--primary));}
        .feed-pixar-card .action-button-icon{width:1.6em;height:1.6em;stroke:var(--ui-dark);stroke-width:2.5;fill:none;stroke-linecap:round;stroke-linejoin:round;display:block}
        `}
      </style>
    </div>
  );
}
