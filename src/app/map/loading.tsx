import { Loader2 } from "lucide-react";

export default function MapLoading() {
  return (
    <div className="grid h-dvh place-items-center bg-ink-950" role="status">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin text-neon" aria-hidden /> Loading map…
      </div>
    </div>
  );
}
