import { useState } from "react";
import { Bug, Send, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchEdgeFunction } from "@/lib/auth-fetch";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

const ReportErrorButton = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  // Hide on chat page
  if (location.pathname === "/chat") return null;
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSending(true);
    try {
      const resp = await fetchEdgeFunction("report-error", {
        json: { page: location.pathname, description },
      });
      if (!resp.ok) throw new Error();
      toast.success(t("reportSent"));
      setDescription("");
      setOpen(false);
    } catch {
      toast.error(t("reportFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors md:bottom-6"
        title={t("reportError")}
      >
        <Bug className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="glass-card w-full max-w-sm p-5 space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-destructive" />
                <h3 className="font-display font-bold text-sm">{t("reportError")}</h3>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("reportPlaceholder")}
              className="w-full min-h-[100px] rounded-xl border border-border bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              maxLength={1000}
            />

            <button
              onClick={handleSubmit}
              disabled={!description.trim() || sending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm disabled:opacity-50 transition-all hover:opacity-90"
            >
              <Send className="w-4 h-4" />
              {sending ? t("loading") : t("reportSend")}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportErrorButton;
