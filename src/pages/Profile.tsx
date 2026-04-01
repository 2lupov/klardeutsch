import { useEffect, useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, Brain, Flame, RotateCcw, TrendingUp, Calendar, LogOut, Camera, Pencil, Check, X, Coins, Trophy, ArrowLeft, ChevronRight, Award, Bell, Send, Unlink2, Users, WifiOff, Trash2, HardDrive, Globe, Lock, ShoppingBag, ExternalLink, Gift } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCoins } from "@/hooks/useCoins";
import Achievements, { type AchievementStats } from "@/components/Achievements";
import LofiRadio from "@/components/LofiRadio";
import Leaderboard from "@/components/Leaderboard";
import Referrals from "@/components/Referrals";
import { useXP } from "@/hooks/useXP";
import AvatarPicker from "@/components/AvatarPicker";
import ImageCropper from "@/components/ImageCropper";
import StreakPlant from "@/components/StreakPlant";
import { useDailyBonus } from "@/hooks/useDailyBonus";
import GiftShelf from "@/components/gifts/GiftShelf";
import GiftUnboxing from "@/components/gifts/GiftUnboxing";
import FriendsList from "@/components/FriendsList";

interface ProgressRow {
  level: string;
  category: string;
  exercise_id: string;
  score: number | null;
  completed: boolean | null;
  data: any;
  updated_at: string;
}

interface ProfileData {
  display_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  telegram_chat_id: number | null;
  nickname_changed_at: string | null;
}

