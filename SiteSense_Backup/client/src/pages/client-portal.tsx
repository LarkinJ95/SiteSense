import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Eye, 
  Download, 
  MessageCircle, 
  Settings,
  Shield,
  Calendar,
  FileText,
  Building,
  Mail,
  Phone,
  Globe,
  Lock,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Client {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  portalAccess: boolean;
  accessLevel: 'basic' | 'premium' | 'enterprise';
  allowDownloads: boolean;
  allowComments: boolean;
  customBranding: boolean;
  logoUrl?: string;
  primaryColor: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  surveyCount?: number;
  activeProjects?: number;
}

interface ClientSurvey {
  id: string;
  siteName: string;
  surveyType: string;
  status: string;
  surveyDate: string;
  inspector: string;
  clientAccess: boolean;
}

export default function ClientPortal() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: () => apiRequest("GET", "/api/clients"),
  });

  // Fetch client surveys
  const { data: clientSurveys } = useQuery({
    queryKey: ["/api/client-surveys", selectedClient?.id],
    queryFn: () => apiRequest("GET", `/api/clients/${selectedClient?.id}/surveys`),
    enabled: !!selectedClient?.id,
  });

  // Update client portal access
  const updateClientMutation = useMutation({
    mutationFn: async ({ clientId, updates }: { clientId: string; updates: Partial<Client> }) => {
      return await apiRequest("PUT", `/api/clients/${clientId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client Updated",
        description: "Client portal settings have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update client settings.",
        variant: "destructive",
      });
    },
  });

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'basic': return 'bg-gray-100 text-gray-800';
      case 'premium': return 'bg-blue-100 text-blue-800';
      case 'enterprise': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading client portal...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Client Portal Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage client access, permissions, and portal customization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Clients ({clients?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clients?.map((client: Client) => (
                  <div 
                    key={client.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedClient?.id === client.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{client.name}</h4>
                        <p className="text-sm text-gray-500">{client.contactEmail}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {client.portalAccess ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-gray-400" />
                        )}
                        <Badge className={getAccessLevelColor(client.accessLevel)}>
                          {client.accessLevel}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {client.surveyCount || 0} surveys • {client.activeProjects || 0} active
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Details */}
        <div className="lg:col-span-2">
          {selectedClient ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="surveys">Surveys</TabsTrigger>
                <TabsTrigger value="settings">Portal Settings</TabsTrigger>
                <TabsTrigger value="branding">Branding</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{selectedClient.name}</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setIsSettingsModalOpen(true)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Settings
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Client portal overview and access management
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Organization</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{selectedClient.contactEmail}</span>
                        </div>
                        {selectedClient.contactPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{selectedClient.contactPhone}</span>
                          </div>
                        )}
                        {selectedClient.address && (
                          <div className="flex items-start gap-2">
                            <Building className="h-4 w-4 text-gray-500 mt-0.5" />
                            <span className="text-sm">{selectedClient.address}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Portal Access:</span>
                          <Badge className={selectedClient.portalAccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {selectedClient.portalAccess ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Access Level:</span>
                          <Badge className={getAccessLevelColor(selectedClient.accessLevel)}>
                            {selectedClient.accessLevel.charAt(0).toUpperCase() + selectedClient.accessLevel.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Downloads:</span>
                          <Badge className={selectedClient.allowDownloads ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {selectedClient.allowDownloads ? 'Allowed' : 'Restricted'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Comments:</span>
                          <Badge className={selectedClient.allowComments ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {selectedClient.allowComments ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Surveys</p>
                          <p className="text-2xl font-bold">{selectedClient.surveyCount || 0}</p>
                        </div>
                        <FileText className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Active Projects</p>
                          <p className="text-2xl font-bold">{selectedClient.activeProjects || 0}</p>
                        </div>
                        <Clock className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Last Login</p>
                          <p className="text-sm font-medium">
                            {selectedClient.lastLogin 
                              ? new Date(selectedClient.lastLogin).toLocaleDateString()
                              : 'Never'
                            }
                          </p>
                        </div>
                        <Calendar className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="surveys" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Survey Access</CardTitle>
                    <CardDescription>
                      Manage which surveys this client can access through their portal
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Site Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Access</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientSurveys?.map((survey: ClientSurvey) => (
                          <TableRow key={survey.id}>
                            <TableCell className="font-medium">{survey.siteName}</TableCell>
                            <TableCell>{survey.surveyType}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(survey.status)}>
                                {survey.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(survey.surveyDate).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Switch 
                                checked={survey.clientAccess}
                                onCheckedChange={(checked) => {
                                  // Update survey client access
                                  updateClientMutation.mutate({
                                    clientId: selectedClient.id,
                                    updates: { /* survey access updates */ }
                                  });
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <MessageCircle className="h-4 w-4" />
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

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Portal Access Settings</CardTitle>
                    <CardDescription>
                      Configure client portal access and permissions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Portal Access</Label>
                        <p className="text-sm text-gray-600">Enable or disable client portal access</p>
                      </div>
                      <Switch 
                        checked={selectedClient.portalAccess}
                        onCheckedChange={(checked) => {
                          updateClientMutation.mutate({
                            clientId: selectedClient.id,
                            updates: { portalAccess: checked }
                          });
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Allow Downloads</Label>
                        <p className="text-sm text-gray-600">Allow client to download reports and documents</p>
                      </div>
                      <Switch 
                        checked={selectedClient.allowDownloads}
                        onCheckedChange={(checked) => {
                          updateClientMutation.mutate({
                            clientId: selectedClient.id,
                            updates: { allowDownloads: checked }
                          });
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Allow Comments</Label>
                        <p className="text-sm text-gray-600">Enable client commenting on surveys and reports</p>
                      </div>
                      <Switch 
                        checked={selectedClient.allowComments}
                        onCheckedChange={(checked) => {
                          updateClientMutation.mutate({
                            clientId: selectedClient.id,
                            updates: { allowComments: checked }
                          });
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Custom Branding</Label>
                        <p className="text-sm text-gray-600">Enable custom branding for this client's portal</p>
                      </div>
                      <Switch 
                        checked={selectedClient.customBranding}
                        onCheckedChange={(checked) => {
                          updateClientMutation.mutate({
                            clientId: selectedClient.id,
                            updates: { customBranding: checked }
                          });
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="branding" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom Branding</CardTitle>
                    <CardDescription>
                      Customize the appearance of this client's portal
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="client-logo">Logo URL</Label>
                      <Input 
                        id="client-logo"
                        value={selectedClient.logoUrl || ""}
                        onChange={(e) => {
                          updateClientMutation.mutate({
                            clientId: selectedClient.id,
                            updates: { logoUrl: e.target.value }
                          });
                        }}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>

                    <div>
                      <Label htmlFor="primary-color">Primary Color</Label>
                      <div className="flex gap-2 items-center">
                        <Input 
                          id="primary-color"
                          type="color"
                          value={selectedClient.primaryColor}
                          onChange={(e) => {
                            updateClientMutation.mutate({
                              clientId: selectedClient.id,
                              updates: { primaryColor: e.target.value }
                            });
                          }}
                          className="w-16 h-10"
                        />
                        <Input 
                          value={selectedClient.primaryColor}
                          onChange={(e) => {
                            updateClientMutation.mutate({
                              clientId: selectedClient.id,
                              updates: { primaryColor: e.target.value }
                            });
                          }}
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>

                    <div className="mt-6 p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Preview</h4>
                      <div 
                        className="p-4 rounded-md text-white"
                        style={{ backgroundColor: selectedClient.primaryColor }}
                      >
                        <h5 className="font-medium">{selectedClient.name} Portal</h5>
                        <p className="text-sm opacity-90">This is how your branded portal will appear</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a client to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}