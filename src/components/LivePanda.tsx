import { useEffect, useRef, useState } from "react";
import videoAsset from "@/assets/panda-reading-live.webm.asset.json";
import stackedAsset from "@/assets/panda-reading-stacked.mp4.asset.json";
import posterAsset from "@/assets/panda-reading-live.png.asset.json";

/**
 * Reading panda with transparent background.
 * Chrome/Firefox: VP9 alpha WebM. Safari/iOS: stacked-alpha H.264 MP4
 * (color on top, mask below) composited onto a WebGL canvas.
 */
const isAppleWebKit = () => {
  const ua = navigator.userAgent;
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua);
  return isSafari || /iPad|iPhone|iPod/.test(ua);
};

const VS = `attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.)/2.,(1.-p.y)/2.);gl_Position=vec4(p,0.,1.);}`;
const FS = `precision mediump float;uniform sampler2D t;varying vec2 uv;void main(){vec3 c=texture2D(t,vec2(uv.x,uv.y*.5)).rgb;float a=texture2D(t,vec2(uv.x,.5+uv.y*.5)).r;gl_FragColor=vec4(c*a,a);}`;

interface PandaAssets {
  webm: string;
  stacked: string;
  poster: string;
  ariaLabel: string;
}

const StackedPanda = ({ className, assets }: { className: string; assets: PandaAssets }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true });
    if (!gl) { setFailed(true); return; }
    const video = document.createElement("video");
    video.src = assets.stacked;
    video.muted = true; video.loop = true; video.playsInline = true; video.autoplay = true;
    video.setAttribute("playsinline", ""); video.setAttribute("muted", "");
    video.crossOrigin = "anonymous";

    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let raf = 0;
    const draw = () => {
      if (video.readyState >= 2) {
        const w = video.videoWidth, h = video.videoHeight / 2;
        if (canvas.width !== w) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      raf = requestAnimationFrame(draw);
    };
    video.play().catch(() => {
      // Autoplay blocked (e.g. Low Power Mode): start on first touch.
      const resume = () => video.play().catch(() => {});
      document.addEventListener("touchstart", resume, { once: true });
      document.addEventListener("click", resume, { once: true });
    });
    video.addEventListener("error", () => setFailed(true));
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); video.pause(); video.removeAttribute("src"); video.load(); };
  }, []);

  if (failed) return <img src={assets.poster} alt={assets.ariaLabel} className={className} />;
  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={854}
      role="img"
      aria-label={assets.ariaLabel}
      className={`pointer-events-none select-none ${className}`}
    />
  );
};

const DEFAULT_ASSETS: PandaAssets = {
  webm: videoAsset.url,
  stacked: stackedAsset.url,
  poster: posterAsset.url,
  ariaLabel: "Панда KLAR читає книгу",
};

const LivePanda = ({ className = "", assets }: { className?: string; assets?: PandaAssets }) => {
  const a = assets || DEFAULT_ASSETS;
  const [mode, setMode] = useState<"img" | "webm" | "stacked">("img");
  useEffect(() => {
    if (isAppleWebKit()) setMode("stacked");
    else if (document.createElement("video").canPlayType('video/webm; codecs="vp9"') !== "") setMode("webm");
    else setMode("stacked");
  }, []);

  if (mode === "stacked") return <StackedPanda className={className} assets={a} />;
  if (mode === "img") return <img src={a.poster} alt={a.ariaLabel} className={className} />;
  return (
    <video
      src={a.webm}
      poster={a.poster}
      autoPlay
      loop
      muted
      playsInline
      disablePictureInPicture
      aria-label={a.ariaLabel}
      className={`pointer-events-none select-none ${className}`}
    />
  );
};

export default LivePanda;
