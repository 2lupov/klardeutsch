import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Award, Download, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";

interface CertData {
  certificate_code: string;
  final_score: number | null;
  issued_at: string | null;
  user_id: string;
  course_title: string;
  course_level: string;
  display_name: string | null;
}

const Certificate = () => {
  const { code } = useParams<{ code: string }>();
  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    const load = async () => {
      const { data: certRow } = await supabase
        .from("course_certificates")
        .select("certificate_code, final_score, issued_at, user_id, course_id")
        .eq("certificate_code", code.toUpperCase())
        .single();

      if (!certRow) { setNotFound(true); setLoading(false); return; }

      const [{ data: course }, { data: profile }] = await Promise.all([
        supabase.from("courses").select("title, level").eq("id", certRow.course_id).single(),
        supabase.from("profiles").select("display_name").eq("user_id", certRow.user_id).single(),
      ]);

      setCert({
        ...certRow,
        course_title: course?.title ?? "Course",
        course_level: course?.level ?? "A1",
        display_name: profile?.display_name ?? null,
      });
      setLoading(false);
    };
    load();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound || !cert) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">Сертификат не найден</h1>
          <p className="text-muted-foreground mb-6">Код «{code}» не существует или был удалён.</p>
          <Link to="/">
            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> На главную</Button>
          </Link>
        </div>
      </div>
    );
  }

  const verifyUrl = `${window.location.origin}/certificate/${cert.certificate_code}`;
  const dateStr = cert.issued_at ? new Date(cert.issued_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }) : "";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      {/* Certificate card */}
      <div className="w-full max-w-xl bg-card border-2 border-primary/30 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden" id="certificate-card">
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-primary/20 rounded-tl-3xl" />
        <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-primary/20 rounded-tr-3xl" />
        <div className="absolute bottom-0 left-0 w-20 h-20 border-b-4 border-l-4 border-primary/20 rounded-bl-3xl" />
        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-primary/20 rounded-br-3xl" />

        <div className="text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Award className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-bold">KLAR Deutsch</h2>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-2">Zertifikat</h1>
          </div>

          {/* Recipient */}
          <div className="py-4 border-y border-border/30">
            <p className="text-sm text-muted-foreground mb-1">Hiermit wird bestätigt, dass</p>
            <p className="text-2xl font-display font-bold text-foreground">
              {cert.display_name || "Student"}
            </p>
          </div>

          {/* Course info */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">den Kurs erfolgreich abgeschlossen hat</p>
            <p className="text-xl font-display font-bold text-primary">{cert.course_title}</p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold">{cert.course_level}</span>
              {cert.final_score !== null && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {cert.final_score}%
                </span>
              )}
            </div>
          </div>

          {/* Date */}
          <p className="text-sm text-muted-foreground">{dateStr}</p>

          {/* QR + Code */}
          <div className="flex flex-col items-center gap-3 pt-4">
            <QRCodeSVG value={verifyUrl} size={80} level="M" className="rounded-lg" />
            <p className="text-[10px] text-muted-foreground font-mono tracking-wider">
              Code: {cert.certificate_code}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Zurück
          </Button>
        </Link>
        <Button
          size="sm"
          onClick={() => {
            window.print();
          }}
        >
          <Download className="w-4 h-4 mr-1" /> Drucken / PDF
        </Button>
      </div>
    </div>
  );
};

export default Certificate;
