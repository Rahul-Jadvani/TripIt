import React, { useMemo } from 'react';

export function PublishLoader({ message = 'Publishing…' }: { message?: string }) {
  const fun = useMemo(() => {
    const pool = [
      'Once upon a time…',
      'The starry nights…',
      'Brewing a campfire story…',
      'Wandering through code forests…',
      'Gathering sparks for your launch…',
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="publish-forest-wrapper">
        <div className="scene">
          <div className="forest">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`tree tree${i + 1}`}>
                <div className="branch branch-top" />
                <div className="branch branch-middle" />
                <div className="branch branch-bottom" />
              </div>
            ))}
          </div>
          <div className="tent">
            <div className="roof" />
            <div className="roof-border-left">
              <div className="roof-border roof-border1" />
              <div className="roof-border roof-border2" />
              <div className="roof-border roof-border3" />
            </div>
            <div className="entrance">
              <div className="door left-door"><div className="left-door-inner" /></div>
              <div className="door right-door"><div className="right-door-inner" /></div>
            </div>
          </div>
          <div className="floor">
            <div className="ground ground1" />
            <div className="ground ground2" />
          </div>
          <div className="fireplace">
            <div className="support" />
            <div className="support" />
            <div className="bar" />
            <div className="hanger" />
            <div className="smoke" />
            <div className="pan" />
            <div className="fire">
              <div className="line line1">
                <div className="particle particle1" />
                <div className="particle particle2" />
                <div className="particle particle3" />
                <div className="particle particle4" />
              </div>
              <div className="line line2">
                <div className="particle particle1" />
                <div className="particle particle2" />
                <div className="particle particle3" />
                <div className="particle particle4" />
              </div>
              <div className="line line3">
                <div className="particle particle1" />
                <div className="particle particle2" />
                <div className="particle particle3" />
                <div className="particle particle4" />
              </div>
            </div>
          </div>
          <div className="time-wrapper">
            <div className="time">
              <div className="day" />
              <div className="night">
                <div className="moon" />
                <div className="star star1 star-big" />
                <div className="star star2 star-big" />
                <div className="star star3 star-big" />
                <div className="star star4" />
                <div className="star star5" />
                <div className="star star6" />
                <div className="star star7" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold text-foreground">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">{fun}</p>

      <style>{`
        .publish-forest-wrapper { width: 420px; max-width: 90vw; }
        .scene { display:flex; margin: 0 auto; justify-content:center; align-items:flex-end; width: 100%; height: 300px; position: relative; }
        .forest { display:flex; width:75%; height:90%; position:relative; }
        .tree { width:50%; position:absolute; bottom:0; opacity:.4; }
        .branch { width:80%; height:0; margin:0 auto; padding-left:40%; padding-bottom:50%; overflow:hidden; }
        .branch:before { content:""; display:block; width:0; height:0; margin-left:-600px; border-left:600px solid transparent; border-right:600px solid transparent; border-bottom:950px solid #000; }
        .branch-top { transform-origin:50% 100%; animation:treeShake .5s linear infinite; }
        .branch-middle { width:90%; padding-left:45%; padding-bottom:65%; margin:0 auto; margin-top:-25%; }
        .branch-bottom { width:100%; padding-left:50%; padding-bottom:80%; margin:0 auto; margin-top:-40%; }
        .tree1{ width:31%;}
        .tree2{ width:39%; left:9%;}
        .tree3{ width:32%; left:24%;}
        .tree4{ width:37%; left:34%;}
        .tree5{ width:44%; left:44%;}
        .tree6{ width:34%; left:61%;}
        .tree7{ width:24%; left:76%;}
        .tent{ width:60%; height:25%; position:absolute; bottom:-0.5%; right:15%; z-index:1; text-align:right; }
        .roof{ display:inline-block; width:45%; height:100%; margin-right:10%; position:relative; z-index:1; border-top:4px solid #4D4454; border-right:4px solid #4D4454; border-left:4px solid #4D4454; border-top-right-radius:6px; transform: skew(30deg); box-shadow: inset -3px 3px 0px 0px #F7B563; background:#f6d484; }
        .roof:before{ content:""; width:70%; height:70%; position:absolute; top:15%; left:15%; z-index:0; border-radius:10%; background:#E78C20; }
        .roof:after{ content:""; height:75%; width:100%; position:absolute; bottom:0; right:0; z-index:1; background: linear-gradient(to bottom, rgba(231,140,32,.4) 0%, rgba(231,140,32,.4) 64%, rgba(231,140,32,.8) 65%, rgba(231,140,32,.8) 100%); }
        .roof-border-left{ display:flex; justify-content:space-between; flex-direction:column; width:1%; height:125%; position:absolute; top:0; left:35.7%; z-index:1; transform-origin:50% 0%; transform: rotate(35deg); }
        .roof-border{ display:block; width:100%; border-radius:2px; border:2px solid #4D4454; }
        .roof-border1{ height:40%; }
        .roof-border2{ height:10%; }
        .roof-border3{ height:40%; }
        .entrance .door{ width:55px; height:92px; position:absolute; bottom:2%; overflow:hidden; z-index:0; transform-origin:0 105%; }
        .left-door{ transform: rotate(35deg); left:13.5%; bottom:-3%; }
        .left-door-inner{ width:100%;height:100%; transform-origin:0 105%; transform: rotate(-35deg); position:absolute; top:0; overflow:hidden; background:#EDDDC2; }
        .left-door-inner:before{ content:""; width:15%; height:100%; position:absolute; top:0; right:0; background: repeating-linear-gradient(#D4BC8B, #D4BC8B 4%, #E0D2A8 5%, #E0D2A8 10%); }
        .left-door-inner:after{ content:""; width:50%; height:100%; position:absolute; top:15%; left:10%; transform: rotate(25deg); background:#fff; }
        .right-door{ height:89px; right:21%; transform-origin:0 105%; transform: rotate(-30deg) scaleX(-1); position:absolute; bottom:-3%; }
        .right-door-inner{ width:100%; height:100%; transform-origin:0 120%; transform: rotate(-30deg); position:absolute; bottom:0; overflow:hidden; background:#EFE7CF; }
        .right-door-inner:before{ content:""; width:50%; height:100%; position:absolute; top:15%; right:-28%; z-index:1; transform: rotate(15deg); background:#524A5A; }
        .right-door-inner:after{ content:""; width:50%; height:100%; position:absolute; top:15%; right:-20%; transform: rotate(20deg); background:#fff; }
        .floor{ width:80%; position:absolute; right:10%; bottom:0; z-index:1; }
        .ground{ position:absolute; border-radius:2px; border:2px solid #4D4454; }
        .ground1{ width:65%; left:0; }
        .ground2{ width:30%; right:0; }
        .fireplace{ width:24%; height:20%; position:absolute; left:5%; }
        .fireplace:before{ content:""; width:8%; position:absolute; bottom:-4px; left:2%; border-radius:2px; border:2px solid #4D4454; background:#4D4454; }
        .fireplace .support{ height:105%; width:2px; position:absolute; bottom:-5%; left:10%; border:2px solid #4D4454; }
        .fireplace .support:nth-child(1){ left:85%; }
        .bar{ width:100%; height:2px; border-radius:2px; border:2px solid #4D4454; }
        .hanger{ width:2px; height:25%; margin-left:-4px; position:absolute; left:50%; border:2px solid #4D4454; }
        .pan{ width:25%; height:50%; border-radius:50%; border:4px solid #4D4454; position:absolute; top:25%; left:35%; overflow:hidden; animation: heat 5s linear infinite; }
        .pan:before{ content:""; height:53%; width:100%; position:absolute; bottom:0; z-index:-1; border-top:4px solid #4D4454; background:#74667e; animation: hotPan 5s linear infinite; }
        .smoke{ width:20%; height:25%; position:absolute; top:25%; left:37%; background:#fff; filter: blur(5px); animation: smoke 5s linear infinite; }
        .fire{ width:25%; height:120%; position:absolute; bottom:0; left:33%; z-index:1; animation: fire 5s linear infinite; }
        .fire:before{ content:""; width:100%; height:2px; position:absolute; bottom:-4px; z-index:1; border-radius:2px; border:1px solid #efb54a; background:#efb54a; }
        .line{ width:2px; height:100%; position:absolute; bottom:0; animation: fireLines 1s linear infinite; }
        .line2{ left:50%; margin-left:-1px; animation-delay:.3s; }
        .line3{ right:0; animation-delay:.5s; }
        .particle{ height:10%; position:absolute; top:100%; z-index:1; border-radius:2px; border:2px solid #efb54a; animation: fireParticles .5s linear infinite; }
        .particle1{ animation-delay:.1s; }
        .particle2{ animation-delay:.3s; }
        .particle3{ animation-delay:.6s; }
        .particle4{ animation-delay:.9s; }
        .time-wrapper{ width:100%; height:100%; position:absolute; overflow:hidden; }
        .time{ width:100%; height:200%; position:absolute; transform-origin:50% 50%; transform: rotate(270deg); animation: earthRotation 5s linear infinite; }
        .day{ width:20px; height:20px; position:absolute; top:20%; left:40%; border-radius:50%; box-shadow: 0 0 0 25px #5ad6bd, 0 0 0 40px #4acead, 0 0 0 60px rgba(74,206,173,.6), 0 0 0 90px rgba(74,206,173,.3); animation: sunrise 5s ease-in-out infinite; background:#ef9431; }
        .night{ animation: nightTime 5s ease-in-out infinite; }
        .star{ width:4px; height:4px; position:absolute; bottom:10%; border-radius:50%; background:#fff; }
        .star-big{ width:6px; height:6px; }
        .star1{ right:23%; bottom:25%;}
        .star2{ right:35%; bottom:18%;}
        .star3{ right:47%; bottom:25%;}
        .star4{ right:22%; bottom:20%;}
        .star5{ right:18%; bottom:30%;}
        .star6{ right:60%; bottom:20%;}
        .star7{ right:70%; bottom:23%;}
        .moon{ width:25px; height:25px; position:absolute; bottom:22%; right:33%; border-radius:50%; transform: rotate(-60deg); box-shadow: 9px 9px 3px 0 #fff; filter: blur(1px); animation: moonOrbit 5s ease-in-out infinite; }
        .moon:before{ content:""; width:100%; height:100%; position:absolute; bottom:-9px; left:9px; border-radius:50%; box-shadow: 0 0 0 5px rgba(255,255,255,.05), 0 0 0 15px rgba(255,255,255,.05), 0 0 0 25px rgba(255,255,255,.05), 0 0 0 35px rgba(255,255,255,.05); background: rgba(255,255,255,.2); }
        @keyframes earthRotation{ from{ transform: rotate(0);} to{ transform: rotate(360deg);} }
        @keyframes sunrise{ 0%,10%,90%,100%{ box-shadow: 0 0 0 25px #5ad6bd, 0 0 0 40px #4acead, 0 0 0 60px rgba(74,206,173,.6), 0 0 0 90px rgba(74,206,173,.3);} 25%,75%{ box-shadow: none; } }
        @keyframes nightTime{ 0%,90%{ opacity:0;} 50%,75%{ opacity:1;} }
        @keyframes hotPan{ 0%,90%{ background:#74667e;} 50%,75%{ background:#b2241c;} }
        @keyframes heat{ 0%,90%{ box-shadow: inset 0 0 0 0 rgba(255,255,255,.3);} 50%,75%{ box-shadow: inset 0 -2px 0 0 #fff;} }
        @keyframes smoke{ 0%,50%,90%,100%{ opacity:0;} 50%,75%{ opacity:.7;} }
        @keyframes fire{ 0%,90%,100%{ opacity:0;} 50%,75%{ opacity:1;} }
        @keyframes treeShake{ 0%{ transform: rotate(0);} 25%{ transform: rotate(-2deg);} 40%{ transform: rotate(4deg);} 50%{ transform: rotate(-4deg);} 60%{ transform: rotate(6deg);} 75%{ transform: rotate(-6deg);} 100%{ transform: rotate(0);} }
        @keyframes fireParticles{ 0%{ height:30%; opacity:1; top:75%;} 25%{ height:25%; opacity:.8; top:40%;} 50%{ height:15%; opacity:.6; top:20%;} 75%{ height:10%; opacity:.3; top:0;} 100%{ opacity:0;} }
        @keyframes fireLines{ 0%,25%,75%,100%{ bottom:0;} 50%{ bottom:5%;} }
      `}</style>
    </div>
  );
}

export function PublishSuccess({ onGo, projectId }: { onGo: () => void; projectId?: string }) {
  const fun = useMemo(() => {
    const pool = [
      'Campfire’s lit — your project too! 🔥',
      'A story begins with this publish…',
      'Night sky approved. Time to ship. ✨',
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center border-4 border-black shadow-card animate-bounce">
        <span className="text-3xl font-black text-black">✓</span>
      </div>
      <h3 className="mt-4 text-xl font-black text-foreground">Published!</h3>
      <p className="text-sm text-muted-foreground mt-1">{fun}</p>
      <button onClick={onGo} className="btn-primary mt-4 px-6">Go to project{projectId ? ` #${String(projectId).slice(0,6)}…` : ''}</button>
    </div>
  );
}

export default PublishLoader;

