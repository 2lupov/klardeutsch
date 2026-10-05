import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import UserProfileDialog from "@/components/UserProfileDialog";
import { useCommunityMessages, type CommunityMessage } from "@/hooks/useCommunityMessages";
import { useChatUpload, type UploadedItem } from "@/hooks/useChatUpload";
import MessageList from "./MessageList";
import MessageComposer, { type ComposerPayload } from "./MessageComposer";
import type { ReplyInfo } from "./ReplyPreview";

const CommunityChat = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = (uk: string, ru: string) => (lang === "uk" ? uk : ru);
  const { messages, profiles, loading, loadingOlder, hasMore, error, loadOlder, send, remove } = useCommunityMessages(!!user);
  const { upload, removeUploaded } = useChatUpload(user?.id);
  const [reply, setReply] = useState<ReplyInfo | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data, error }) => {
      if (!error) setIsAdmin(!!data);
    });
  }, [user]);

  useEffect(() => {
    if (error) toast({ title: t("Не вдалося завантажити чат", "Не удалось загрузить чат"), description: error, variant: "destructive" });
  }, [error]); // eslint-disable-line react-hooks/exhaustive-deps

  const fail = (title: string, e?: unknown) =>
    toast({ title, description: e instanceof Error ? e.message : undefined, variant: "destructive" });

  const handleSend = useCallback(async ({ text, images, file }: ComposerPayload): Promise<boolean> => {
    if (!user) return false;
    const uploaded: UploadedItem[] = [];
    try {
      for (const img of images) uploaded.push(await upload(img, "chat-images"));
      const fileItem = file ? await upload(file, "chat-files") : null;
      if (fileItem) uploaded.push(fileItem);
    } catch (e) {
      await removeUploaded(uploaded);
      fail(t("Не вдалося завантажити файл", "Не удалось загрузить файл"), e);
      return false;
    }
    const imageUrls = uploaded.filter((u) => u.bucket === "chat-images").map((u) => u.url);
    const fileItem = uploaded.find((u) => u.bucket === "chat-files");
    try {
      await send({
        user_id: user.id,
        content: text || (imageUrls.length ? "📷" : "📎"),
        image_urls: imageUrls,
        file_url: fileItem?.url ?? null,
        file_name: fileItem?.name ?? null,
        reply_to_id: reply?.id ?? null,
        reply_to_content: reply?.content.slice(0, 200) ?? null,
        reply_to_sender: reply?.sender ?? null,
      });
      setReply(null);
      return true;
    } catch (e) {
      await removeUploaded(uploaded);
      fail(t("Повідомлення не надіслано", "Сообщение не отправлено"), e);
      return false;
    }
  }, [user, upload, removeUploaded, send, reply]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (m: CommunityMessage) => {
    try { await remove(m.id); } catch (e) { fail(t("Не вдалося видалити", "Не удалось удалить"), e); }
  };

  const onComposerError = (code: "type" | "size" | "count") => {
    const map = {
      type: t("Такий тип файлу не підтримується", "Этот тип файла не поддерживается"),
      size: t("Файл завеликий (фото до 10 МБ, файли до 20 МБ)", "Файл слишком большой (фото до 10 МБ, файлы до 20 МБ)"),
      count: t("Не більше 6 фото за раз", "Не больше 6 фото за раз"),
    };
    fail(map[code]);
  };

  const profile = profileId ? profiles[profileId] : null;

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3 pl-14 md:pl-4 border-b border-border bg-card/80 backdrop-blur-xl shrink-0">
        <button onClick={() => navigate("/")} className="hidden md:flex w-8 h-8 rounded-full hover:bg-muted items-center justify-center" aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Users className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display font-bold leading-tight truncate">{t("Спільнота KLAR", "Сообщество KLAR")}</h1>
          <p className="text-[11px] text-muted-foreground truncate">{t("Загальний чат для всіх учнів", "Общий чат для всех учеников")}</p>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <MessageList
          messages={messages}
          profiles={profiles}
          myId={user?.id}
          isAdmin={isAdmin}
          hasMore={hasMore}
          loadingOlder={loadingOlder}
          emptyText={t("Поки тихо. Напиши першим!", "Пока тихо. Напиши первым!")}
          onLoadOlder={loadOlder}
          onReply={(m) => setReply({ id: m.id, content: m.content, sender: profiles[m.user_id]?.display_name || "—" })}
          onDelete={handleDelete}
          onAuthorClick={setProfileId}
        />
      )}

      <MessageComposer
        placeholder={t("Написати повідомлення…", "Написать сообщение…")}
        reply={reply}
        onCancelReply={() => setReply(null)}
        onSend={handleSend}
        onError={onComposerError}
      />

      <UserProfileDialog
        userId={profileId}
        displayName={profile?.display_name || null}
        avatarUrl={profile?.avatar_url || null}
        totalXp={0}
        open={!!profileId}
        onOpenChange={(o) => { if (!o) setProfileId(null); }}
      />
    </div>
  );
};

export default CommunityChat;
