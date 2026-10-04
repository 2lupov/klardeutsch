import { useEffect, useState } from "react";
import videoAsset from "@/assets/panda-reading-live.webm.asset.json";
import posterAsset from "@/assets/panda-reading-live.png.asset.json";

/** Reading panda with transparent background. Falls back to a still image where VP9 alpha is unsupported (Safari). */
const canPlayAlphaWebm = () => {
  if (typeof document === "undefined") return false;
  const ua = navigator.userAgent;
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  if (isSafari || isIOS) return false;
  return document.createElement("video").canPlayType('video/webm; codecs="vp9"') !== "";
};

const LivePanda = ({ className = "" }: { className?: string }) => {
  const [video, setVideo] = useState(false);
  useEffect(() => setVideo(canPlayAlphaWebm()), []);

  if (!video) {
    return <img src={posterAsset.url} alt="Панда KLAR читає книгу" className={className} />;
  }
  return (
    <video
      src={videoAsset.url}
      poster={posterAsset.url}
      autoPlay
      loop
      muted
      playsInline
      disablePictureInPicture
      aria-label="Панда KLAR читає книгу"
      className={`pointer-events-none select-none ${className}`}
    />
  );
};

export default LivePanda;
