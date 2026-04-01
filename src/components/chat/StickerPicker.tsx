import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

import pandaHello from "@/assets/stickers/panda-hello.png";
import pandaLaugh from "@/assets/stickers/panda-laugh.png";
import pandaCry from "@/assets/stickers/panda-cry.png";
import pandaThumbsup from "@/assets/stickers/panda-thumbsup.png";
import pandaLove from "@/assets/stickers/panda-love.png";
import pandaAngry from "@/assets/stickers/panda-angry.png";
import pandaSleep from "@/assets/stickers/panda-sleep.png";
import pandaDance from "@/assets/stickers/panda-dance.png";
import pandaEat from "@/assets/stickers/panda-eat.png";
import pandaThink from "@/assets/stickers/panda-think.png";
import pandaShock from "@/assets/stickers/panda-shock.png";
import pandaParty from "@/assets/stickers/panda-party.png";
import pandaStudy from "@/assets/stickers/panda-study.png";
import pandaStrong from "@/assets/stickers/panda-strong.png";
import pandaHug from "@/assets/stickers/panda-hug.png";
import pandaWink from "@/assets/stickers/panda-wink.png";
import pandaCoffee from "@/assets/stickers/panda-coffee.png";
import pandaWow from "@/assets/stickers/panda-wow.png";
import pandaClap from "@/assets/stickers/panda-clap.png";
import pandaFacepalm from "@/assets/stickers/panda-facepalm.png";
import pandaBye from "@/assets/stickers/panda-bye.png";
import pandaZen from "@/assets/stickers/panda-zen.png";
import pandaRun from "@/assets/stickers/panda-run.png";
import pandaFire from "@/assets/stickers/panda-fire.png";
import pandaKlar from "@/assets/stickers/panda-klar.png";

export const STICKER_MAP: Record<string, string> = {
  "panda-klar": pandaKlar,
  "panda-hello": pandaHello,
  "panda-love": pandaLove,
  "panda-laugh": pandaLaugh,
  "panda-thumbsup": pandaThumbsup,
  "panda-cry": pandaCry,
  "panda-angry": pandaAngry,
  "panda-shock": pandaShock,
  "panda-wow": pandaWow,
  "panda-think": pandaThink,
  "panda-wink": pandaWink,
  "panda-party": pandaParty,
  "panda-dance": pandaDance,
  "panda-fire": pandaFire,
  "panda-strong": pandaStrong,
  "panda-clap": pandaClap,
  "panda-hug": pandaHug,
  "panda-study": pandaStudy,
  "panda-coffee": pandaCoffee,
  "panda-eat": pandaEat,
  "panda-sleep": pandaSleep,
  "panda-zen": pandaZen,
  "panda-run": pandaRun,
  "panda-bye": pandaBye,
  "panda-facepalm": pandaFacepalm,
};

const STICKER_KEYS = Object.keys(STICKER_MAP);

export const STICKER_PREFIX = "[sticker:";

export const isStickerMessage = (content: string): boolean =>
  content.startsWith(STICKER_PREFIX) && content.endsWith("]");

export const getStickerSrc = (content: string): string | null => {
  if (!isStickerMessage(content)) return null;
  const key = content.slice(STICKER_PREFIX.length, -1);
  return STICKER_MAP[key] || null;
};

interface StickerPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (stickerId: string) => void;
}

const StickerPicker = ({ open, onClose, onSelect }: StickerPickerProps) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden border-b border-border"
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
                🐼 Klar Stickers
              </p>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1.5 max-h-[200px] overflow-y-auto">
              {STICKER_KEYS.map((key) => (
                <motion.button
                  key={key}
                  whileTap={{ scale: 0.85 }}
                  whileHover={{ scale: 1.1 }}
                  onClick={() => { onSelect(key); onClose(); }}
                  className="aspect-square rounded-xl hover:bg-muted/60 p-1 transition-colors"
                >
                  <img
                    src={STICKER_MAP[key]}
                    alt={key}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickerPicker;
