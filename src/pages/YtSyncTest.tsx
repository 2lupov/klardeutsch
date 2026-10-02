import SyncedYouTube from "@/components/live/SyncedYouTube";
export default function YtSyncTest() {
  const role = new URLSearchParams(location.search).get("role") === "student" ? "student" : "teacher";
  return <div style={{ width: 640, height: 360 }}><SyncedYouTube classId="yt-test-1" videoId="M7lc1UVf-VE" role={role} /></div>;
}
