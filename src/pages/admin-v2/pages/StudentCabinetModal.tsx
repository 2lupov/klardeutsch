import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, FolderOpen, Play, Radio, X } from "lucide-react";
import { fetchNotes, type NoteRow } from "@/components/student/StudentNotes";
import { plain } from "@/lib/rich-text";

interface Props { student: { user_id: string; display_name: string | null; email: string | null }; onClose: () => void }

function openLive(payload: { classId?: string; studentId?: string }) {
  sessionStorage.setItem("klar-open-live", JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("admin-v2:navigate", { detail: { key: "live" } }));
}

/** Картка учня: проведені живі уроки та його папки. */
export default function StudentCabinetModal({ student, onClose }: Props) {
  const [tab, setTab] = useState<"lessons" | "folders">("lessons");
  const [classes, setClasses] = useState<any[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [folder, setFolder] = useState<string | null>(null);
  const [note, setNote] = useState<NoteRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data }, n] = await Promise.all([
        supabase.from("live_classes").select("id,title,status,started_at,ended_at")
          .eq("student_id", student.user_id).order("started_at", { ascending: false }).limit(100),
        fetchNotes(student.user_id),
      ]);
      setClasses(data || []);
      setNotes(n);
      setLoading(false);
    })();
  }, [student.user_id]);

  const folders = useMemo(() => {
    const m = new Map<string, number>();
    notes.forEach((n) => m.set(n.folder, (m.get(n.folder) || 0) + 1));
    return [...m.entries()];
  }, [notes]);

  const name = student.display_name || student.email || "Учень";
  const dur = (c: any) => c.ended_at ? Math.max(1, Math.round((+new Date(c.ended_at) - +new Date(c.started_at)) / 60000)) + " хв" : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl h-[90dvh] sm:h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{name}</h3>
            <p className="text-xs text-slate-500">{classes.length} уроків · {notes.length} матеріалів у папках</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-1 px-4 pt-3 shrink-0">
          {([["lessons", "Уроки"], ["folders", "Папки"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k); setFolder(null); setNote(null); }}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium ${tab === k ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}>{l}</button>
          ))}
          {tab === "lessons" && (
            <button onClick={() => openLive({ studentId: student.user_id })}
              className="ml-auto px-3 py-1.5 rounded-xl text-white text-sm font-medium inline-flex items-center gap-1.5" style={{ background: "#4F46E5" }}>
              <Play className="w-4 h-4" /> Новий урок
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {loading ? <p className="text-sm text-slate-500 animate-pulse">Завантаження…</p>
          : tab === "lessons" ? (
            classes.length === 0 ? <p className="text-sm text-slate-500">Ще не було живих уроків.</p> : (
              <div className="divide-y divide-slate-100">
                {classes.map((c) => (
                  <div key={c.id} className="py-3 flex items-center gap-3">
                    <Radio className={`w-4 h-4 shrink-0 ${c.status === "active" ? "text-emerald-500" : "text-slate-300"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{c.title}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(c.started_at).toLocaleString("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {dur(c) ? ` · ${dur(c)}` : " · триває"}
                      </p>
                    </div>
                    <button onClick={() => openLive({ classId: c.id })}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      {c.status === "active" ? "Продовжити" : "Відкрити"}
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : note ? (
            <div className="space-y-3">
              <button onClick={() => setNote(null)} className="text-sm text-slate-600 inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> {folder}</button>
              <h4 className="font-semibold text-slate-900">{note.title}</h4>
              <div className="prose prose-sm max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: note.body || "" }} />
            </div>
          ) : folder ? (
            <div className="space-y-2">
              <button onClick={() => setFolder(null)} className="text-sm text-slate-600 inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Папки</button>
              {notes.filter((n) => n.folder === folder).map((n) => (
                <button key={n.id} onClick={() => setNote(n)} className="w-full text-left rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                  <p className="text-sm font-medium text-slate-900 truncate">{n.title}</p>
                  <p className="text-xs text-slate-500 truncate">{new Date(n.created_at).toLocaleDateString("uk-UA")} · {plain(n.body).slice(0, 80)}</p>
                </button>
              ))}
            </div>
          ) : folders.length === 0 ? <p className="text-sm text-slate-500">Папки порожні — збережіть матеріал з уроку кнопкою «У папку».</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {folders.map(([f, n]) => (
                <button key={f} onClick={() => setFolder(f)} className="rounded-2xl border border-slate-200 p-4 text-left hover:border-indigo-300">
                  <FolderOpen className="w-6 h-6 text-indigo-500 mb-2" />
                  <p className="font-semibold text-slate-900 text-sm">{f}</p>
                  <p className="text-xs text-slate-500">{n} матеріалів</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
