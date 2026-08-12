import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Bell, 
  Shield, 
  Globe,
  Mail,
  Database,
  Server,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { OperationsPage } from "./OperationsUI";

const AdminSettings = () => {
  return (
    <OperationsPage>
      <div>
        <h1 className="text-2xl font-display font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Configure platform-wide settings and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Site content and branding</CardTitle>
              <CardDescription>Public settings are persisted in the Page editor.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="hero" asChild>
                <Link to="/admin/pages">Open Page editor</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Registration policy</CardTitle>
              <CardDescription>Managed by Supabase Auth and protected approval workflows.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Registration remains enabled in the application. College, company, mentor, job, and event approval state is database-enforced; this page does not override those controls.
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Maintenance Mode
              </CardTitle>
              <CardDescription>Temporarily disable access to the platform</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              No maintenance-mode middleware is configured. This control is intentionally unavailable until a server-enforced mode and recovery path are implemented.
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Authentication sessions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Session lifetime, refresh-token rotation, email verification, and OAuth providers are controlled in Supabase Auth. Review them in the target project before UAT.
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                File Upload Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              File type, size, bucket, ownership, and object path are validated by the signed-media APIs and Storage policies. Limits are code and database policy, not browser settings.
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>Email delivery is not connected yet.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              The database queues dashboard and email notifications, but no SMTP or transactional-email worker currently consumes queued email rows.
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>Current database-triggered categories</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              College applications, mentor bookings, job applications, event registrations, approval decisions, payments, and subscription lifecycle events are represented in the central notification model. Delivery acceptance is pending.
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Content Generation
              </CardTitle>
              <CardDescription>Provider credentials are managed only through server-side deployment secrets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                Browser API-key storage is disabled. Content tools currently use local draft templates; connect an authenticated server-side provider route before enabling external AI generation.
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Third-Party Integrations
              </CardTitle>
              <CardDescription>Connect external services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { name: "Supabase Auth", status: "Configured in Supabase", icon: "🔐" },
                { name: "Payment gateway", status: "Not configured", icon: "💳" },
                { name: "Supabase Storage", status: "Policy verification required", icon: "☁️" },
                { name: "Transactional email", status: "Not configured", icon: "📧" },
              ].map((integration) => (
                <div key={integration.name} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.icon}</span>
                    <div>
                      <p className="font-medium">{integration.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {integration.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </OperationsPage>
  );
};

export default AdminSettings;
