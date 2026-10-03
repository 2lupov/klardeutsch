import { useUI } from '../i18n';

function embedUrl(url: string): { kind: 'iframe' | 'video'; src: string } {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vm[1]}` };
  return { kind: 'video', src: url };
}

/** Слот для відео-уроку: YouTube / Vimeo / mp4 за посиланням. Без url показує заглушку. */
export function VideoSlot({ url, title }: { url?: string; title: string }) {
  const ui = useUI();
  if (!url) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        {ui('videoSlot')}
      </div>
    );
  }
  const e = embedUrl(url);
  return e.kind === 'iframe'
    ? <iframe src={e.src} title={title} className="aspect-video w-full rounded-xl border border-border" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
    : <video src={e.src} title={title} controls className="aspect-video w-full rounded-xl border border-border bg-black" />;
}

/** Слот для аудіо (mp3 з ElevenLabs). */
export function AudioSlot({ url }: { url?: string }) {
  const ui = useUI();
  if (!url) {
    return <div className="rounded-xl border-2 border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">{ui('audioSlot')}</div>;
  }
  return <audio src={url} controls preload="none" className="w-full" />;
}
