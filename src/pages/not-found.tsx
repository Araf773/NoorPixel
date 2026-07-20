import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
      <p className="text-8xl font-bold text-gradient mb-4">404</p>
      <h1 className="text-2xl font-semibold text-white mb-2">Page Not Found</h1>
      <p className="text-white/50 max-w-sm mb-8">
        This page wasn't found — but Allah's beauty is everywhere.
      </p>
      <Button className="bg-primary hover:bg-primary/90 text-white px-8 shadow-[0_0_20px_rgba(108,99,255,0.3)]"
        onClick={() => setLocation("/")}>
        Return to Gallery →
      </Button>
    </div>
  );
}
