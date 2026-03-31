import type { Lang } from "@/i18n/translations";

interface Props {
  name: string | null;
  avatar: string | null;
  bio: string | null;
  lang: Lang;
}

const InstructorCard = ({ name, avatar, bio, lang }: Props) => {
  if (!name) {
    return (
      <p className="text-sm text-muted-foreground">
        {lang === "uk" ? "Інформація про викладача скоро з'явиться" : "Информация о преподавателе скоро появится"}
      </p>
    );
  }

  return (
    <div className="flex items-start gap-4 p-5 rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm">
      {avatar ? (
        <img src={avatar} alt={name} className="w-16 h-16 rounded-xl object-cover" />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
          {name[0]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-bold text-base text-foreground">{name}</h3>
        {bio && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{bio}</p>}
      </div>
    </div>
  );
};

export default InstructorCard;
