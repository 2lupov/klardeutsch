import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { GermanA2Course } from "@/features/german-a2";
import { createSupabaseProgressStore } from "@/features/german-a2/supabaseProgressStore";

const CourseA2 = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const store = useMemo(() => (user ? createSupabaseProgressStore(user.id) : undefined), [user?.id]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <button onClick={() => navigate("/academy")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Академія
        </button>
      </div>
      {store && <GermanA2Course store={store} className="mx-auto max-w-6xl p-4" />}
    </div>
  );
};

export default CourseA2;
