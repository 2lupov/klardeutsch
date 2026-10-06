import { motion } from "framer-motion";
import type { Lang } from "@/i18n/translations";
import certificateAsset from "@/assets/klar-certificate.svg.asset.json";

const CertificatePreview = ({ lang }: { lang: Lang }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="relative w-full aspect-[1200/850] rounded-xl overflow-hidden border border-accent/30 shadow-[0_20px_60px_-20px_rgba(245,166,35,0.4)]"
    >
      <img
        src={certificateAsset.url}
        alt={lang === "uk" ? "Приклад сертифіката KLAR Academy" : "Пример сертификата KLAR Academy"}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
    </motion.div>
  );
};

export default CertificatePreview;
