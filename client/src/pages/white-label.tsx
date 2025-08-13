import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Palette,
  Upload,
  Image as ImageIcon,
  Settings,
  Save,
  RotateCcw,
  Database,
  Download,
  Trash2,
  Eye,
  Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";

interface BrandSettings {
  appName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  footerText: string;
  welcomeMessage: string;
  contactEmail: string;
  supportUrl?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
  customCss?: string;
  enableCustomBranding: boolean;
  showPoweredBy: boolean;
}

interface DataManagement {
  totalSurveys: number;
  totalUsers: number;
  totalAirSamples: number;
  totalObservations: number;
  databaseSize: string;
  lastBackup?: string;
  autoBackupEnabled: boolean;
  retentionPeriod: number; // in days
}

export default function WhiteLabelDashboard() {
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Brand settings state
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    appName: "SiteSense",
    primaryColor: "#3b82f6",
    secondaryColor: "#64748b",
    accentColor: "#10b981",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    footerText: "© 2025 SiteSense. Professional site survey management.",
    welcomeMessage: "Welcome to your environmental survey management platform",
    contactEmail: "support@sitesense.com",
    enableCustomBranding: true,
    showPoweredBy: true,
  });

  // Fetch current brand settings
  const { data: currentSettings, isLoading: settingsLoading } = useQuery<BrandSettings>({
    queryKey: ["/api/admin/brand-settings"],
  });

  // Fetch data management info
  const { data: dataInfo, isLoading: dataLoading } = useQuery<DataManagement>({
    queryKey: ["/api/admin/data-management"],
  });

  useEffect(() => {
    if (currentSettings) {
      setBrandSettings(currentSettings);
    }
  }, [currentSettings]);

  // Save brand settings mutation
  const saveBrandMutation = useMutation({
    mutationFn: async (settings: BrandSettings) => {
      return await apiRequest("PUT", "/api/admin/brand-settings", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brand-settings"] });
      toast({
        title: "Brand Settings Saved",
        description: "Your branding changes have been applied successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save brand settings.",
        variant: "destructive",
      });
    },
  });

  // Logo upload handlers
  const handleLogoUpload = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload");
      return {
        method: "PUT" as const,
        url: response.uploadURL,
      };
    } catch (error) {
      console.error("Error getting upload URL:", error);
      throw new Error("Failed to get upload URL");
    }
  };

  const handleLogoComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const logoUrl = result.successful[0].uploadURL;
      setBrandSettings({ ...brandSettings, logoUrl });
      toast({
        title: "Logo Uploaded",
        description: "Your logo has been uploaded successfully.",
      });
    }
  };

  // Data management mutations
  const backupDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/backup");
    },
    onSuccess: () => {
      toast({
        title: "Backup Started",
        description: "Database backup has been initiated.",
      });
    },
  });

  const exportAllDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/export-all");
    },
    onSuccess: () => {
      toast({
        title: "Export Started",
        description: "Full data export has been initiated. You'll receive a download link via email.",
      });
    },
  });

  const purgeOldDataMutation = useMutation({
    mutationFn: async (olderThan: number) => {
      return await apiRequest("POST", "/api/admin/purge-data", { olderThan });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/data-management"] });
      toast({
        title: "Data Purged",
        description: "Old data has been removed successfully.",
      });
    },
  });

  const resetBrandSettings = () => {
    setBrandSettings({
      appName: "SiteSense",
      primaryColor: "#3b82f6",
      secondaryColor: "#64748b",
      accentColor: "#10b981",
      backgroundColor: "#ffffff",
      textColor: "#1f2937",
      footerText: "© 2025 SiteSense. Professional site survey management.",
      welcomeMessage: "Welcome to your environmental survey management platform",
      contactEmail: "support@sitesense.com",
      enableCustomBranding: true,
      showPoweredBy: true,
    });
  };

  const previewStyles = previewMode ? {
    '--primary-color': brandSettings.primaryColor,
    '--secondary-color': brandSettings.secondaryColor,
    '--accent-color': brandSettings.accentColor,
    '--background-color': brandSettings.backgroundColor,
    '--text-color': brandSettings.textColor,
  } as React.CSSProperties : {};

  return (
    <div className="space-y-6" style={previewStyles}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">White Label Configuration</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Customize the platform branding and manage all system data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={previewMode ? "default" : "outline"}
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? "Exit Preview" : "Preview"}
          </Button>
          <Button
            onClick={() => saveBrandMutation.mutate(brandSettings)}
            disabled={saveBrandMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveBrandMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {previewMode && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <p className="text-blue-800 font-medium">Preview Mode Active</p>
              <p className="text-blue-600 text-sm">You're seeing how your branding changes will look</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="branding" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logo & Visual Identity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Logo & Visual Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="app-name">Application Name</Label>
                  <Input
                    id="app-name"
                    value={brandSettings.appName}
                    onChange={(e) => setBrandSettings({ ...brandSettings, appName: e.target.value })}
                    placeholder="Your Platform Name"
                  />
                </div>

                <div>
                  <Label>Logo Upload</Label>
                  <div className="flex items-center gap-4">
                    {brandSettings.logoUrl ? (
                      <div className="flex items-center gap-2">
                        <img src={brandSettings.logoUrl} alt="Logo" className="h-12 w-auto" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBrandSettings({ ...brandSettings, logoUrl: undefined })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <ObjectUploader
                        maxNumberOfFiles={1}
                        maxFileSize={5242880} // 5MB
                        onGetUploadParameters={handleLogoUpload}
                        onComplete={handleLogoComplete}
                        buttonClassName="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </ObjectUploader>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Recommended: PNG or SVG, max 5MB</p>
                </div>

                <div>
                  <Label>Favicon Upload</Label>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={1048576} // 1MB
                    onGetUploadParameters={handleLogoUpload}
                    onComplete={(result) => {
                      if (result.successful?.length) {
                        setBrandSettings({ ...brandSettings, faviconUrl: result.successful[0].uploadURL });
                      }
                    }}
                    buttonClassName="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Favicon
                  </ObjectUploader>
                  <p className="text-xs text-gray-500 mt-1">16x16 or 32x32 ICO/PNG file</p>
                </div>
              </CardContent>
            </Card>

            {/* Color Scheme */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Color Scheme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={brandSettings.primaryColor}
                        onChange={(e) => setBrandSettings({ ...brandSettings, primaryColor: e.target.value })}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={brandSettings.primaryColor}
                        onChange={(e) => setBrandSettings({ ...brandSettings, primaryColor: e.target.value })}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={brandSettings.secondaryColor}
                        onChange={(e) => setBrandSettings({ ...brandSettings, secondaryColor: e.target.value })}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={brandSettings.secondaryColor}
                        onChange={(e) => setBrandSettings({ ...brandSettings, secondaryColor: e.target.value })}
                        placeholder="#64748b"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="accent-color">Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="accent-color"
                        type="color"
                        value={brandSettings.accentColor}
                        onChange={(e) => setBrandSettings({ ...brandSettings, accentColor: e.target.value })}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={brandSettings.accentColor}
                        onChange={(e) => setBrandSettings({ ...brandSettings, accentColor: e.target.value })}
                        placeholder="#10b981"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="background-color">Background Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="background-color"
                        type="color"
                        value={brandSettings.backgroundColor}
                        onChange={(e) => setBrandSettings({ ...brandSettings, backgroundColor: e.target.value })}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={brandSettings.backgroundColor}
                        onChange={(e) => setBrandSettings({ ...brandSettings, backgroundColor: e.target.value })}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="outline" onClick={resetBrandSettings} className="w-full">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Customization</CardTitle>
              <CardDescription>Customize text and messaging throughout the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="welcome-message">Welcome Message</Label>
                <Input
                  id="welcome-message"
                  value={brandSettings.welcomeMessage}
                  onChange={(e) => setBrandSettings({ ...brandSettings, welcomeMessage: e.target.value })}
                  placeholder="Welcome message for users"
                />
              </div>

              <div>
                <Label htmlFor="footer-text">Footer Text</Label>
                <Input
                  id="footer-text"
                  value={brandSettings.footerText}
                  onChange={(e) => setBrandSettings({ ...brandSettings, footerText: e.target.value })}
                  placeholder="Copyright and footer information"
                />
              </div>

              <div>
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={brandSettings.contactEmail}
                  onChange={(e) => setBrandSettings({ ...brandSettings, contactEmail: e.target.value })}
                  placeholder="support@yourcompany.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="support-url">Support URL</Label>
                  <Input
                    id="support-url"
                    value={brandSettings.supportUrl || ""}
                    onChange={(e) => setBrandSettings({ ...brandSettings, supportUrl: e.target.value })}
                    placeholder="https://support.yourcompany.com"
                  />
                </div>

                <div>
                  <Label htmlFor="privacy-url">Privacy Policy URL</Label>
                  <Input
                    id="privacy-url"
                    value={brandSettings.privacyPolicyUrl || ""}
                    onChange={(e) => setBrandSettings({ ...brandSettings, privacyPolicyUrl: e.target.value })}
                    placeholder="https://yourcompany.com/privacy"
                  />
                </div>

                <div>
                  <Label htmlFor="terms-url">Terms of Service URL</Label>
                  <Input
                    id="terms-url"
                    value={brandSettings.termsOfServiceUrl || ""}
                    onChange={(e) => setBrandSettings({ ...brandSettings, termsOfServiceUrl: e.target.value })}
                    placeholder="https://yourcompany.com/terms"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="custom-branding">Enable Custom Branding</Label>
                  <p className="text-sm text-gray-500">Apply your custom colors and logos</p>
                </div>
                <Switch
                  id="custom-branding"
                  checked={brandSettings.enableCustomBranding}
                  onCheckedChange={(checked) => setBrandSettings({ ...brandSettings, enableCustomBranding: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="powered-by">Show "Powered by SiteSense"</Label>
                  <p className="text-sm text-gray-500">Display attribution in footer</p>
                </div>
                <Switch
                  id="powered-by"
                  checked={brandSettings.showPoweredBy}
                  onCheckedChange={(checked) => setBrandSettings({ ...brandSettings, showPoweredBy: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Data Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataLoading ? (
                  <p>Loading data info...</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Surveys:</span>
                      <Badge>{dataInfo?.totalSurveys || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Users:</span>
                      <Badge>{dataInfo?.totalUsers || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Air Samples:</span>
                      <Badge>{dataInfo?.totalAirSamples || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Observations:</span>
                      <Badge>{dataInfo?.totalObservations || 0}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Database Size:</span>
                      <Badge variant="outline">{dataInfo?.databaseSize || "Unknown"}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Backup:</span>
                      <Badge variant="outline">
                        {dataInfo?.lastBackup ? new Date(dataInfo.lastBackup).toLocaleDateString() : "Never"}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Management Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Backup, export, and manage platform data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => backupDataMutation.mutate()}
                  disabled={backupDataMutation.isPending}
                  className="w-full"
                >
                  <Database className="h-4 w-4 mr-2" />
                  {backupDataMutation.isPending ? "Creating Backup..." : "Create Backup"}
                </Button>

                <Button
                  onClick={() => exportAllDataMutation.mutate()}
                  disabled={exportAllDataMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportAllDataMutation.isPending ? "Exporting..." : "Export All Data"}
                </Button>

                <Separator />

                <div>
                  <Label htmlFor="retention-days">Data Retention (Days)</Label>
                  <Input
                    id="retention-days"
                    type="number"
                    defaultValue={dataInfo?.retentionPeriod || 365}
                    min="30"
                    max="3650"
                  />
                  <p className="text-xs text-gray-500 mt-1">Data older than this will be eligible for deletion</p>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Purge Old Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Purge Old Data</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete data older than the retention period. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => purgeOldDataMutation.mutate(dataInfo?.retentionPeriod || 365)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Purge Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Advanced Configuration
              </CardTitle>
              <CardDescription>Advanced customization options and custom CSS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="custom-css">Custom CSS</Label>
                <Textarea
                  id="custom-css"
                  value={brandSettings.customCss || ""}
                  onChange={(e) => setBrandSettings({ ...brandSettings, customCss: e.target.value })}
                  placeholder="/* Add your custom CSS here */
.custom-header {
  background: linear-gradient(to right, #667eea 0%, #764ba2 100%);
}

.custom-button {
  border-radius: 25px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}"
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Custom CSS will be injected into all pages</p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Domain & SSL Settings</h4>
                <div>
                  <Label htmlFor="custom-domain">Custom Domain</Label>
                  <Input
                    id="custom-domain"
                    placeholder="surveys.yourcompany.com"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Contact support to configure custom domains</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="force-ssl">Force HTTPS</Label>
                    <p className="text-sm text-gray-500">Automatically redirect HTTP to HTTPS</p>
                  </div>
                  <Switch id="force-ssl" defaultChecked disabled />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">API & Integrations</h4>
                <div>
                  <Label htmlFor="api-key">API Access Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      value="sk-••••••••••••••••••••"
                      disabled
                    />
                    <Button variant="outline" size="sm">Regenerate</Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Use this key for API integrations</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="webhook-enabled">Enable Webhooks</Label>
                    <p className="text-sm text-gray-500">Send data to external systems</p>
                  </div>
                  <Switch id="webhook-enabled" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}