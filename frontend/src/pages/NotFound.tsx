import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="notfound-tv relative transform scale-110 md:scale-125 lg:scale-150 origin-center">
        {/* TV card */}
        <div className="main_wrapper">
          <div className="main">
            <div className="antenna">
              <div className="antenna_shadow" />
              <div className="a1" />
              <div className="a1d" />
              <div className="a2" />
              <div className="a2d" />
              <div className="a_base" />
            </div>

            <div className="tv">
              <div className="cruve">
                <svg className="curve_svg" viewBox="0 0 189.929 189.929">
                  <path d="M70.343,70.343c-30.554,30.553-44.806,72.7-39.102,115.635l-29.738,3.951C-5.442,137.659,11.917,86.34,49.129,49.13 C86.34,11.918,137.664-5.445,189.928,1.502l-3.95,29.738C143.041,25.54,100.895,39.789,70.343,70.343z" />
                </svg>
              </div>
              <div className="display_div">
                <div className="screen_out">
                  <div className="screen_out1">
                    <div className="screen"><span className="notfound_text">NOT FOUND</span></div>
                    <div className="screenM"><span className="notfound_text">NOT FOUND</span></div>
                  </div>
                </div>
              </div>
              <div className="lines">
                <div className="line1" />
                <div className="line2" />
                <div className="line3" />
              </div>
              <div className="buttons_div">
                <div className="b1"><div /></div>
                <div className="b2" />
                <div className="speakers">
                  <div className="g1">
                    <div className="g11" />
                    <div className="g12" />
                    <div className="g13" />
                  </div>
                  <div className="g" />
                  <div className="g" />
                </div>
              </div>
            </div>

            <div className="bottom">
              <div className="base1" />
              <div className="base2" />
              <div className="base3" />
            </div>
          </div>
          <div className="text_404">
            <div className="text_4041">4</div>
            <div className="text_4042">0</div>
            <div className="text_4043">4</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 text-center">
          <Link to="/" className="btn-primary inline-flex items-center gap-2 px-6 py-3">Return Home</Link>
        </div>
      </div>

      {/* Scoped CSS for 404 TV (ported from styled-components) */}
      <style>
        {`
        .notfound-tv .main_wrapper{display:flex;align-items:center;justify-content:center;width:30em;height:30em}
        .notfound-tv .main{display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:5em}
        .notfound-tv .antenna{width:5em;height:5em;border-radius:50%;border:2px solid #000;background-color:#f27405;margin-bottom:-6em;margin-left:0;z-index:-1;position:relative}
        .notfound-tv .antenna_shadow{position:absolute;background-color:transparent;width:50px;height:56px;margin-left:1.68em;border-radius:45%;transform:rotate(140deg);border:4px solid transparent;box-shadow:inset 0 16px #a85103,inset 0 16px 1px 1px #a85103}
        .notfound-tv .antenna:after{content:"";position:absolute;margin-top:-9.4em;margin-left:.4em;transform:rotate(-25deg);width:1em;height:.5em;border-radius:50%;background-color:#f69e50}
        .notfound-tv .antenna:before{content:"";position:absolute;margin-top:.2em;margin-left:1.25em;transform:rotate(-20deg);width:1.5em;height:.8em;border-radius:50%;background-color:#f69e50}
        .notfound-tv .a1{position:relative;top:-102%;left:-130%;width:12em;height:5.5em;border-radius:50px;background-image:linear-gradient(#171717,#171717,#353535,#353535,#171717);transform:rotate(-29deg);clip-path:polygon(50% 0%,49% 100%,52% 100%)}
        .notfound-tv .a1d{position:relative;top:-211%;left:-35%;transform:rotate(45deg);width:.5em;height:.5em;border-radius:50%;border:2px solid #000;background-color:#979797;z-index:99}
        .notfound-tv .a2{position:relative;top:-210%;left:-10%;width:12em;height:4em;border-radius:50px;background-color:#171717;background-image:linear-gradient(#171717,#171717,#353535,#353535,#171717);margin-right:5em;clip-path:polygon(47% 0,47% 0,34% 34%,54% 25%,32% 100%,29% 96%,49% 32%,30% 38%);transform:rotate(-8deg)}
        .notfound-tv .a2d{position:relative;top:-294%;left:94%;width:.5em;height:.5em;border-radius:50%;border:2px solid #000;background-color:#979797;z-index:99}
        .notfound-tv .notfound_text{background-color:#000;padding:0 .3em;font-size:.75em;color:#fff;border-radius:5px;z-index:10}
        .notfound-tv .tv{width:17em;height:9em;margin-top:3em;border-radius:15px;background-color:#d36604;display:flex;justify-content:center;border:2px solid #1d0e01;box-shadow:inset .2em .2em #e69635;position:relative}
        .notfound-tv .tv:after{content:"";position:absolute;width:17em;height:9em;border-radius:15px;background:repeating-radial-gradient(#d36604 0 .0001%,#00000070 0 .0002%) 50% 0/2500px 2500px,repeating-conic-gradient(#d36604 0 .0001%,#00000070 0 .0002%) 60% 60%/2500px 2500px;background-blend-mode:difference;opacity:.09}
        .notfound-tv .curve_svg{position:absolute;margin-top:.25em;margin-left:-.25em;height:12px;width:12px}
        .notfound-tv .display_div{display:flex;align-items:center;align-self:center;justify-content:center;border-radius:15px;box-shadow:3.5px 3.5px 0 #e69635}
        .notfound-tv .screen_out{border-radius:10px}
        .notfound-tv .screen_out1{width:11em;height:7.75em;display:flex;align-items:center;justify-content:center;border-radius:10px}
        .notfound-tv .screen{width:13em;height:7.85em;border:2px solid #1d0e01;background:repeating-radial-gradient(#000 0 .0001%,#fff 0 .0002%) 50% 0/2500px 2500px,repeating-conic-gradient(#000 0 .0001%,#fff 0 .0002%) 60% 60%/2500px 2500px;background-blend-mode:difference;animation:tvb .2s infinite alternate;border-radius:10px;z-index:99;display:flex;align-items:center;justify-content:center;font-weight:700;color:#252525;letter-spacing:.15em;text-align:center}
        .notfound-tv .screenM{width:13em;height:7.85em;position:relative;background:linear-gradient(to right,#002fc6 0%,#002bb2 14.2857142857%,#3a3a3a 14.2857142857%,#303030 28.5714285714%,#ff0afe 28.5714285714%,#f500f4 42.8571428571%,#6c6c6c 42.8571428571%,#626262 57.1428571429%,#0affd9 57.1428571429%,#00f5ce 71.4285714286%,#3a3a3a 71.4285714286%,#303030 85.7142857143%,#fff 85.7142857143%,#fafafa 100%);border-radius:10px;border:2px solid #000;z-index:99;display:flex;align-items:center;justify-content:center;font-weight:700;color:#252525;letter-spacing:.15em;text-align:center;overflow:hidden}
        .notfound-tv .screenM:before,.notfound-tv .screenM:after{content:"";position:absolute;left:0;z-index:1;width:100%}
        .notfound-tv .screenM:before{top:0;height:68.4782608696%;background:linear-gradient(to right,#fff 0%,#fafafa 14.2857142857%,#ffe60a 14.2857142857%,#f5dc00 28.5714285714%,#0affd9 28.5714285714%,#00f5ce 42.8571428571%,#10ea00 42.8571428571%,#0ed600 57.1428571429%,#ff0afe 57.1428571429%,#f500f4 71.4285714286%,#ed0014 71.4285714286%,#d90012 85.7142857143%,#002fc6 85.7142857143%,#002bb2 100%)}
        .notfound-tv .screenM:after{bottom:0;height:21.7391304348%;background:linear-gradient(to right,#006c6b 0%,#005857 16.6666666667%,#fff 16.6666666667%,#fafafa 33.3333333333%,#001b75 33.3333333333%,#001761 50%,#6c6c6c 50%,#626262 66.6666666667%,#929292 66.6666666667%,#888 83.3333333333%,#3a3a3a 83.3333333333%,#303030 100%)}
        @keyframes tvb{100%{background-position:50% 0,60% 50%}}
        .notfound-tv .lines{display:flex;column-gap:.1em;align-self:flex-end}
        .notfound-tv .line1,.notfound-tv .line3{width:2px;height:.5em;background-color:#000;border-radius:25px 25px 0 0;margin-top:.5em}
        .notfound-tv .line2{flex-grow:1;width:2px;height:1em;background-color:#000;border-radius:25px 25px 0 0}
        .notfound-tv .buttons_div{width:4.25em;align-self:center;height:8em;background-color:#e69635;border:2px solid #1d0e01;padding:.6em;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-direction:column;row-gap:.75em;box-shadow:3px 3px 0 #e69635}
        .notfound-tv .b1,.notfound-tv .b2{width:1.65em;height:1.65em;border-radius:50%;background-color:#7f5934;border:2px solid #000;box-shadow:inset 2px 2px 1px #b49577,-2px 0 #513721,-2px 0 0 1px #000;position:relative}
        .notfound-tv .b1:before{content:"";position:absolute;margin-top:1em;margin-left:.5em;transform:rotate(47deg);border-radius:5px;width:.1em;height:.4em;background-color:#000}
        .notfound-tv .b1:after{content:"";position:absolute;margin-top:.9em;margin-left:.8em;transform:rotate(47deg);border-radius:5px;width:.1em;height:.55em;background-color:#000}
        .notfound-tv .b1 div{position:absolute;margin-top:-.1em;margin-left:.65em;transform:rotate(45deg);width:.15em;height:1.5em;background-color:#000}
        .notfound-tv .b2:before{content:"";position:absolute;margin-top:1.05em;margin-left:.8em;transform:rotate(-45deg);border-radius:5px;width:.15em;height:.4em;background-color:#000}
        .notfound-tv .b2:after{content:"";position:absolute;margin-top:-.1em;margin-left:.65em;transform:rotate(-45deg);width:.15em;height:1.5em;background-color:#000}
        .notfound-tv .speakers{display:flex;flex-direction:column;row-gap:.5em}
        .notfound-tv .speakers .g1{display:flex;column-gap:.25em}
        .notfound-tv .speakers .g1 .g11,.notfound-tv .g12,.notfound-tv .g13{width:.65em;height:.65em;border-radius:50%;background-color:#7f5934;border:2px solid #000;box-shadow:inset 1.25px 1.25px 1px #b49577}
        .notfound-tv .speakers .g{width:auto;height:2px;background-color:#171717}
        .notfound-tv .bottom{width:100%;height:auto;display:flex;align-items:center;justify-content:center;column-gap:8.7em}
        .notfound-tv .base1,.notfound-tv .base2{height:1em;width:2em;border:2px solid #171717;background-color:#4d4d4d;margin-top:-.15em;z-index:-1}
        .notfound-tv .base3{position:absolute;height:.15em;width:17.5em;background-color:#171717;margin-top:.8em}
        .notfound-tv .text_404{position:absolute;display:flex;flex-direction:row;column-gap:6em;z-index:-5;margin-bottom:2em;align-items:center;justify-content:center;opacity:.5}
        .notfound-tv .text_4041,.notfound-tv .text_4042,.notfound-tv .text_4043{transform:scaleY(24.5) scaleX(9)}
        @media(max-width:495px){.notfound-tv .text_404{column-gap:6em}}
        @media(max-width:395px){.notfound-tv .text_404{column-gap:4em}.notfound-tv .text_4041,.notfound-tv .text_4042,.notfound-tv .text_4043{transform:scaleY(25) scaleX(8)}}
        @media (max-width:275px),(max-height:520px){.notfound-tv .main{position:relative}}
        @media(min-width:1025px){.notfound-tv .screen{display:flex}.notfound-tv .screenM{display:none}}
        @media(max-width:1024px){.notfound-tv .screenM{display:flex}.notfound-tv .screen{display:none}}
        `}
      </style>
    </div>
  );
}
