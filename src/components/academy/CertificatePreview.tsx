import { motion } from "framer-motion";
import type { Lang } from "@/i18n/translations";
import certificateSvg from "@/assets/klar-certificate.svg?raw";

const svgMarkup = certificateSvg
  .replace(/<svg([^>]*?)\swidth="1200"/, "<svg$1")
  .replace(/<svg([^>]*?)\sheight="850"/, "<svg$1")
  .replace("<svg", '<svg style="width:100%;height:100%;display:block"');

const CertificatePreview = ({ lang }: { lang: Lang }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="relative w-full aspect-[1200/850] rounded-xl overflow-hidden border border-accent/30 shadow-[0_20px_60px_-20px_rgba(245,166,35,0.4)]"
      role="img"
      aria-label={lang === "uk" ? "Приклад сертифіката KLAR Academy" : "Пример сертификата KLAR Academy"}
      dangerouslySetInnerHTML={{ __html: certificateSvg }}
    />
  );
};

export default CertificatePreview;
