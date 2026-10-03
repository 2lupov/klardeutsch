import { useState } from 'react';
import { speak } from '../tts';
import { cn } from './ui';

/** Small speaker button that pronounces German text with ElevenLabs. */
export function SpeakButton({ text, className, label = 'Прослухати' }: { text: string; className?: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={label}
      title={label}
      onClick={async e => { e.stopPropagation(); setBusy(true); await speak(text); setBusy(false); }}
      onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); speak(text); } }}
      className={cn('inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary/15 text-primary transition hover:bg-primary/25', busy && 'animate-pulse', className)}
    >
      🔊
    </span>
  );
}
