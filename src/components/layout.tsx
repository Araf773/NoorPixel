import { Link } from "wouter";

function CrescentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 3a9 9 0 1 0 9 9 6.5 6.5 0 0 1-9-9Z"
        stroke="#F0C040"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground dark">
      <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-background/85 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <CrescentIcon />
            <span className="text-xl font-bold tracking-tight text-gradient">NoorPixel</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white transition-colors">
              <span className="pulse-dot" />
              Gallery
            </Link>
            <Link href="/admin" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
              Upload
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative z-10">
        {children}
      </main>

      <footer className="relative z-10 border-t border-white/8 mt-auto">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-white/50">
            <span>© 2026 NoorPixel</span>
            <span>Made with sincerity for the Ummah</span>
            <span>All beauty belongs to Allah</span>
          </div>
          <p className="text-center text-xs text-white/30 mt-3">Free forever · No ads · No tracking</p>
        </div>
      </footer>
    </div>
  );
}
