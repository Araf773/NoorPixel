import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useGetWallpaper, useIncrementDownloads, getGetWallpaperQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Download, ArrowLeft, FlipHorizontal, FlipVertical, RotateCcw, RotateCw, Wand2, Settings2, Crop } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

import abstract1 from "@assets/wallpapers/abstract_1.png";
import architecture1 from "@assets/wallpapers/architecture_1.png";
import minimal1 from "@assets/wallpapers/minimal_1.png";
import space1 from "@assets/wallpapers/space_1.png";
import nature1 from "@assets/wallpapers/nature_1.png";
import abstract2 from "@assets/wallpapers/abstract_2.png";
import nature2 from "@assets/wallpapers/nature_2.png";
import abstract3 from "@assets/wallpapers/abstract_3.png";

const PLACEHOLDERS: Record<string, any> = {
  "p1": { id: "p1", name: "Dark Abstract Geometry", category: "Geometric Art", resolution: "3840x2160", viewUrl: abstract1 },
  "p2": { id: "p2", name: "Neon City Architecture", category: "Masjids", resolution: "3840x2160", viewUrl: architecture1 },
  "p3": { id: "p3", name: "Minimalist Moon Eclipse", category: "Nature", resolution: "3840x2160", viewUrl: minimal1 },
  "p4": { id: "p4", name: "Deep Space Nebula", category: "Nature", resolution: "3840x2160", viewUrl: space1 },
  "p5": { id: "p5", name: "Dark Foggy Forest", category: "Nature", resolution: "3840x2160", viewUrl: nature1 },
  "p6": { id: "p6", name: "Liquid Metal", category: "Geometric Art", resolution: "3840x2160", viewUrl: abstract2 },
  "p7": { id: "p7", name: "Minimalist Mountains", category: "Nature", resolution: "3840x2160", viewUrl: nature2 },
  "p8": { id: "p8", name: "Glowing Fractal Waves", category: "Geometric Art", resolution: "3840x2160", viewUrl: abstract3 },
};

const HADITHS = [
  { text: "Allah is Beautiful and loves beauty.", source: "Sahih Muslim 91" },
  { text: "The best among you is the one who learns the Quran and teaches it.", source: "Sahih Bukhari 5027" },
  { text: "Fear Allah wherever you are.", source: "Tirmidhi 1987" },
  { text: "Actions are judged by intentions.", source: "Sahih Bukhari 1" },
  { text: "Your smile to your brother is charity.", source: "Tirmidhi 1956" },
  { text: "The most beloved deeds to Allah are the most consistent, even if small.", source: "Sahih Bukhari 6464" },
  { text: "Do not belittle any act of kindness.", source: "Sahih Muslim 2626" },
  { text: "Seeking knowledge is an obligation upon every Muslim.", source: "Ibn Majah 224" },
  { text: "Patience is a light.", source: "Sahih Muslim 223" },
  { text: "With hardship comes ease.", source: "Quran 94:6" },
  { text: "My Lord, increase me in knowledge.", source: "Quran 20:114" },
];

type Adjustments = {
  brightness: number; contrast: number; saturation: number;
  hueRotate: number; blur: number; exposure: number;
  temperature: number; vignette: number;
};

const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100, contrast: 100, saturation: 100,
  hueRotate: 0, blur: 0, exposure: 100,
  temperature: 100, vignette: 0,
};

const PRESETS = [
  { name: "Original",   settings: { ...DEFAULT_ADJUSTMENTS } },
  { name: "Cinematic",  settings: { ...DEFAULT_ADJUSTMENTS, contrast: 120, saturation: 90, temperature: 90 } },
  { name: "Noir",       settings: { ...DEFAULT_ADJUSTMENTS, saturation: 0, contrast: 130 } },
  { name: "Neon Glow",  settings: { ...DEFAULT_ADJUSTMENTS, saturation: 150, brightness: 110, hueRotate: 30 } },
  { name: "Faded",      settings: { ...DEFAULT_ADJUSTMENTS, contrast: 80, brightness: 110, saturation: 80 } },
  { name: "Cool Blue",  settings: { ...DEFAULT_ADJUSTMENTS, temperature: 80, hueRotate: 180 } },
];

