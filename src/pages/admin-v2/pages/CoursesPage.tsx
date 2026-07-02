import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, SectionHeader, EmptyState } from "./_ui";
import { BookOpen } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  available: boolean | null;
  cover_url?: string | null;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("id,title,description,level,available")
        .order("created_at", { ascending: false });
      setCourses((data as any) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Курси"
        subtitle="Керуй структурою всіх курсів школи"
        action={
          <button
            className="px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: "#4F46E5" }}
          >
            + Новий курс
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 w-2/3 bg-slate-100 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded mt-3" />
              <div className="h-3 w-1/2 bg-slate-100 rounded mt-2" />
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          title="Ще немає курсів"
          description="Створи перший курс вручну або згенеруй через AI Course Builder."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Card key={c.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}
                >
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "#FEF3C7", color: "#92400E" }}
                    >
                      {c.level || "—"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.available
                          ? ""
                          : "bg-slate-100 text-slate-500"
                      }`}
                      style={
                        c.available ? { background: "#DCFCE7", color: "#166534" } : undefined
                      }
                    >
                      {c.available ? "published" : "draft"}
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold text-slate-900 truncate">{c.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {c.description || "Без опису"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
