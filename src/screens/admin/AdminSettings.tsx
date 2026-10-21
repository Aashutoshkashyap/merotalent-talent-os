import { isNeonClientRuntime } from "@/lib/backend-selection";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Shield, 
  Image as ImageIcon,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OperationsPage } from "./OperationsUI";
import { supabase } from "@/integrations/supabase/client";
import { ProviderConfigurationPanel } from "./ProviderConfigurationPanel";
import { invalidateCmsCache } from "@/hooks/useSiteCMS";

const isNeonStaging = isNeonClientRuntime();

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

type ProviderHealthState = "not_configured" | "configured_disabled" | "configured_active" | "storage_unavailable";
interface ProviderHealth {
  status: ProviderHealthState;
  credentialConfigured: boolean;
  integrationEnabled: boolean;
  secretStorageReady: boolean;
  deliveryAvailable: boolean;
}
interface ProviderStatus { payment: ProviderHealth; email: ProviderHealth; ai: ProviderHealth; }

const providerHealthLabel: Record<ProviderHealthState, string> = {
  not_configured: "Not configured",
  configured_disabled: "Configured — disabled",
  configured_active: "Configured — active",
  storage_unavailable: "Secure storage unavailable",
};

const providerHealthDescription = (provider: ProviderHealth | undefined) => {
  if (!provider) return "Checking server configuration…";
  if (provider.status === "storage_unavailable") return "The server cannot safely use provider credentials until secure storage is configured.";
  if (provider.status === "configured_disabled") return "A provider credential is stored, but the integration is intentionally disabled.";
  if (provider.status === "configured_active" && provider.deliveryAvailable) return "Provider adapter is available.";
  if (provider.status === "configured_active") return "A credential is stored and enabled, but no matching provider adapter is available.";
  return "No encrypted provider credential is stored.";
};

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
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      if (isNeonStaging) {
        try {
          const response = await fetch("/api/v1/neon-staging/admin/site-settings",
            { credentials: "same-origin", cache: "no-store" });
          if (!response.ok) throw new Error("Neon site settings are unavailable.");
          const payload = await response.json() as { data?: Array<{ key: string; value: string | null }> };
          const stored = new Map<string, string>((payload.data ?? []).map(row => [row.key, row.value ?? ""]));
          setSiteTitle(stored.get("site_title") || "MeroTalent - National Talent & Education OS");
          setSupportEmail(stored.get("support_email") || "support@merotalent.com");
          setSupportPhone(stored.get("support_phone") || "+977 9801010802");
          setLogoUrl(stored.get("logo_url") || "/logo.png");
          setFaviconUrl(stored.get("favicon_url") || "/favicon.ico");
          setBannerUrl(stored.get("banner_url") || "");
          setMaintenanceMode(stored.get("maintenance_mode") === "true");
        } catch (error) {
          toast({ variant: "destructive", title: "Settings could not be loaded",
            description: error instanceof Error ? error.message : "Please try again." });
        }
        return;
      }
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

  const loadProviderStatus = useCallback(async () => {
    const accessToken = isNeonStaging ? null : (await supabase.auth.getSession()).data.session?.access_token;
    if (!isNeonStaging && !accessToken) return;
    const response = await fetch(`${isNeonStaging ? "/api/v1/neon-staging" : "/api/v1"}/admin/provider-status`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      credentials: "same-origin", cache: "no-store",
    });
    if (!response.ok) return;
    const payload = await response.json() as { data?: ProviderStatus };
    if (payload.data) setProviderStatus(payload.data);
  }, []);

  useEffect(() => {
    void loadProviderStatus();
  }, [loadProviderStatus]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      if (isNeonStaging) {
        const values = { siteTitle, supportEmail, supportPhone, logoUrl, faviconUrl,
          bannerUrl, maintenanceMode };
        const response = await fetch("/api/v1/neon-staging/admin/site-settings", {
          method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(SITE_SETTING_KEYS.map(key => [key, settingValue(key, values)]))),
        });
        if (!response.ok) throw new Error("Neon site settings were not saved.");
        invalidateCmsCache();
        toast({ title: "Settings saved", description: "Branding and support details saved for everyone." });
        return;
      }
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
        description: "Branding and support details saved for everyone.",
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
          <TabsTrigger value="security" className="flex items-center gap-2 text-xs font-bold rounded-xl">
            <Shield className="w-4 h-4" />
            Security & Controls
          </TabsTrigger>
          <TabsTrigger value="providers" className="flex items-center gap-2 text-xs font-bold rounded-xl">
            <Shield className="w-4 h-4" />
            Provider Center
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

        <TabsContent value="providers" className="space-y-4">
          <ProviderConfigurationPanel kind="payment" title="eSewa payment" description="Configure the eSewa merchant secret and non-secret merchant settings. Redirects and return URLs never activate a subscription by themselves." providers={["esewa"]} onSaved={loadProviderStatus} />
          <ProviderConfigurationPanel kind="ai" title="AI provider" description="Enable platform AI drafts for entitled module administrators. Raw keys are encrypted and never returned." providers={["openai-compatible"]} onSaved={loadProviderStatus} />
          <ProviderConfigurationPanel kind="email" title="Transactional email provider" description="Resend is the supported transactional email adapter. Delivery remains unavailable until its credentials and sender address are configured." providers={["resend"]} onSaved={loadProviderStatus} />
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

        {/* Security & Maintenance */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-border/50 rounded-2xl shadow-2xs">
            <CardHeader>
              <CardTitle className="text-base font-bold">Provider readiness</CardTitle>
              <CardDescription className="text-xs">A secret-free server snapshot. Credentials and API keys are never displayed in the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {([
                { name: "Payments", health: providerStatus?.payment },
                { name: "Platform AI", health: providerStatus?.ai },
                { name: "Transactional email", health: providerStatus?.email },
              ] satisfies Array<{ name: string; health?: ProviderHealth }>).map(({ name, health }) => {
                return <div key={String(name)} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-bold text-slate-900">{name}</p><p className={`mt-1 text-xs font-semibold ${health?.deliveryAvailable ? "text-emerald-700" : "text-amber-700"}`}>{health ? providerHealthLabel[health.status] : "Checking server configuration…"}</p><p className="mt-2 text-xs text-slate-500">{providerHealthDescription(health)}</p></div>;
              })}
            </CardContent>
          </Card>
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