export default function Editor() {
  const params = useParams();
  const id = params.id as string;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isPlaceholder = id?.startsWith("p");
  const { data: serverWp, isLoading } = useGetWallpaper(id, {
    query: { enabled: !!id && !isPlaceholder, queryKey: getGetWallpaperQueryKey(id) },
  });
  const incrementDownloads = useIncrementDownloads();
  const wallpaper = isPlaceholder ? PLACEHOLDERS[id] : serverWp;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [adjustments, setAdjustments] = useState<Adjustments>(DEFAULT_ADJUSTMENTS);
  const [transform, setTransform] = useState({ flipH: false, flipV: false, rotate: 0 });
  const [watermark, setWatermark] = useState(false);
  const [format, setFormat] = useState("image/png");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [thankYouHadith] = useState(() => HADITHS[Math.floor(Math.random() * HADITHS.length)]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!wallpaper?.viewUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imageRef.current = img; renderCanvas(); };
    img.src = wallpaper.viewUrl;
  }, [wallpaper]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const isRotated = transform.rotate % 180 !== 0;
    canvas.width  = isRotated ? img.naturalHeight : img.naturalWidth;
    canvas.height = isRotated ? img.naturalWidth  : img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((transform.rotate * Math.PI) / 180);
    ctx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }, [transform]);

  useEffect(() => { renderCanvas(); }, [renderCanvas]);

  const getCssFilter = () => {
    const { brightness, contrast, saturation, hueRotate, blur } = adjustments;
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hueRotate}deg) blur(${blur}px)`;
  };

  const handleDownload = async () => {
    if (!canvasRef.current || !imageRef.current || !wallpaper) return;
    setIsProcessing(true);
    try {
      const exportCanvas = document.createElement("canvas");
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not get 2d context");
      const img = imageRef.current;
      const isRotated = transform.rotate % 180 !== 0;
      exportCanvas.width  = isRotated ? img.naturalHeight : img.naturalWidth;
      exportCanvas.height = isRotated ? img.naturalWidth  : img.naturalHeight;

      ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%) hue-rotate(${adjustments.hueRotate}deg) blur(${adjustments.blur}px)`;
      ctx.translate(exportCanvas.width / 2, exportCanvas.height / 2);
      ctx.rotate((transform.rotate * Math.PI) / 180);
      ctx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.filter = "none";

      // Exposure + temperature pixel pass
      if (adjustments.exposure !== 100 || adjustments.temperature !== 100) {
        const imageData = ctx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
        const data = imageData.data;
        const expFactor = adjustments.exposure / 100;
        const rFactor = adjustments.temperature > 100 ? 1 + ((adjustments.temperature - 100) / 100) : 1;
        const bFactor = adjustments.temperature < 100 ? 1 + ((100 - adjustments.temperature) / 100) : 1;
        for (let i = 0; i < data.length; i += 4) {
          data[i]   = Math.min(255, data[i]   * expFactor * rFactor);
          data[i+1] = Math.min(255, data[i+1] * expFactor);
          data[i+2] = Math.min(255, data[i+2] * expFactor * bFactor);
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // Vignette
      if (adjustments.vignette > 0) {
        const gradient = ctx.createRadialGradient(
          exportCanvas.width / 2, exportCanvas.height / 2, exportCanvas.width * 0.3,
          exportCanvas.width / 2, exportCanvas.height / 2, exportCanvas.width * 0.7
        );
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(1, `rgba(0,0,0,${(adjustments.vignette / 100) * 0.85})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      }

      // Watermark
      if (watermark) {
        ctx.font = "bold 18px Inter, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.textAlign = "right";
        ctx.fillText("NoorPixel", exportCanvas.width - 16, exportCanvas.height - 16);
      }

      exportCanvas.toBlob(async (blob) => {
        if (!blob) throw new Error("Could not generate blob");
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = format.split("/")[1];
        a.download = `${wallpaper.name.replace(/\s+/g, "_")}_NoorPixel.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (!isPlaceholder) await incrementDownloads.mutateAsync({ id: wallpaper.id });
        setIsProcessing(false);
        setShowThankYou(true);
      }, format, 1.0);
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
      setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!wallpaper) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-white">Wallpaper not found</h2>
        <Button variant="link" className="text-primary mt-4" onClick={() => setLocation("/")}>Return to Gallery</Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col h-[calc(100dvh-4rem)] overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b border-white/8 flex items-center justify-between px-4 bg-background/95 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight leading-none">
                ☽ {wallpaper.name}
              </h2>
              <p className="text-xs text-white/50">{wallpaper.resolution} · {wallpaper.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="w-[100px] h-9 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image/png">PNG</SelectItem>
                <SelectItem value="image/jpeg">JPEG</SelectItem>
                <SelectItem value="image/webp">WEBP</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="bg-primary hover:bg-primary/90 text-white shadow-[0_0_14px_rgba(108,99,255,0.3)] gap-2 h-9 px-5"
              onClick={handleDownload}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Free
            </Button>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 bg-black/50 relative overflow-hidden flex items-center justify-center p-8">
            <div className="relative max-w-full max-h-full rounded-xl overflow-hidden shadow-2xl border border-white/10">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain"
                style={{ filter: getCssFilter() }}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-card border-l border-white/8 flex flex-col shrink-0">
            <Tabs defaultValue="adjust" className="flex-1 flex flex-col w-full">
              <TabsList className="w-full justify-start h-12 rounded-none border-b border-white/8 bg-transparent p-0">
                <TabsTrigger value="adjust" className="flex-1 rounded-none data-[state=active]:bg-white/5 data-[state=active]:border-b-2 data-[state=active]:border-primary h-full text-xs">
                  <Settings2 className="h-4 w-4 mr-1.5" /> Adjust
                </TabsTrigger>
                <TabsTrigger value="filters" className="flex-1 rounded-none data-[state=active]:bg-white/5 data-[state=active]:border-b-2 data-[state=active]:border-primary h-full text-xs">
                  <Wand2 className="h-4 w-4 mr-1.5" /> Filters
                </TabsTrigger>
                <TabsTrigger value="transform" className="flex-1 rounded-none data-[state=active]:bg-white/5 data-[state=active]:border-b-2 data-[state=active]:border-primary h-full text-xs">
                  <Crop className="h-4 w-4 mr-1.5" /> Transform
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <div className="p-5 space-y-6">

                  <TabsContent value="adjust" className="m-0 space-y-5">
                    {([
                      ["Brightness", "brightness", 0, 200, 1],
                      ["Contrast",   "contrast",   0, 200, 1],
                      ["Saturation", "saturation", 0, 200, 1],
                      ["Exposure",   "exposure",   0, 200, 1],
                      ["Temperature","temperature",0, 200, 1],
                      ["Hue",        "hueRotate",  0, 360, 1],
                      ["Blur",       "blur",        0,  20, 0.5],
                      ["Vignette",   "vignette",    0, 100, 1],
                    ] as [string, keyof Adjustments, number, number, number][]).map(([label, key, min, max, step]) => (
                      <div key={key} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-medium text-white/70">{label}</label>
                          <span className="text-xs text-white/40">
                            {key === "hueRotate" ? `${adjustments[key]}°` :
                             key === "blur" ? `${adjustments[key]}px` :
                             key === "temperature" ? `${adjustments[key] > 100 ? "+" : ""}${adjustments[key] - 100}` :
                             `${adjustments[key]}%`}
                          </span>
                        </div>
                        <Slider min={min} max={max} step={step} value={[adjustments[key]]}
                          onValueChange={([v]) => setAdjustments(p => ({ ...p, [key]: v }))} />
                      </div>
                    ))}
                    <Button variant="outline" className="w-full border-white/10 text-white/60 hover:bg-white/5 hover:text-white text-xs mt-2"
                      onClick={() => setAdjustments(DEFAULT_ADJUSTMENTS)}>
                      Reset Adjustments
                    </Button>
                  </TabsContent>

                  <TabsContent value="filters" className="m-0">
                    <div className="grid grid-cols-2 gap-3">
                      {PRESETS.map(preset => (
                        <Button key={preset.name} variant="outline"
                          className="h-16 flex flex-col items-center justify-center gap-1 border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 text-white transition-all text-xs"
                          onClick={() => setAdjustments(preset.settings)}>
                          {preset.name}
                        </Button>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="transform" className="m-0 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="h-14 border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs"
                        onClick={() => setTransform(p => ({ ...p, flipH: !p.flipH }))}>
                        <FlipHorizontal className="h-4 w-4 mr-1.5" /> Flip H
                      </Button>
                      <Button variant="outline" className="h-14 border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs"
                        onClick={() => setTransform(p => ({ ...p, flipV: !p.flipV }))}>
                        <FlipVertical className="h-4 w-4 mr-1.5" /> Flip V
                      </Button>
                      <Button variant="outline" className="h-14 border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs"
                        onClick={() => setTransform(p => ({ ...p, rotate: p.rotate - 90 }))}>
                        <RotateCcw className="h-4 w-4 mr-1.5" /> Rot -90°
                      </Button>
                      <Button variant="outline" className="h-14 border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs"
                        onClick={() => setTransform(p => ({ ...p, rotate: p.rotate + 90 }))}>
                        <RotateCw className="h-4 w-4 mr-1.5" /> Rot +90°
                      </Button>
                    </div>

                    <div className="flex items-center justify-between py-3 px-1 border border-white/8 rounded-xl">
                      <Label htmlFor="watermark" className="text-xs text-white/70 cursor-pointer">NoorPixel Watermark</Label>
                      <Switch id="watermark" checked={watermark} onCheckedChange={setWatermark} />
                    </div>

                    <Button variant="outline" className="w-full border-white/10 text-white/60 hover:bg-white/5 hover:text-white text-xs"
                      onClick={() => setTransform({ flipH: false, flipV: false, rotate: 0 })}>
                      Reset Transform
                    </Button>
                  </TabsContent>

                </div>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </div>

      {/* JazakAllah Khair modal */}
      <Dialog open={showThankYou} onOpenChange={setShowThankYou}>
        <DialogContent className="max-w-md bg-card border-0 p-0 overflow-hidden"
          style={{ borderTop: "3px solid hsl(var(--primary))", boxShadow: "0 0 40px rgba(108,99,255,0.2)" }}>
          <div className="p-7 space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gradient">JazakAllah Khair</h2>
              <p className="text-white/60 text-sm mt-1">May this wallpaper bring you peace and reflection.</p>
            </div>
            <div className="h-px bg-white/8" />
            <div className="bg-white/3 rounded-xl p-4">
              <p className="text-sm italic text-white/70">"{thankYouHadith.text}"</p>
              <p className="text-xs text-white/40 mt-2">— {thankYouHadith.source}</p>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1 border-white/10 text-white/70 hover:bg-white/5 text-sm" onClick={handleShare}>
                {copied ? "Link Copied! ✓" : "Share with a Friend"}
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90 text-white text-sm" onClick={() => { setShowThankYou(false); setLocation("/"); }}>
                Back to Gallery
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
