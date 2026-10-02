import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}

let apiPromise: Promise<any> | null = null;
function loadApi(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

type Msg = { playing: boolean; time: number; rate: number };

/** YouTube-плеєр, де викладач керує: play/pause/перемотка/швидкість повторюються в учня. */
export default function SyncedYouTube({ classId, videoId, role }: { classId: string; videoId: string; role: "teacher" | "student" }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let player: any = null;
    let alive = true;
    let tick: ReturnType<typeof setInterval> | null = null;
    let pending: Msg | null = null;
    let ready = false;
    const ch = supabase.channel(`live-video-player:${classId}`, { config: { broadcast: { self: false } } });

    const applyMsg = (m: Msg) => {
      if (!ready) { pending = m; return; }
      try {
        if (player.getPlaybackRate?.() !== m.rate) player.setPlaybackRate?.(m.rate);
        if (Math.abs((player.getCurrentTime?.() ?? 0) - m.time) > 1.2) player.seekTo(m.time, true);
        const st = player.getPlayerState?.();
        if (m.playing && st !== 1) player.playVideo();
        if (!m.playing && st !== 2) player.pauseVideo();
      } catch { /* ignore */ }
    };

    const send = () => {
      if (!ready || role !== "teacher") return;
      const st = player.getPlayerState?.();
      const msg: Msg = { playing: st === 1 || st === 3, time: player.getCurrentTime?.() ?? 0, rate: player.getPlaybackRate?.() ?? 1 };
      ch.send({ type: "broadcast", event: "player", payload: msg });
    };

    if (role === "student") {
      ch.on("broadcast", { event: "player" }, ({ payload }: any) => payload && applyMsg(payload as Msg));
      ch.on("broadcast", { event: "ask" }, () => {});
    } else {
      ch.on("broadcast", { event: "ask" }, () => send());
    }
    ch.subscribe((status: string) => {
      if (status === "SUBSCRIBED" && role === "student") ch.send({ type: "broadcast", event: "ask", payload: {} });
    });

    loadApi().then((YT) => {
      if (!alive || !host.current) return;
      const el = document.createElement("div");
      host.current.innerHTML = "";
      host.current.appendChild(el);
      player = new YT.Player(el, {
        videoId,
        width: "100%",
        height: "100%",
        host: "https://www.youtube-nocookie.com",
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            ready = true; (window as any).__yt = player;
            if (pending) { applyMsg(pending); pending = null; }
            if (role === "student") ch.send({ type: "broadcast", event: "ask", payload: {} });
          },
          onStateChange: () => send(),
          onPlaybackRateChange: () => send(),
        },
      });
      // Викладач регулярно надсилає позицію — так ловимо перемотку на паузі й вирівнюємо розбіжність.
      if (role === "teacher") {
        let last = -1;
        tick = setInterval(() => {
          if (!ready) return;
          const t = player.getCurrentTime?.() ?? 0;
          const st = player.getPlayerState?.();
          if (st === 1 || Math.abs(t - last) > 0.5) send();
          last = t;
        }, 1000);
      }
    });

    return () => {
      alive = false;
      if (tick) clearInterval(tick);
      try { player?.destroy?.(); } catch { /* ignore */ }
      supabase.removeChannel(ch);
    };
  }, [classId, videoId, role]);

  return <div ref={host} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />;
}
