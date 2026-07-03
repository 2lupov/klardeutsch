import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Wallet, TrendingUp, Clock, AlertTriangle } from "lucide-react";

type Payment = {
  id: string;
  student_id: string;
  group_id: string | null;
  amount: number;
  currency: string;
  type: string;
  status: string;
  paid_at: string | null;
  note: string | null;
  created_at: string;
};
type Group = { id: string; name: string };
type Student = { id: string; display_name?: string; nickname?: string };

const TYPES = [
  { v: "lesson", l: "Урок" },
  { v: "subscription", l: "Абонемент" },
  { v: "course", l: "Курс" },
  { v: "refund", l: "Повернення" },
  { v: "other", l: "Інше" },
];
const STATUSES = [
  { v: "paid", l: "Оплачено", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  { v: "pending", l: "Очікує", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { v: "overdue", l: "Прострочено", cls: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
  { v: "cancelled", l: "Скасовано", cls: "bg-muted text-muted-foreground" },
];

export default function TeachFinance() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    student_id: "", group_id: "", amount: "", type: "lesson", status: "paid",
    paid_at: new Date().toISOString().slice(0, 10), note: "",
  });

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: pay }, { data: gr }] = await Promise.all([
      supabase.from("school_payments").select("*").eq("teacher_id", u.user.id).order("paid_at", { ascending: false }),
      supabase.from("school_groups").select("id,name").eq("teacher_id", u.user.id),
    ]);
    setPayments((pay || []) as Payment[]);
    setGroups(gr || []);
    // load student list from all groups' members
    const gids = (gr || []).map((g: any) => g.id);
    if (gids.length) {
      const { data: mem } = await supabase.from("school_group_members").select("student_id").in("group_id", gids);
      const ids = Array.from(new Set((mem || []).map((m: any) => m.student_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,display_name,nickname").in("id", ids);
        setStudents((profs || []) as Student[]);
      }
    }
  };
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let paidMonth = 0, pending = 0, overdue = 0, totalPaid = 0;
    payments.forEach(p => {
      const d = p.paid_at ? new Date(p.paid_at) : new Date(p.created_at);
      if (p.status === "paid") {
        totalPaid += Number(p.amount);
        if (d >= monthStart) paidMonth += Number(p.amount);
      }
      if (p.status === "pending") pending += Number(p.amount);
      if (p.status === "overdue") overdue += Number(p.amount);
    });
    return { paidMonth, pending, overdue, totalPaid };
  }, [payments]);

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (!form.student_id || !form.amount) { toast.error("Оберіть учня і суму"); return; }
    const { error } = await supabase.from("school_payments").insert({
      teacher_id: u.user.id,
      student_id: form.student_id,
      group_id: form.group_id || null,
      amount: Number(form.amount),
      type: form.type,
      status: form.status,
      paid_at: form.paid_at,
      note: form.note || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Платіж додано");
    setOpen(false);
    setForm({ ...form, amount: "", note: "" });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("school_payments").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const nameOf = (id: string) => {
    const s = students.find(x => x.id === id);
    return s?.display_name || s?.nickname || id.slice(0, 8);
  };
  const groupName = (id: string | null) => groups.find(g => g.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<TrendingUp className="w-4 h-4" />} label="За місяць" value={`${stats.paidMonth.toFixed(0)} ₴`} />
        <StatCard icon={<Wallet className="w-4 h-4" />} label="Всього оплачено" value={`${stats.totalPaid.toFixed(0)} ₴`} />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Очікує" value={`${stats.pending.toFixed(0)} ₴`} />
        <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Прострочено" value={`${stats.overdue.toFixed(0)} ₴`} />
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Додати платіж</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Новий платіж</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                <SelectTrigger><SelectValue placeholder="Учень" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name || s.nickname}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.group_id} onValueChange={v => setForm({ ...form, group_id: v })}>
                <SelectTrigger><SelectValue placeholder="Група (необов'язково)" /></SelectTrigger>
                <SelectContent>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Сума (₴)" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })} />
                <Input type="date" value={form.paid_at} onChange={e => setForm({ ...form, paid_at: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input placeholder="Примітка" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
            </div>
            <DialogFooter><Button onClick={save}>Зберегти</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Історія платежів</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!payments.length && <div className="text-sm text-muted-foreground">Ще немає платежів.</div>}
          {payments.map(p => {
            const st = STATUSES.find(s => s.v === p.status)!;
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{nameOf(p.student_id)}</div>
                  <div className="text-xs text-muted-foreground">
                    {groupName(p.group_id)} · {TYPES.find(t => t.v === p.type)?.l} · {p.paid_at}
                    {p.note ? ` · ${p.note}` : ""}
                  </div>
                </div>
                <div className="font-semibold whitespace-nowrap">{Number(p.amount).toFixed(0)} ₴</div>
                <Select value={p.status} onValueChange={v => updateStatus(p.id, v)}>
                  <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                </Select>
                <Badge variant="outline" className={st.cls}>{st.l}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">{icon}{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
