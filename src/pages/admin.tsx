import { useEffect, useState } from "react";
import { useGetMe, useUploadWallpaper, useLogout, useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, LogOut, Loader2, Image as ImageIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Admin() {
  const { data: user, isLoading: isUserLoading } = useGetMe({ query: { retry: false } });
  const uploadMutation = useUploadWallpaper();
  const logoutMutation = useLogout();
  const loginMutation = useLogin();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Nature");
  const [tags, setTags] = useState("");
  const [occasion, setOccasion] = useState("None");
  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreview(null);
    }
  }, [file]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    try {
      await loginMutation.mutateAsync({ token: tokenInput.trim() });
      setTokenInput("");
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.message || "Invalid admin token", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name || !category) {
      toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    try {
      await uploadMutation.mutateAsync({ data: { file, name, category, tags: tags || undefined } });
      toast({ title: "Shared with the Ummah", description: "Uploaded successfully — JazakAllah Khair" });
      setFile(null); setName(""); setTags(""); setOccasion("None");
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Upload failed", variant: "destructive" });
    }
  };

  if (isUserLoading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-white/8 backdrop-blur-xl text-center space-y-6"
          style={{ boxShadow: "0 0 40px rgba(108,99,255,0.12)" }}>
          <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <UploadCloud className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Content Portal</h1>
            <p className="text-white/50 text-sm">Enter the admin token to upload wallpapers for the global Muslim community</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder="Admin token"
              className="bg-black/40 border-white/10 text-white placeholder:text-white/30 h-12 text-center"
              autoFocus
            />
            <Button
              type="submit"
              disabled={loginMutation.isPending || !tokenInput.trim()}
              className="w-full bg-primary text-white hover:bg-primary/90 h-12 rounded-xl text-base font-semibold shadow-[0_0_20px_rgba(108,99,255,0.3)]"
            >
              {loginMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Content Portal</h1>
            <p className="text-white/50 mt-1 text-sm">Share beautiful content with the Ummah</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user.picture ? (
                <img src={user.picture} alt={user.name || "User"} className="h-10 w-10 rounded-full border border-white/20" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-white font-bold">
                  {user.email.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden md:block text-sm">
                <p className="text-white font-medium">{user.name}</p>
                <p className="text-white/40 text-xs">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={handleLogout} className="border-white/10 bg-white/5 text-white hover:bg-white/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Drop zone */}
          <div className="space-y-3">
            <Label className="text-white/70 text-sm">Image File</Label>
            <label className="relative flex flex-col items-center justify-center w-full h-80 rounded-3xl border-2 border-dashed border-white/15 bg-white/3 hover:bg-white/5 hover:border-primary/40 transition-colors cursor-pointer overflow-hidden group">
              {preview ? (
                <>
                  <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white font-medium text-sm">Click to change</p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  <ImageIcon className="w-10 h-10 text-white/30 mb-3" />
                  <p className="mb-1 text-sm text-white/70"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-white/40">PNG, JPG or WEBP (MAX. 50MB)</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp"
                onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
            </label>
          </div>

          {/* Fields */}
          <div className="space-y-5 bg-card border border-white/8 p-6 rounded-3xl">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white/70 text-sm">Title</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)}
                className="bg-black/40 border-white/10 text-white placeholder:text-white/30"
                placeholder="e.g. Masjid al-Nabawi at Fajr" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-white/70 text-sm">Category</Label>
              <select id="category"
                className="flex h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={category} onChange={e => setCategory(e.target.value)} required>
                {["Calligraphy","Masjids","99 Names","Quran Verses","Duas & Adhkar","Geometric Art","Nature","Ramadan","Eid"].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-white/70 text-sm">Tags (comma separated)</Label>
              <Input id="tags" value={tags} onChange={e => setTags(e.target.value)}
                className="bg-black/40 border-white/10 text-white placeholder:text-white/30"
                placeholder="e.g. masjid, night, 4K" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="occasion" className="text-white/70 text-sm">Islamic Occasion (optional)</Label>
              <select id="occasion"
                className="flex h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={occasion} onChange={e => setOccasion(e.target.value)}>
                {["None","Ramadan","Eid al-Fitr","Eid al-Adha","Jumuah","General"].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <Button type="submit"
              className="w-full h-12 rounded-xl bg-primary text-white text-base font-semibold hover:bg-primary/90 mt-2 shadow-[0_0_20px_rgba(108,99,255,0.3)]"
              disabled={uploadMutation.isPending || !file || !name}>
              {uploadMutation.isPending ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Uploading...</>
              ) : "Share with the Ummah"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
