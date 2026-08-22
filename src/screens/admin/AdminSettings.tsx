import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Shield, 
  Sparkles,
  Image as ImageIcon,
  Key,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { supabase } from "@/integrations/supabase/client";

/**
 * public.site_settings is a key/value table — key (PK), value, extra_json,
 * updated_at. Every setting is one row, so these keys are the schema contract.
 */
const SITE_SETTING_KEYS = [
  "site_title",
  "support_email",
  "support_phone",
  "logo_url",
  "favicon_url",
  "banner_url",
  "maintenance_mode",
] as const;

type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number];

interface SiteSettingForm {
  siteTitle: string;
  supportEmail: string;
  supportPhone: string;
  logoUrl: string;
  faviconUrl: string;
  bannerUrl: string;
  maintenanceMode: boolean;
}

const settingValue = (key: SiteSettingKey, form: SiteSettingForm): string => {
  switch (key) {
    case "site_title": return form.siteTitle.trim();
    case "support_email": return form.supportEmail.trim();
    case "support_phone": return form.supportPhone.trim();
    case "logo_url": return form.logoUrl.trim();
    case "favicon_url": return form.faviconUrl.trim();
    case "banner_url": return form.bannerUrl.trim();
    case "maintenance_mode": return String(form.maintenanceMode);
  }
};

const AdminSettings = () => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Settings State
  const [siteTitle, setSiteTitle] = useState("MeroTalent - National Talent & Education OS");
  const [supportEmail, setSupportEmail] = useState("support@merotalent.com");
  const [supportPhone, setSupportPhone] = useState("+977 9801010802");
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [faviconUrl, setFaviconUrl] = useState("/favicon.ico");
  const [bannerUrl, setBannerUrl] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiProvider, setAiProvider] = useState("gemini");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    // The AI key is browser-local by design (see handleSaveSettings).
    setAiApiKey(localStorage.getItem("merotalent_ai_api_key") || "");
    setAiProvider(localStorage.getItem("merotalent_ai_provider") || "gemini");

    const loadSettings = async () => {
      const { data, error } = await (supabase as any)
        .from("site_settings")
        .select("key, value")
        .in("key", SITE_SETTING_KEYS as unknown as string[]);

      if (error) {
        toast({
          variant: "destructive",
          title: "Settings could not be loaded",
          description: error.message,
        });
        return;
      }

      const stored = new Map<string, string>(
        (data ?? []).map((row: { key: string; value: string | null }) => [row.key, row.value ?? ""]),
      );
      const pick = (key: SiteSettingKey, fallback: string) => stored.get(key) || fallback;

      setSiteTitle(pick("site_title", "MeroTalent - National Talent & Education OS"));
      setSupportEmail(pick("support_email", "support@merotalent.com"));
      setSupportPhone(pick("support_phone", "+977 9801010802"));
      setLogoUrl(pick("logo_url", "/logo.png"));
      setFaviconUrl(pick("favicon_url", "/favicon.ico"));
      setBannerUrl(pick("banner_url", ""));
      setMaintenanceMode(stored.get("maintenance_mode") === "true");
    };

    void loadSettings();
  }, [toast]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // The AI provider key is deliberately NOT written to site_settings. That
      // table is readable by anon today, so a key stored there would be public.
      // It belongs in a server-side environment variable; until then it stays
      // in this browser only, which the toast below states plainly.
      localStorage.setItem("merotalent_ai_api_key", aiApiKey.trim());
      localStorage.setItem("merotalent_ai_provider", aiProvider);

      const { error } = await (supabase as any).from("site_settings").upsert(
        SITE_SETTING_KEYS.map((key) => ({
          key,
          value: settingValue(key, {
            siteTitle,
            supportEmail,
            supportPhone,
            logoUrl,
            faviconUrl,
            bannerUrl,
            maintenanceMode,
          }),
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "key" },
      );

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: aiApiKey.trim()
          ? "Branding and support details saved for everyone. The AI key is stored in this browser only."
          : "Branding and support details saved for everyone.",
      });
    } catch (saveError: any) {
      toast({
        variant: "destructive",
        title: "Settings could not be saved",
        description: saveError?.message || "The site settings were not written. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <OperationsPage>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#0f172a]">Platform Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage media file uploads, AI content generator API keys, and platform-wide frontend configurations.
          </p>
        </div>

        <Button onClick={handleSaveSettings} disabled={isSaving} className="bg-[#071a3d] hover:bg-[#05132d] text-white font-bold rounded-xl text-xs">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save All Configurations"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-slate-100 p-1 rounded-2xl">
          <TabsTrigger value="general" className="flex items-center gap-2 text-xs font-bold rounded-xl">
            <Settings className="w-4 h-4" />
            General Branding
          </TabsTrigger>
          <TabsTrigger value="media" className="flex items-center gap-2 text-xs font-bold rounded-xl">
            <ImageIcon className="w-4 h-4" />
            Media Uploads
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2 text-xs font-bold rounded-xl">
            <Sparkles className="w-4 h-4 text-amber-500" />
            AI API Keys
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 text-xs font-bold rounded-xl">
            <Shield className="w-4 h-4" />
            Security & Controls
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border-border/50 rounded-2xl shadow-2xs">
            <CardHeader>
              <CardTitle className="text-base font-bold">Site Branding & Contact Settings</CardTitle>
              <CardDescription className="text-xs">
                Configure your main site title, header branding, and support contact details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Platform Site Title</Label>
                <Input
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Official Support Email</Label>
                  <Input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Support Helpline Number</Label>
                  <Input
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Uploads */}
        <TabsContent value="media" className="space-y-6">
          <Card className="border-border/50 rounded-2xl shadow-2xs">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#0073e6]" />
                Media Assets & Logos Configuration
              </CardTitle>
              <CardDescription className="text-xs">
                Upload or paste image URLs for platform branding assets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Header Site Logo URL</Label>
                <Input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... or /logo.png"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Favicon Icon URL</Label>
                <Input
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="/favicon.ico"
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Hero Promo Banner Image URL</Label>
                <Input
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... or Supabase storage link"
                  className="rounded-xl text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI API Keys */}
        <TabsContent value="ai" className="space-y-6">
          <Card className="border-border/50 rounded-2xl shadow-2xs">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                AI API Key Integration
              </CardTitle>
              <CardDescription className="text-xs">
                Provide your Gemini / OpenAI API key to enable instant AI description creation across all modules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">AI Model Provider</Label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full h-10 text-xs rounded-xl border border-slate-200 px-3 bg-white font-semibold"
                >
                  <option value="gemini">Google Gemini 1.5 / 2.0 Flash</option>
                  <option value="openai">OpenAI GPT-4o Mini</option>
                  <option value="anthropic">Anthropic Claude Sonnet</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">API Key Secret *</Label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="AIzaSy... or sk-proj-..."
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    className="pl-10 h-10 text-xs rounded-xl font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security & Maintenance */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-border/50 rounded-2xl shadow-2xs">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                Maintenance Mode Controls
              </CardTitle>
              <CardDescription className="text-xs">
                Toggle maintenance mode for public platform routes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-sm font-bold text-slate-900">Maintenance Mode</p>
                  <p className="text-xs text-slate-500">Temporarily show maintenance notice to non-admin visitors.</p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </OperationsPage>
  );
};

export default AdminSettings;