type ProfileScreen = "main" | "achievements" | "activity" | "mistakes" | "leaderboard" | "notifications" | "referrals" | "offline" | "friends";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { t, lang, languageLocked, lockLanguage, unlockLanguage } = useLanguage();
  const { isMobile, isTelegram } = usePlatform();
  const { balance } = useCoins();
  const { totalXP } = useXP();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [screen, setScreen] = useState<ProfileScreen>("main");
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [customWordsCount, setCustomWordsCount] = useState(0);
  const [savedWordsCount, setSavedWordsCount] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [profile, setProfile] = useState<ProfileData>({ display_name: null, nickname: null, avatar_url: null, telegram_chat_id: null, nickname_changed_at: null });
  const [editing, setEditing] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [uploading, setUploading] = useState(false);
  const [duelsWonCount, setDuelsWonCount] = useState(0);
  const [dialoguesCount, setDialoguesCount] = useState(0);
  const [dailyBonusStreakVal, setDailyBonusStreakVal] = useState(0);
  const [challengesSentCount, setChallengesSentCount] = useState(0);
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [settingAvatar, setSettingAvatar] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const { streak: pandaStreak, canClaim: pandaCanClaim, loading: pandaLoading } = useDailyBonus();
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: prog }, { count }, { data: prof }, { count: customCount }, { count: savedCount }] = await Promise.all([
        supabase.from("user_progress").select("*").eq("user_id", user.id),
        supabase.from("vocab_cards").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("display_name, nickname, avatar_url, telegram_chat_id, nickname_changed_at").eq("user_id", user.id).single(),
        supabase.from("custom_words").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("saved_words").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setProgress(prog ?? []);
      setTotalCards(count ?? 0);
      setCustomWordsCount(customCount ?? 0);
      setSavedWordsCount(savedCount ?? 0);
      if (prof) setProfile({ display_name: prof.display_name, nickname: (prof as any).nickname ?? null, avatar_url: prof.avatar_url, telegram_chat_id: (prof as any).telegram_chat_id ?? null, nickname_changed_at: (prof as any).nickname_changed_at ?? null });

      // Fetch extra achievement stats
      const [duelsRes, challengesSentRes, dailyBonusRes] = await Promise.all([
        supabase.from("challenges").select("id", { count: "exact", head: true }).eq("winner_id", user.id),
        supabase.from("challenges").select("id", { count: "exact", head: true }).eq("challenger_id", user.id),
        (supabase as any).from("daily_bonuses").select("streak").eq("user_id", user.id).maybeSingle(),
      ]);
      setDuelsWonCount(duelsRes.count ?? 0);
      setChallengesSentCount(challengesSentRes.count ?? 0);
      setDailyBonusStreakVal(dailyBonusRes.data?.streak ?? 0);

      // Fetch pending incoming friend requests
      const { count: friendReqCount } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("friend_id", user.id)
        .eq("status", "pending");
      setPendingFriendRequests(friendReqCount ?? 0);
      // Dialogues completed = progress entries with category containing "dialogue"
      const dialogueEntries = (prog ?? []).filter((p: any) => p.category === "dialogue" || p.exercise_id?.includes("dialogue"));
      setDialoguesCount(dialogueEntries.length);

      setFetching(false);
    };
    load();
  }, [user]);

  const completedLessons = useMemo(() => progress.filter((p) => p.completed).length, [progress]);
  const wordsLearned = useMemo(() => progress.filter((p) => p.category === "vocabulary" && p.completed).length, [progress]);

  const streak = useMemo(() => {
    if (!progress.length) return 0;
    const days = new Set(progress.map((p) => new Date(p.updated_at).toISOString().slice(0, 10)));
    let count = 0;
    const d = new Date();
    while (days.has(d.toISOString().slice(0, 10))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [progress]);

  const weakAreas = useMemo(() => {
    return progress
      .filter((p) => p.category === "grammar" && p.score !== null && p.score < 80)
      .map((r) => ({ level: r.level, score: r.score ?? 0 }));
  }, [progress]);

  const recommendation = useMemo(() => {
    if (!progress.length) return null;
    const grammar = progress.filter((p) => p.category === "grammar");
    const avgScore = grammar.length > 0 ? grammar.reduce((s, p) => s + (p.score ?? 0), 0) / grammar.length : 100;
    if (avgScore < 60) return "pullUpGrammar";
    const vocab = progress.filter((p) => p.category === "vocabulary" && p.completed);
    if (vocab.length * 5 < totalCards * 0.3) return "learnMoreWords";
    const reading = progress.filter((p) => p.category === "reading" && p.completed);
    if (reading.length === 0) return "tryReading";
    return "keepGoing";
  }, [progress, totalCards]);

  const recentActivity = useMemo(
    () => [...progress].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 10),
    [progress]
  );

  const achievementStats: AchievementStats = useMemo(() => {
    const levels = ["A1", "A2", "B1", "B2", "C1"];
    const levelsCompleted = levels.filter((lvl) => {
      const cats = ["vocabulary", "grammar", "reading", "listening"];
      return cats.every((cat) => progress.some((p) => p.level === lvl && p.category === cat && p.completed));
    }).length;

    const grammarEntries = progress.filter((p) => p.category === "grammar" && p.score !== null);
    const grammarAvgScore = grammarEntries.length > 0
      ? grammarEntries.reduce((s, p) => s + (p.score ?? 0), 0) / grammarEntries.length
      : 0;

    const readingCompleted = progress.filter((p) => p.category === "reading" && p.completed).length;
    const writingCompleted = progress.filter((p) => p.category === "writing" && p.completed).length;

    return {
      wordsLearned: savedWordsCount,
      lessonsCompleted: completedLessons,
      streak,
      levelsCompleted,
      grammarAvgScore,
      readingCompleted,
      customWordsAdded: customWordsCount,
      difficultWordsReviewed: 0,
      writingCompleted,
      duelsWon: duelsWonCount,
      dialoguesCompleted: dialoguesCount,
      dailyBonusStreak: dailyBonusStreakVal,
      challengesSent: challengesSentCount,
    };
  }, [progress, savedWordsCount, customWordsCount, completedLessons, streak, duelsWonCount, dialoguesCount, dailyBonusStreakVal, challengesSentCount]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setCropFile(file);
    e.target.value = "";
  };

  const handleCroppedAvatar = async (blob: Blob) => {
    if (!user) return;
    setUploading(true);
    setCropFile(null);
    const path = `${user.id}/avatar.png`;
    await supabase.storage.from("avatars").remove([path]);
    const { error } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/png" });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url }).eq("user_id", user.id);
    setProfile((p) => ({ ...p, avatar_url }));
    setUploading(false);
    setShowAvatarPicker(false);
  };

  const handlePresetAvatar = async (url: string) => {
    if (!user) return;
    setSettingAvatar(true);
    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
    setProfile((p) => ({ ...p, avatar_url: url }));
    setSettingAvatar(false);
    setShowAvatarPicker(false);
    toast({ title: t("profileSaved") });
  };

  const usernameRegex = /^[a-zA-Zа-яА-ЯёЁіІїЇєЄґҐ][a-zA-Zа-яА-ЯёЁіІїЇєЄґҐ0-9._]{4,19}$/;

  const handleSaveName = async () => {
    if (!user) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      toast({ title: lang === "uk" ? "Ім'я не може бути порожнім" : "Имя не может быть пустым", variant: "destructive" });
      return;
    }
    await supabase.from("profiles").update({ display_name: trimmed } as any).eq("user_id", user.id);
    setProfile((p) => ({ ...p, display_name: trimmed }));
    setEditing(false);
    toast({ title: t("profileSaved") });
  };

  const handleSaveNickname = async () => {
    if (!user) return;
    const trimmed = editNickname.trim();
    if (!trimmed || !usernameRegex.test(trimmed)) {
      toast({ title: lang === "uk" ? "Нікнейм має починатися з букви, мін. 5 символів" : "Никнейм должен начинаться с буквы, мин. 5 символов", variant: "destructive" });
      return;
    }
    // 2-week cooldown check
    if (profile.nickname_changed_at) {
      const lastChanged = new Date(profile.nickname_changed_at).getTime();
      const twoWeeks = 14 * 24 * 60 * 60 * 1000;
      if (Date.now() - lastChanged < twoWeeks) {
        const nextDate = new Date(lastChanged + twoWeeks);
        const formatted = nextDate.toLocaleDateString(lang === "uk" ? "uk-UA" : "ru-RU", { day: "numeric", month: "long" });
        toast({ title: lang === "uk" ? `Змінити нікнейм можна після ${formatted}` : `Изменить никнейм можно после ${formatted}`, variant: "destructive" });
        return;
      }
    }
    // Check uniqueness
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("nickname" as any, trimmed)
      .neq("user_id", user.id)
      .limit(1);
    if (existing && existing.length > 0) {
      toast({ title: lang === "uk" ? "Цей нікнейм вже зайнятий" : "Этот никнейм уже занят", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    await supabase.from("profiles").update({ nickname: trimmed, nickname_changed_at: now } as any).eq("user_id", user.id);
    setProfile((p) => ({ ...p, nickname: trimmed, nickname_changed_at: now }));
    setEditingNickname(false);
    toast({ title: t("profileSaved") });
  };

  const startEdit = () => {
    setEditName(profile.display_name ?? "");
    setEditing(true);
  };

  const startEditNickname = () => {
    setEditNickname(profile.nickname ?? "");
    setEditingNickname(true);
  };

  if (!user || fetching) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-muted-foreground">{t("loading")}</span>
      </div>
    );
  }

  const displayName = profile.display_name || user.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case "vocabulary": return t("vocabSublabel");
      case "grammar": return t("grammarSublabel");
      case "reading": return t("readingSublabel");
      default: return cat;
    }
  };

  const recommendationText = (key: string | null) => {
    switch (key) {
      case "pullUpGrammar": return t("recGrammar");
      case "learnMoreWords": return t("recVocab");
      case "tryReading": return t("recReading");
      case "keepGoing": return t("recKeepGoing");
      default: return "";
    }
  };

  // Sub-screen: Friends
  if (screen === "friends") {
    return <FriendsList onBack={() => setScreen("main")} />;
  }

  // Sub-screen: Referrals
  if (screen === "referrals") {
    return (
      <div className={`w-full mx-auto px-4 py-4 h-full flex flex-col ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button
          onClick={() => setScreen("main")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </button>
        <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t("referralsTitle")}
        </h2>
        <div className="flex-1 overflow-y-auto">
          <Referrals />
        </div>
      </div>
    );
  }

  // Sub-screen: Offline
  if (screen === "offline") {
    const handleClearCache = async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      toast({ title: "Кэш очищен", description: "Данные будут загружены заново при следующем подключении." });
    };

    return (
      <div className={`w-full mx-auto px-4 py-4 h-full flex flex-col ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button
          onClick={() => setScreen("main")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </button>
        <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-primary" />
          Офлайн-режим
        </h2>
        <div className="flex-1 overflow-y-auto space-y-4">
          <section className="glass-card p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">Как это работает?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Когда ты открываешь карточки слов, грамматику или тексты для чтения — они автоматически сохраняются на устройстве. 
              Если пропадёт интернет, ты сможешь продолжить учёбу с уже загруженными материалами.
            </p>
          </section>
          <section className="glass-card p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              Что кэшируется
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Карточки слов (все уровни)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Грамматические правила и вопросы
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Тексты для чтения
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                Тексты для аудирования
              </li>
            </ul>
          </section>
          <section className="glass-card p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">💡 Совет</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Перед поездкой или перелётом просто открой нужные уровни — и материалы будут доступны без интернета!
            </p>
          </section>

          <section className="glass-card p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">📲 Установи как приложение</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              KLAR работает как полноценное приложение — добавь его на домашний экран для быстрого доступа.
            </p>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs font-display font-semibold text-foreground mb-1">Через Telegram (рекомендуем)</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Открой бота <span className="font-medium text-foreground">@klar_deutsch_bot</span></li>
                  <li>Нажми кнопку «Открыть KLAR»</li>
                  <li>В меню (⋯) выбери «Добавить на домашний экран»</li>
                </ol>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs font-display font-semibold text-foreground mb-1">Safari (iPhone / iPad)</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Открой сайт в Safari</li>
                  <li>Нажми кнопку «Поделиться» (□↑)</li>
                  <li>Выбери «На экран Домой»</li>
                </ol>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs font-display font-semibold text-foreground mb-1">Chrome (Android)</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Открой сайт в Chrome</li>
                  <li>Нажми меню (⋮) → «Добавить на главный экран»</li>
                </ol>
              </div>
            </div>
          </section>

          <button
            onClick={handleClearCache}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-display font-medium hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Очистить кэш
          </button>
          <p className="text-[11px] text-muted-foreground/60 text-center pb-4">
            После очистки данные загрузятся заново при подключении к интернету
          </p>
        </div>
      </div>
    );
  }

  // Sub-screen: Notifications
  if (screen === "notifications") {
    const botUsername = "klar_deutsch_bot";
    const deepLink = `https://t.me/${botUsername}?start=${user.id}`;

    const handleUnlink = async () => {
      await supabase
        .from("profiles")
        .update({ telegram_chat_id: null } as any)
        .eq("user_id", user.id);
      setProfile((p) => ({ ...p, telegram_chat_id: null }));
      toast({ title: t("telegramUnlinked") });
    };

    return (
      <div className={`w-full mx-auto px-4 py-4 h-full flex flex-col ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button
          onClick={() => setScreen("main")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </button>
        <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          {t("notificationsTitle")}
        </h2>

        <section className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Send className="w-5 h-5 text-[#2AABEE]" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Telegram</p>
              <p className="text-xs text-muted-foreground">{t("telegramLinkDesc")}</p>
            </div>
          </div>

          {profile.telegram_chat_id ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
              <span className="text-sm text-foreground">{t("telegramLinked")}</span>
              <button
                onClick={handleUnlink}
                className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
              >
                <Unlink2 className="w-3.5 h-3.5" />
                {t("unlinkTelegram")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t("telegramNotLinked")}
              </p>
              <a
                href={deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#2AABEE] text-white text-sm font-semibold hover:bg-[#229ED9] transition-colors"
              >
                <Send className="w-4 h-4" />
                {t("openBot")}
              </a>
              <p className="text-[11px] text-muted-foreground/60 text-center">
                Нажми /start в боте — и уведомления подключатся автоматически
              </p>
            </div>
          )}
        </section>
      </div>
    );
  }

  // Sub-screen: Leaderboard
  if (screen === "leaderboard") {
    return (
      <div className={`w-full mx-auto px-4 py-4 h-full flex flex-col ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button
          onClick={() => setScreen("main")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </button>
        <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          {t("leaderboardTitle")}
        </h2>
        <div className="flex-1 overflow-y-auto">
          <Leaderboard />
        </div>
      </div>
    );
  }

  // Sub-screen: Achievements
  if (screen === "achievements") {
    return (
      <div className={`w-full mx-auto px-4 py-4 h-full flex flex-col ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button
          onClick={() => setScreen("main")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </button>
        <div className="flex-1 overflow-y-auto">
          <Achievements stats={achievementStats} />
        </div>
      </div>
    );
  }

  // Sub-screen: Activity
  if (screen === "activity") {
    return (
      <div className={`w-full mx-auto px-4 py-4 h-full flex flex-col ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button
          onClick={() => setScreen("main")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </button>
        <div className="flex-1 overflow-y-auto">
          <section className="glass-card p-5">
            <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {t("activityHistory")}
            </h2>
            {recentActivity.length > 0 ? (
              <ul className="space-y-2">
                {recentActivity.map((a, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{categoryLabel(a.category)} · {a.level}</span>
                    <span className="text-xs text-muted-foreground/60">{new Date(a.updated_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("statsNoData")}</p>
            )}
          </section>

          {recommendation && (
            <section className="glass-card p-5 mt-4">
              <h2 className="font-display text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                {t("recommendationSection")}
              </h2>
              <p className="text-sm text-muted-foreground">{recommendationText(recommendation)}</p>
            </section>
          )}
        </div>
      </div>
    );
  }

  // Sub-screen: Mistakes
  if (screen === "mistakes") {
    return (
      <div className={`w-full mx-auto px-4 py-4 h-full flex flex-col ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button
          onClick={() => setScreen("main")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </button>
        <div className="flex-1 overflow-y-auto">
          <section className="glass-card p-5">
            <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-destructive" />
              {t("mistakesSection")}
            </h2>
            {weakAreas.length > 0 ? (
              <ul className="space-y-2">
                {weakAreas.map((w, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("grammarSublabel")} · {w.level}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gradient font-display font-semibold">{w.score}%</span>
                      <button onClick={() => navigate("/")} className="text-xs text-primary hover:underline">{t("retry")}</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Ошибок нет — отличная работа! 🎉</p>
            )}
          </section>
        </div>
      </div>
    );
  }

  // Main profile screen
  return (
    <div className={`w-full mx-auto px-4 py-4 pb-8 ${isMobile ? "max-w-md" : "max-w-3xl"}`}>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t("signOut")}
        </button>
        <div className="relative">
          <LofiRadio />
        </div>
      </div>

      {/* Profile header */}
      <div className={`flex items-center gap-4 mb-4 ${!isMobile ? "gap-6" : ""}`}>
        <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
          <Avatar className={`border-2 border-primary/20 ${isMobile ? "w-14 h-14" : "w-20 h-20"}`}>
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={displayName} />
            ) : null}
            <AvatarFallback className={`font-display font-bold bg-primary/10 text-primary ${isMobile ? "text-lg" : "text-2xl"}`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 min-w-0 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-sm font-display font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={t("nickname")}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              />
              <button onClick={handleSaveName} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className={`font-display font-bold text-foreground truncate ${isMobile ? "text-xl" : "text-2xl"}`}>{displayName}</h1>
              <button onClick={startEdit} className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {editingNickname ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">@</span>
              <input
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value.replace(/\s/g, "").slice(0, 20))}
                className="min-w-0 bg-muted/50 border border-border rounded-md px-2 py-0.5 text-xs font-display font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="nickname"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveNickname()}
              />
              <button onClick={handleSaveNickname} className="p-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditingNickname(false)} className="p-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground truncate cursor-pointer hover:text-foreground transition-colors group/nick" onClick={startEditNickname}>
              @{profile.nickname || "nickname"}
              <Pencil className="w-2.5 h-2.5 inline-block ml-1 opacity-0 group-hover/nick:opacity-100 transition-opacity" />
            </p>
          )}
        </div>

        {/* Panda streak button */}
        {!pandaLoading && (
          <StreakPlant streak={pandaStreak} canClaim={pandaCanClaim} compact />
        )}
      </div>

      {/* Avatar picker */}
      {showAvatarPicker && !cropFile && (
        <div className="glass-card p-4 mb-4 flex flex-col gap-3">
          <p className="text-xs font-medium text-foreground">Выбери аватарку:</p>
          <AvatarPicker
            currentUrl={profile.avatar_url}
            onSelect={handlePresetAvatar}
            loading={settingAvatar}
          />
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground">або</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-primary hover:underline"
          >
            Завантажити своє фото
          </button>
        </div>
      )}

      {/* Image cropper */}
      {cropFile && (
        <div className="glass-card p-4 mb-4">
          <ImageCropper
            imageFile={cropFile}
            onCrop={handleCroppedAvatar}
            onCancel={() => setCropFile(null)}
          />
        </div>
      )}

      {/* Language choice */}
      {!languageLocked ? (
        <div className="glass-card p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <p className="text-sm font-display font-semibold text-foreground">
              {lang === "uk" ? "Обери мову інтерфейсу" : "Выбери язык интерфейса"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {lang === "uk" ? "Після вибору мову буде зафіксовано і перемикач зникне." : "После выбора язык будет зафиксирован и переключатель исчезнет."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => lockLanguage("ru")}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                lang === "ru" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              💬 Русский
            </button>
            <button
              onClick={() => lockLanguage("uk")}
              className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                lang === "uk" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              ✨ Українська
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <Lock className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground/50">
              {lang === "uk" ? "✨ Українська" : "💬 Русский"} — {lang === "uk" ? "мову зафіксовано" : "язык зафиксирован"}
            </span>
          </div>
          <button
            onClick={unlockLanguage}
            className="text-[10px] text-primary hover:underline"
          >
            {lang === "uk" ? "Змінити" : "Сменить"}
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className={`grid gap-2 mb-4 ${isMobile ? "grid-cols-4" : "grid-cols-4"}`}>
        <StatCard icon={<Coins className="w-4 h-4" />} value={balance} label={t("coinsLabel")} />
        <StatCard icon={<BookOpen className="w-4 h-4" />} value={wordsLearned} label={t("wordsLearned")} />
        <StatCard icon={<Brain className="w-4 h-4" />} value={completedLessons} label={t("lessonsCompleted")} />
        <StatCard icon={<Flame className="w-4 h-4" />} value={streak} label={t("streakDays")} />
      </div>

      {/* Gift unboxing on profile entry */}
      {user && <GiftUnboxing userId={user.id} />}

      {/* Gift shelf */}
      {user && (
        <div className="mb-4">
          <GiftShelf userId={user.id} />
        </div>
      )}

      {/* Navigation buttons */}
      <div className={`gap-2 mb-4 ${isMobile ? "flex flex-col" : "grid grid-cols-2"}`}>
        <NavButton
          icon={<Award className="w-4 h-4 text-primary" />}
          label={t("leaderboardTitle")}
          subtitle={`${totalXP} XP`}
          onClick={() => setScreen("leaderboard")}
        />
        <NavButton
          icon={<Trophy className="w-4 h-4 text-primary" />}
          label={t("achievementsTitle")}
          onClick={() => setScreen("achievements")}
        />
        <NavButton
          icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
          label={t("activityHistory")}
          onClick={() => setScreen("activity")}
        />
        <NavButton
          icon={<RotateCcw className="w-4 h-4 text-destructive" />}
          label={t("mistakesSection")}
          badge={weakAreas.length > 0 ? weakAreas.length : undefined}
          onClick={() => setScreen("mistakes")}
        />
        <NavButton
          icon={<Bell className="w-4 h-4 text-[#2AABEE]" />}
          label={t("notificationsTitle")}
          subtitle={profile.telegram_chat_id ? "Telegram ✅" : undefined}
          onClick={() => setScreen("notifications")}
        />
        <NavButton
          icon={<Users className="w-4 h-4 text-primary" />}
          label={lang === "uk" ? "Друзі" : "Друзья"}
          badge={pendingFriendRequests > 0 ? pendingFriendRequests : undefined}
          onClick={() => setScreen("friends")}
        />
        <NavButton
          icon={<Send className="w-4 h-4 text-primary" />}
          label={t("referralsTitle")}
          onClick={() => setScreen("referrals")}
        />
        <NavButton
          icon={<WifiOff className="w-4 h-4 text-muted-foreground" />}
          label="Офлайн-режим"
          onClick={() => setScreen("offline")}
        />
        {/* Shop banner for mobile */}
        {isMobile && (
          <div className="glass-card p-4 flex items-center gap-3 border-primary/20 bg-primary/5">
            <ShoppingBag className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-display font-semibold text-foreground">
                {lang === "uk" ? "Магазин курсів" : "Магазин курсов"}
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {lang === "uk" ? "Додаткові курси та матеріали для вивчення німецької" : "Дополнительные курсы и материалы для изучения немецкого"}
              </p>
            </div>
            {isTelegram ? (
              <a
                href="https://klardeutsch.lovable.app/shop"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-medium hover:bg-primary/90 transition-colors flex-shrink-0"
              >
                {lang === "uk" ? "Відкрити" : "Открыть"}
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <button
                onClick={() => navigate("/shop")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-medium hover:bg-primary/90 transition-colors flex-shrink-0"
              >
                {lang === "uk" ? "Відкрити" : "Открыть"}
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Info links (mobile) */}
      {isMobile && !isTelegram && (
        <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground mt-2 mb-2">
          <Link to="/method" className="hover:text-foreground transition-colors">О методе</Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Конфиденциальность</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-foreground transition-colors">Оферта</Link>
        </div>
      )}

    </div>
  );
};

const StatCard = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
  <div className="glass-card p-3 flex flex-col items-center gap-1 text-center">
    <div className="text-muted-foreground">{icon}</div>
    <span className="text-xl font-display font-bold text-gradient">{value}</span>
    <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
  </div>
);

const NavButton = ({ icon, label, badge, subtitle, onClick }: { icon: React.ReactNode; label: string; badge?: number; subtitle?: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="glass-card px-4 py-3 flex items-center gap-3 text-left hover:border-primary/20 transition-colors group"
  >
    {icon}
    <div className="flex-1 min-w-0">
      <span className="text-sm font-display font-medium text-foreground block">{label}</span>
      {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
    </div>
    {badge !== undefined && (
      <span className="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-[10px] font-semibold">{badge}</span>
    )}
    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
  </button>
);

export default Profile;
