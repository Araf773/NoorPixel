import { useMemo, useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useListWallpapers, useListCategories, useIncrementDownloads, getListWallpapersQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, Edit2, ImageIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import abstract1 from "@assets/wallpapers/abstract_1.png";
import architecture1 from "@assets/wallpapers/architecture_1.png";
import minimal1 from "@assets/wallpapers/minimal_1.png";
import space1 from "@assets/wallpapers/space_1.png";
import nature1 from "@assets/wallpapers/nature_1.png";
import abstract2 from "@assets/wallpapers/abstract_2.png";
import nature2 from "@assets/wallpapers/nature_2.png";
import abstract3 from "@assets/wallpapers/abstract_3.png";

const HADITHS = [
  { text: "Allah is Beautiful and loves beauty.", source: "Sahih Muslim 91" },
  { text: "The best among you is the one who learns the Quran and teaches it.", source: "Sahih Bukhari 5027" },
  { text: "Fear Allah wherever you are.", source: "Tirmidhi 1987" },
  { text: "Actions are judged by intentions.", source: "Sahih Bukhari 1" },
  { text: "A Muslim is one from whose tongue and hand other Muslims are safe.", source: "Sahih Bukhari 10" },
  { text: "Your smile to your brother is charity.", source: "Tirmidhi 1956" },
  { text: "The most beloved deeds to Allah are the most consistent, even if small.", source: "Sahih Bukhari 6464" },
  { text: "Do not belittle any act of kindness.", source: "Sahih Muslim 2626" },
  { text: "Seeking knowledge is an obligation upon every Muslim.", source: "Ibn Majah 224" },
  { text: "Patience is a light.", source: "Sahih Muslim 223" },
  { text: "With hardship comes ease.", source: "Quran 94:6" },
  { text: "Whoever relies upon Allah, He will be sufficient for him.", source: "Quran 65:3" },
  { text: "Speak good or remain silent.", source: "Sahih Bukhari 6018" },
  { text: "This world is temporary; act for what is eternal.", source: "Sahih Muslim 2956" },
  { text: "My Lord, increase me in knowledge.", source: "Quran 20:114" },
];

const DHIKR = [
  "MashaAllah — what beauty He created",
  "SubhanAllah — glory be to Allah",
  "Allahu Akbar — Allah is the Greatest",
];

const PLACEHOLDERS = [
  { id: "p1", name: "Dark Abstract Geometry", category: "Geometric Art", resolution: "3840x2160", thumbnailUrl: abstract1, viewUrl: abstract1, downloads: 1240 },
  { id: "p2", name: "Neon City Architecture", category: "Masjids", resolution: "3840x2160", thumbnailUrl: architecture1, viewUrl: architecture1, downloads: 852 },
  { id: "p3", name: "Minimalist Moon Eclipse", category: "Nature", resolution: "3840x2160", thumbnailUrl: minimal1, viewUrl: minimal1, downloads: 2105 },
  { id: "p4", name: "Deep Space Nebula", category: "Nature", resolution: "3840x2160", thumbnailUrl: space1, viewUrl: space1, downloads: 4120 },
  { id: "p5", name: "Dark Foggy Forest", category: "Nature", resolution: "3840x2160", thumbnailUrl: nature1, viewUrl: nature1, downloads: 934 },
  { id: "p6", name: "Liquid Metal", category: "Geometric Art", resolution: "3840x2160", thumbnailUrl: abstract2, viewUrl: abstract2, downloads: 1560 },
  { id: "p7", name: "Minimalist Mountains", category: "Nature", resolution: "3840x2160", thumbnailUrl: nature2, viewUrl: nature2, downloads: 3012 },
  { id: "p8", name: "Glowing Fractal Waves", category: "Geometric Art", resolution: "3840x2160", thumbnailUrl: abstract3, viewUrl: abstract3, downloads: 1845 },
];

const CATEGORIES = ["All", "Calligraphy", "Masjids", "99 Names", "Quran Verses", "Duas & Adhkar", "Geometric Art", "Nature", "Ramadan", "Eid"];

function HadithStrip() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * HADITHS.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % HADITHS.length);
        setVisible(true);
      }, 400);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const h = HADITHS[idx];

  return (
    <div className="max-w-xl mx-auto mt-6">
      <div
        className="hadith-fade border-l-2 border-primary/70 pl-4 py-2 bg-white/3 rounded-r-lg"
        key={idx}
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease" }}
      >
        <p className="text-sm italic text-white/75">"{h.text}"</p>
        <p className="text-xs text-white/40 mt-1">— {h.source}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [overlayCardId, setOverlayCardId] = useState<string | null>(null);
  const [overlayText, setOverlayText] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: wpData, isLoading } = useListWallpapers({
    category: activeCategory !== "All" ? activeCategory : undefined,
    search: search || undefined,
  });

  const incrementDownloads = useIncrementDownloads();

  const handleCardClick = (wp: any) => {
    const phrase = DHIKR[Math.floor(Math.random() * DHIKR.length)];
    setOverlayText(phrase);
    setOverlayCardId(wp.id);
    setTimeout(() => {
      setOverlayCardId(null);
      setLocation(`/wallpaper/${wp.id}`);
    }, 1500);
  };

  const handleDownload = async (wp: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await incrementDownloads.mutateAsync({ id: wp.id });
      window.open(wp.viewUrl, "_blank");
      queryClient.invalidateQueries({ queryKey: getListWallpapersQueryKey() });
    } catch (err) {
      console.error(err);
    }
  };

  const wallpapers = useMemo(() => {
    if (wpData && wpData.wallpapers.length > 0) return wpData.wallpapers;
    let items = PLACEHOLDERS;
    if (activeCategory !== "All") items = items.filter(i => i.category === activeCategory);
    if (search) items = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    return items;
  }, [wpData, activeCategory, search]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4 flex-shrink-0 hero-radial">
        <div className="container mx-auto relative z-10 text-center space-y-6 max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
            Wallpapers That Reflect{" "}
            <span className="text-gradient">His Creation</span>
          </h1>
          <p className="text-lg md:text-xl text-white/60">
            Free high-resolution Islamic art, masjid photography, calligraphy, and nature wallpapers — for the Ummah, by the Ummah.
          </p>
          <div className="relative max-w-xl mx-auto mt-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 h-5 w-5" />
            <Input
              placeholder="Search themes, artists, collections..."
              className="w-full pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-2xl focus-visible:ring-primary/50 text-lg"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <HadithStrip />
        </div>
      </section>

      {/* Gallery */}
      <section className="container mx-auto px-4 pb-24 flex-1">
        {/* Category pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-6 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "secondary"}
              className={`rounded-full whitespace-nowrap px-5 transition-all duration-300 ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(108,99,255,0.4)]"
                  : "bg-transparent border border-white/10 text-white/70 hover:border-primary/50 hover:text-white"
              }`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 mt-6">
            {[1,2,3,4,5,6].map(i => (
              <Skeleton key={i} className="w-full aspect-[4/3] rounded-3xl bg-white/5" />
            ))}
          </div>
        ) : wallpapers.length > 0 ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 mt-6">
            {wallpapers.map((wp: any) => (
              <div
                key={wp.id}
                className="group block relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 break-inside-avoid cursor-pointer hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_0_1px_rgba(108,99,255,0.3),0_8px_32px_rgba(108,99,255,0.12)]"
                onClick={() => handleCardClick(wp)}
              >
                <div className="aspect-[16/9] md:aspect-auto">
                  <img
                    src={wp.thumbnailUrl}
                    alt={wp.name}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* dhikr overlay */}
                {overlayCardId === wp.id && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-3xl z-20">
                    <p className="text-white italic text-center text-sm px-4 font-medium">{overlayText}</p>
                  </div>
                )}

                {/* hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                  <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-white font-semibold text-base line-clamp-1">{wp.name}</h3>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant="outline" className="bg-primary/15 border-primary/30 text-white/80 backdrop-blur-md text-xs">
                        {wp.resolution}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md"
                          onClick={e => { e.stopPropagation(); handleCardClick(wp); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 text-white shadow-[0_0_14px_rgba(108,99,255,0.5)]"
                          onClick={e => handleDownload(wp, e)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-white/40">
            <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-white/60">No wallpapers found</h3>
            <p className="mt-2 text-sm">No wallpapers found — more beauty coming soon, inshAllah</p>
          </div>
        )}
      </section>
    </div>
  );
}
