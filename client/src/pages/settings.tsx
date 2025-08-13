import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Bell, 
  Settings, 
  Shield, 
  FileText, 
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface NotificationSetting {
  id: string;
  type: string;
  label: string;
  description: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
}

interface ComplianceRule {
  id: string;
  name: string;
  description?: string;
  regulatoryBody: string;
  ruleType: string;
  warningDays: number;
  criticalDays: number;
  autoCheck: boolean;
  isActive: boolean;
}

export default function SystemSettings() {
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ComplianceRule | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newRule, setNewRule] = useState({
    name: "",
    description: "",
    regulatoryBody: "EPA",
    ruleType: "time_limit",
    warningDays: 30,
    criticalDays: 7,
    autoCheck: true,
    isActive: true,
  });

  // Fetch notification settings
  const { data: notificationSettings, isLoading: loadingNotifications } = useQuery({
    queryKey: ["/api/settings/notifications"],
    queryFn: () => apiRequest("GET", "/api/settings/notifications"),
  });

  // Fetch compliance rules
  const { data: complianceRules, isLoading: loadingCompliance } = useQuery({
    queryKey: ["/api/compliance-rules"],
    queryFn: () => apiRequest("GET", "/api/compliance-rules"),
  });

  // Update notification settings
  const updateNotificationMutation = useMutation({
    mutationFn: async ({ settingId, updates }: { settingId: string; updates: Partial<NotificationSetting> }) => {
      return await apiRequest("PUT", `/api/settings/notifications/${settingId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/notifications"] });
      toast({
        title: "Settings Updated",
        description: "Notification preferences have been saved.",
      });
    },
  });

  // Create compliance rule
  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: typeof newRule) => {
      return await apiRequest("POST", "/api/compliance-rules", ruleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-rules"] });
      toast({
        title: "Rule Created",
        description: "Compliance rule has been created successfully.",
      });
      setIsComplianceModalOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setNewRule({
      name: "",
      description: "",
      regulatoryBody: "EPA",
      ruleType: "time_limit",
      warningDays: 30,
      criticalDays: 7,
      autoCheck: true,
      isActive: true,
    });
  };

  const getRegulatoryBodyColor = (body: string) => {
    switch (body) {
      case 'EPA': return 'bg-blue-100 text-blue-800';
      case 'OSHA': return 'bg-orange-100 text-orange-800';
      case 'local_authority': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure notifications, compliance rules, and system preferences
        </p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingNotifications ? (
                <div className="flex justify-center py-8">Loading notification settings...</div>
              ) : (
                <div className="space-y-6">
                  {notificationSettings?.map((setting: NotificationSetting) => (
                    <div key={setting.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium">{setting.label}</h4>
                          <p className="text-sm text-gray-600">{setting.description}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`${setting.id}-email`} className="text-sm">Email</Label>
                          <Switch
                            id={`${setting.id}-email`}
                            checked={setting.emailEnabled}
                            onCheckedChange={(checked) => {
                              updateNotificationMutation.mutate({
                                settingId: setting.id,
                                updates: { emailEnabled: checked }
                              });
                            }}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`${setting.id}-app`} className="text-sm">In-App</Label>
                          <Switch
                            id={`${setting.id}-app`}
                            checked={setting.inAppEnabled}
                            onCheckedChange={(checked) => {
                              updateNotificationMutation.mutate({
                                settingId: setting.id,
                                updates: { inAppEnabled: checked }
                              });
                            }}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`${setting.id}-sms`} className="text-sm">SMS</Label>
                          <Switch
                            id={`${setting.id}-sms`}
                            checked={setting.smsEnabled}
                            onCheckedChange={(checked) => {
                              updateNotificationMutation.mutate({
                                settingId: setting.id,
                                updates: { smsEnabled: checked }
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Compliance Rules</h3>
              <p className="text-sm text-gray-600">Manage regulatory compliance requirements</p>
            </div>
            <Button 
              onClick={() => setIsComplianceModalOpen(true)}
              data-testid="button-add-compliance-rule"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Regulatory Body</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Warning Days</TableHead>
                    <TableHead>Critical Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceRules?.map((rule: ComplianceRule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          {rule.description && (
                            <p className="text-sm text-gray-600">{rule.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRegulatoryBodyColor(rule.regulatoryBody)}>
                          {rule.regulatoryBody}
                        </Badge>
                      </TableCell>
                      <TableCell>{rule.ruleType.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          {rule.warningDays} days
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          {rule.criticalDays} days
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={rule.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {rule.autoCheck && (
                            <Badge variant="outline" className="text-xs">
                              Auto-check
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure security policies and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-600">Require 2FA for all user accounts</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Password Complexity</Label>
                  <p className="text-sm text-gray-600">Enforce strong password requirements</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Session Timeout</Label>
                  <p className="text-sm text-gray-600">Auto-logout after inactivity</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div>
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input 
                  id="session-timeout"
                  type="number"
                  defaultValue="30"
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                System Configuration
              </CardTitle>
              <CardDescription>
                General system settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="company-name">Company Name</Label>
                <Input 
                  id="company-name"
                  defaultValue="SiteSense"
                  placeholder="Your company name"
                />
              </div>

              <div>
                <Label htmlFor="default-timezone">Default Timezone</Label>
                <Input 
                  id="default-timezone"
                  defaultValue="America/New_York"
                  placeholder="UTC timezone"
                />
              </div>

              <div>
                <Label htmlFor="data-retention">Data Retention Period (days)</Label>
                <Input 
                  id="data-retention"
                  type="number"
                  defaultValue="2555"
                  placeholder="2555"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Auto-backup</Label>
                  <p className="text-sm text-gray-600">Automatically backup data daily</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Anonymous Analytics</Label>
                  <p className="text-sm text-gray-600">Help improve SiteSense with usage analytics</p>
                </div>
                <Switch />
              </div>

              <div className="pt-4">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save System Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Compliance Rule Modal */}
      <Dialog open={isComplianceModalOpen} onOpenChange={setIsComplianceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Compliance Rule</DialogTitle>
            <DialogDescription>
              Create a new regulatory compliance rule for automatic monitoring
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input 
                id="rule-name"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="EPA Report Deadline"
                data-testid="input-rule-name"
              />
            </div>

            <div>
              <Label htmlFor="rule-description">Description</Label>
              <Input 
                id="rule-description"
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="Submit EPA report within 30 days"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="regulatory-body">Regulatory Body</Label>
                <select 
                  id="regulatory-body"
                  value={newRule.regulatoryBody}
                  onChange={(e) => setNewRule({ ...newRule, regulatoryBody: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="EPA">EPA</option>
                  <option value="OSHA">OSHA</option>
                  <option value="local_authority">Local Authority</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="rule-type">Rule Type</Label>
                <select 
                  id="rule-type"
                  value={newRule.ruleType}
                  onChange={(e) => setNewRule({ ...newRule, ruleType: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="time_limit">Time Limit</option>
                  <option value="documentation">Documentation</option>
                  <option value="testing">Testing</option>
                  <option value="reporting">Reporting</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="warning-days">Warning Days</Label>
                <Input 
                  id="warning-days"
                  type="number"
                  value={newRule.warningDays}
                  onChange={(e) => setNewRule({ ...newRule, warningDays: parseInt(e.target.value) })}
                />
              </div>
              
              <div>
                <Label htmlFor="critical-days">Critical Days</Label>
                <Input 
                  id="critical-days"
                  type="number"
                  value={newRule.criticalDays}
                  onChange={(e) => setNewRule({ ...newRule, criticalDays: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Auto-check</Label>
                <p className="text-sm text-gray-600">Automatically monitor compliance</p>
              </div>
              <Switch 
                checked={newRule.autoCheck}
                onCheckedChange={(checked) => setNewRule({ ...newRule, autoCheck: checked })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsComplianceModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createRuleMutation.mutate(newRule)}
                disabled={createRuleMutation.isPending || !newRule.name}
                data-testid="button-save-rule"
              >
                <Save className="h-4 w-4 mr-2" />
                {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}