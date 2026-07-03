import { motion } from "framer-motion";
import { Award, Sparkles } from "lucide-react";
import type { Lang } from "@/i18n/translations";

const CertificatePreview = ({ lang }: { lang: Lang }) => {
  const t = (uk: string, ru: string) => (lang === "uk" ? uk : ru);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="relative w-full aspect-[1.55/1] rounded-xl overflow-hidden border-2 border-accent/40 bg-gradient-to-br from-[#0b1224] via-[#111a33] to-[#0b1224] shadow-[0_20px_60px_-20px_rgba(245,166,35,0.4)]"
    >
      {/* Corner ornaments */}
      <div className="absolute inset-3 border border-accent/30 rounded-lg pointer-events-none" />
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-accent" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-accent" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-accent" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-accent" />

      <div className="relative h-full flex flex-col items-center justify-center text-center px-6 py-6">
        <div className="flex items-center gap-2 text-accent">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.25em]">KLAR Academy</span>
          <Sparkles className="w-3.5 h-3.5" />
        </div>

        <h3 className="mt-3 font-display text-xl sm:text-2xl font-bold text-foreground">
          {t("Сертифікат про завершення", "Сертификат об окончании")}
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground uppercase tracking-widest">
          {t("цим засвідчується, що", "цим засвідчується, що")}
        </p>

        <p className="mt-2 font-display text-lg sm:text-xl italic text-accent">
          {t("Ваше Ім'я", "Ваше Имя")}
        </p>

        <p className="mt-2 text-xs text-muted-foreground max-w-[90%] leading-snug">
          {t(
            "успішно завершив(-ла) курс німецької мови рівня A1 на платформі KLAR",
            "успішно завершив(-ла) курс німецької мови рівня A1 на платформі KLAR",
          )}
        </p>

        <div className="mt-4 flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center">
            <Award className="w-8 h-8 text-accent" />
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between w-full text-[9px] text-muted-foreground uppercase tracking-widest">
          <div className="text-left">
            <div className="border-t border-border/60 w-20 mb-1" />
            {t("Дата", "Дата")}
          </div>
          <div className="text-right">
            <div className="border-t border-border/60 w-20 mb-1 ml-auto" />
            {t("Підпис", "Подпись")}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CertificatePreview;
