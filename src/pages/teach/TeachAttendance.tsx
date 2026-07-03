import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, FileText } from "lucide-react";

type Group = { id: string; name: string };
type Member = { student_id: string; display_name?: string; nickname?: string };
type Status = "present" | "absent" | "late" | "excused";

const STATUS_META: Record<Status, { label: string; icon: any; cls: string }> = {
  present: { label: "Присутній", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  absent: { label: "Відсутній", icon: XCircle, cls: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
  late: { label: "Запізнився", icon: Clock, cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  excused: { label: "Поважна", icon: FileText, cls: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
};

export default function TeachAttendance() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [members, setMembers] = useState<Member[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [existing, setExisting] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("school_groups").select("id,name").eq("teacher_id", u.user.id).order("name");
      setGroups(data || []);
      if (data?.[0]) setGroupId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!groupId) return;
    (async () => {
      const { data: mem } = await supabase
        .from("school_group_members")
        .select("student_id")
        .eq("group_id", groupId);
      const ids = (mem || []).map((m: any) => m.student_id);
      if (!ids.length) { setMembers([]); return; }
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,display_name,nickname")
        .in("id", ids);
      setMembers((profs || []).map((p: any) => ({ student_id: p.id, display_name: p.display_name, nickname: p.nickname })));

      const { data: att } = await supabase
        .from("school_attendance")
        .select("id,student_id,status")
        .eq("group_id", groupId)
        .eq("lesson_date", date);
      const s: Record<string, Status> = {};
      const e: Record<string, string> = {};
      (att || []).forEach((a: any) => { s[a.student_id] = a.status; e[a.student_id] = a.id; });
      setStatuses(s);
      setExisting(e);
    })();
  }, [groupId, date]);

  const setStatus = (sid: string, st: Status) => setStatuses(prev => ({ ...prev, [sid]: st }));

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user || !groupId) return;
    const rows = members.map(m => ({
      id: existing[m.student_id],
      group_id: groupId,
      student_id: m.student_id,
      teacher_id: u.user!.id,
      status: statuses[m.student_id] || "present",
      lesson_date: date,
    }));
    const { error } = await supabase.from("school_attendance").upsert(rows as any, { onConflict: "id" });
    if (error) toast.error(error.message); else toast.success("Збережено");
  };

  const stats = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0 };
    members.forEach(m => { c[(statuses[m.student_id] || "present") as Status]++; });
    return c;
  }, [statuses, members]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Група</div>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Оберіть групу" /></SelectTrigger>
            <SelectContent>
              {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Дата</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="h-10 px-3 rounded-md border bg-background text-sm" />
        </div>
        <Button onClick={save} disabled={!members.length}>Зберегти</Button>
        <div className="flex gap-2 ml-auto">
          {(Object.keys(STATUS_META) as Status[]).map(k => (
            <Badge key={k} variant="outline" className={STATUS_META[k].cls}>
              {STATUS_META[k].label}: {stats[k]}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Список учнів</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!members.length && <div className="text-sm text-muted-foreground">Немає учнів у групі.</div>}
          {members.map(m => (
            <div key={m.student_id} className="flex items-center justify-between gap-2 p-3 rounded-lg border">
              <div className="text-sm font-medium truncate">
                {m.display_name || m.nickname || m.student_id.slice(0, 8)}
              </div>
              <div className="flex gap-1">
                {(Object.keys(STATUS_META) as Status[]).map(k => {
                  const Icon = STATUS_META[k].icon;
                  const active = (statuses[m.student_id] || "present") === k;
                  return (
                    <Button key={k} size="sm" variant={active ? "default" : "outline"}
                      onClick={() => setStatus(m.student_id, k)} className="gap-1">
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{STATUS_META[k].label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
