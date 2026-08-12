/**
 * Meta Pixel loader. ID comes from VITE_META_PIXEL_ID —
 * when it is not set, nothing is loaded.
 */
let loaded = false;

export function initMetaPixel() {
  const id = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
  if (!id || loaded) return;
  loaded = true;

  const w = window as unknown as Record<string, any>;
  if (!w.fbq) {
    const fbq: any = function (...args: unknown[]) {
      fbq.callMethod ? fbq.callMethod.apply(fbq, args) : fbq.queue.push(args);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    w.fbq = fbq;
    w._fbq = fbq;

    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  }

  w.fbq("init", id);
  w.fbq("track", "PageView");
}
