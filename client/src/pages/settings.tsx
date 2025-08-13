import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Save, 
  User, 
  Bell, 
  Database, 
  Shield, 
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Palette,
  Sun,
  Moon,
  Monitor
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/theme-context";

export default function Settings() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    // User Preferences
    defaultInspector: "John Smith",
    defaultSurveyType: "asbestos",
    enableGPSByDefault: true,
    requirePhotosDefault: false,
    autoSaveInterval: 5,
    
    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    surveyReminders: true,
    reportReadyAlerts: true,
    
    // Data & Privacy
    retentionPeriod: 365,
    anonymizeData: false,
    shareAnalytics: true,
  });

  const handleSave = () => {
    // In a real app, this would save to the backend
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const handleExportData = () => {
    toast({
      title: "Export started",
      description: "Your data export is being prepared. You'll receive an email when ready.",
    });
  };

  const handleImportData = () => {
    toast({
      title: "Import feature",
      description: "Data import functionality will be available in a future update.",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="settings-title">Settings</h1>
        <Button onClick={handleSave} data-testid="button-save-settings">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="h-5 w-5 mr-2" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the visual theme of the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme preference</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-48" data-testid="select-theme">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center">
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center">
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center">
                    <Monitor className="h-4 w-4 mr-2" />
                    System
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              Choose your preferred color scheme or use system settings
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            User Preferences
          </CardTitle>
          <CardDescription>
            Default settings for new surveys and inspections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultInspector">Default Inspector Name</Label>
              <Input
                id="defaultInspector"
                value={settings.defaultInspector}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultInspector: e.target.value }))}
                data-testid="input-default-inspector"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultSurveyType">Default Survey Type</Label>
              <select
                id="defaultSurveyType"
                value={settings.defaultSurveyType}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultSurveyType: e.target.value }))}
                className="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md"
                data-testid="select-default-survey-type"
              >
                <option value="asbestos">Asbestos Survey</option>
                <option value="lead">Lead Survey</option>
                <option value="cadmium">Cadmium Survey</option>
                <option value="asbestos-lead">Asbestos + Lead</option>
                <option value="asbestos-cadmium">Asbestos + Cadmium</option>
                <option value="lead-cadmium">Lead + Cadmium</option>
                <option value="asbestos-lead-cadmium">All Three (Asbestos + Lead + Cadmium)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable GPS by default</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically collect location data for new observations
                </div>
              </div>
              <Switch
                checked={settings.enableGPSByDefault}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableGPSByDefault: checked }))}
                data-testid="switch-enable-gps"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require photos by default</Label>
                <div className="text-sm text-muted-foreground">
                  Make photo documentation mandatory for new surveys
                </div>
              </div>
              <Switch
                checked={settings.requirePhotosDefault}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, requirePhotosDefault: checked }))}
                data-testid="switch-require-photos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="autoSaveInterval">Auto-save interval (minutes)</Label>
              <Input
                id="autoSaveInterval"
                type="number"
                min="1"
                max="30"
                value={settings.autoSaveInterval}
                onChange={(e) => setSettings(prev => ({ ...prev, autoSaveInterval: parseInt(e.target.value) || 5 }))}
                className="w-32"
                data-testid="input-autosave-interval"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
          </CardTitle>
          <CardDescription>
            Manage how you receive updates and alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email notifications</Label>
              <div className="text-sm text-muted-foreground">
                Receive important updates via email
              </div>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailNotifications: checked }))}
              data-testid="switch-email-notifications"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Push notifications</Label>
              <div className="text-sm text-muted-foreground">
                Browser notifications for real-time updates
              </div>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, pushNotifications: checked }))}
              data-testid="switch-push-notifications"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Survey reminders</Label>
              <div className="text-sm text-muted-foreground">
                Reminders for incomplete surveys and follow-ups
              </div>
            </div>
            <Switch
              checked={settings.surveyReminders}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, surveyReminders: checked }))}
              data-testid="switch-survey-reminders"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Report ready alerts</Label>
              <div className="text-sm text-muted-foreground">
                Notifications when reports are ready for review
              </div>
            </div>
            <Switch
              checked={settings.reportReadyAlerts}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, reportReadyAlerts: checked }))}
              data-testid="switch-report-alerts"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Data Management
          </CardTitle>
          <CardDescription>
            Import, export, and manage your survey data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" onClick={handleExportData} data-testid="button-export-data">
              <Download className="h-4 w-4 mr-2" />
              Export All Data
            </Button>
            <Button variant="outline" onClick={handleImportData} data-testid="button-import-data">
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="retentionPeriod">Data retention period (days)</Label>
              <Input
                id="retentionPeriod"
                type="number"
                min="30"
                max="3650"
                value={settings.retentionPeriod}
                onChange={(e) => setSettings(prev => ({ ...prev, retentionPeriod: parseInt(e.target.value) || 365 }))}
                className="w-32"
                data-testid="input-retention-period"
              />
              <div className="text-sm text-muted-foreground">
                How long to keep completed surveys before archival
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Anonymize archived data</Label>
                <div className="text-sm text-muted-foreground">
                  Remove personal identifiers from old surveys
                </div>
              </div>
              <Switch
                checked={settings.anonymizeData}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, anonymizeData: checked }))}
                data-testid="switch-anonymize-data"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Privacy & Security
          </CardTitle>
          <CardDescription>
            Control how your data is used and shared
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Share anonymous analytics</Label>
              <div className="text-sm text-muted-foreground">
                Help improve the app by sharing usage statistics
              </div>
            </div>
            <Switch
              checked={settings.shareAnalytics}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, shareAnalytics: checked }))}
              data-testid="switch-share-analytics"
            />
          </div>

          <Separator />

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="space-y-2">
                <div className="font-medium text-red-900">Danger Zone</div>
                <div className="text-sm text-red-700">
                  These actions cannot be undone. Please proceed with caution.
                </div>
                <Button variant="destructive" size="sm" data-testid="button-delete-account">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Data
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Application version and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Version</span>
            <Badge variant="outline">v1.0.0</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Last Updated</span>
            <span className="text-sm text-muted-foreground">December 2024</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Database Status</span>
            <Badge className="bg-green-100 text-green-800">Connected</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}