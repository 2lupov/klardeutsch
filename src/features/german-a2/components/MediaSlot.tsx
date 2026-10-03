import { useEffect, useState } from 'react';
import { useUI } from '../i18n';
import { playDialogue, stopSpeaking } from '../tts';

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
export function AudioSlot({ url, transcript }: { url?: string; transcript?: { speaker?: string; text: string }[] }) {
  const ui = useUI();
  const [line, setLine] = useState(-1);
  const [loading, setLoading] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (!url && transcript?.length) {
    const playing = line >= 0 || loading;
    const start = async () => {
      if (playing) { stopSpeaking(); setLine(-1); setLoading(false); return; }
      setLoading(true);
      await playDialogue(transcript, i => { setLoading(false); setLine(i); });
      setLoading(false); setLine(-1);
    };
    return (
      <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-4">
        <button type="button" onClick={start}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground transition hover:opacity-90">
          {playing ? '■' : '▶'}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{playing ? (loading ? 'Готую аудіо…' : 'Слухаємо діалог') : 'Прослухати діалог'}</p>
          <p className="text-xs text-muted-foreground">
            {line >= 0 ? `Репліка ${line + 1} з ${transcript.length}` : `Німецькі голоси · ${transcript.length} реплік · можна слухати кілька разів`}
          </p>
          {line >= 0 && <div className="mt-2 h-1 rounded-full bg-border"><div className="h-1 rounded-full bg-primary transition-all" style={{ width: `${((line + 1) / transcript.length) * 100}%` }} /></div>}
        </div>
      </div>
    );
  }
  if (!url) {
    return <div className="rounded-xl border-2 border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">{ui('audioSlot')}</div>;
  }
  return <audio src={url} controls preload="none" className="w-full" />;
}
