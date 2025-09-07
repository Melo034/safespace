import { useEffect, useState } from "react";

export default function ReadingProgress({ target }: { target?: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = target ? (document.querySelector(target) as HTMLElement | null) : document.documentElement;
    const onScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const offsetTop = target && el ? el.offsetTop : 0;
      const height = (target && el ? el.scrollHeight : document.documentElement.scrollHeight) - window.innerHeight;
      const pct = Math.max(0, Math.min(1, (scrollTop - offsetTop) / Math.max(1, height - offsetTop)));
      setProgress(pct * 100);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [target]);

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1.5 bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-primary via-accent to-primary/70 transition-[width] duration-200"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
