
import { Loader2 } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex h-screen">
      <div className="flex-1 p-8">
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
