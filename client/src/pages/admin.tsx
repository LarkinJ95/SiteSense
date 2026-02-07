import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  Database, 
  Shield, 
  Activity,
  UserPlus,
  Trash2,
  Edit,
  Search,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Server,
  HardDrive,
  Palette
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive' | 'pending';
  organization: string;
  jobTitle: string;
  lastLogin?: string;
  createdAt: string;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalSurveys: number;
  totalAirSamples: number;
  databaseSize: string;
  databaseSizeBytes?: number;
  uploadedFilesSize?: string;
  uploadedFilesSizeBytes?: number;
  uploadedFilesCount?: number;
  systemUptime: string;
  lastBackup?: string | null;
  dbConnected?: boolean;
}

interface Organization {
  id: string;
  name: string;
  domain?: string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  createdAt?: string;
}

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState(false);
  const [isEditOrgModalOpen, setIsEditOrgModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newUserData, setNewUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    organization: "",
    jobTitle: "",
    role: "user" as 'admin' | 'manager' | 'user',
    status: "active" as 'active' | 'inactive' | 'pending'
  });

  const [editUserData, setEditUserData] = useState({
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    organization: "",
    jobTitle: "",
    role: "user" as 'admin' | 'manager' | 'user',
    status: "active" as 'active' | 'inactive' | 'pending'
  });

  const [newOrgData, setNewOrgData] = useState({
    name: "",
    domain: "",
    status: "active",
  });

  const [editOrgData, setEditOrgData] = useState({
    id: "",
    name: "",
    domain: "",
    status: "active",
  });

  const [newMemberData, setNewMemberData] = useState({
    email: "",
    role: "member",
    status: "active",
  });

  // Fetch system statistics
  const { data: systemStats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const { data: organizationMembers = [] } = useQuery<OrganizationMember[]>({
    queryKey: ["/api/organizations", selectedOrganization?.id, "members"],
    enabled: !!selectedOrganization?.id,
  });

  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
  const [editMemberData, setEditMemberData] = useState({ id: "", role: "member", status: "active" });

  const databasePercent = systemStats?.databaseSizeBytes
    ? Math.min(100, (systemStats.databaseSizeBytes / (1024 ** 3)) * 100)
    : 0;
  const uploadsPercent = systemStats?.uploadedFilesSizeBytes
    ? Math.min(100, (systemStats.uploadedFilesSizeBytes / (1024 ** 3)) * 100)
    : 0;

  // Filtered users based on search
  const filteredUsers = users.filter(user => 
    user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.organization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // User management mutations
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      return await apiRequest("PUT", `/api/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Updated",
        description: "User information has been updated successfully.",
      });
      setIsEditModalOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Deleted",
        description: "User has been removed from the system.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  const editUserMutation = useMutation({
    mutationFn: async (userData: typeof editUserData) => {
      const { id, ...updateData } = userData;
      return await apiRequest("PUT", `/api/admin/users/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Updated",
        description: "User information has been updated successfully.",
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user.",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: User) => {
    setEditUserData({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      organization: user.organization,
      jobTitle: user.jobTitle,
      role: user.role,
      status: user.status
    });
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const addUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      return await apiRequest("POST", "/api/admin/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "User Added",
        description: "New user has been created successfully.",
      });
      setIsAddUserModalOpen(false);
      setNewUserData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        organization: "",
        jobTitle: "",
        role: "user",
        status: "active"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create user.",
        variant: "destructive",
      });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/admin/export");
    },
    onSuccess: () => {
      toast({
        title: "Export Started",
        description: "System data export has been initiated. You will receive a download link via email.",
      });
    },
  });

  const createOrganizationMutation = useMutation({
    mutationFn: async (payload: typeof newOrgData) => {
      return await apiRequest("POST", "/api/organizations", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({ title: "Organization Created", description: "Organization has been created successfully." });
      setIsAddOrgModalOpen(false);
      setNewOrgData({ name: "", domain: "", status: "active" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create organization.", variant: "destructive" });
    },
  });

  const updateOrganizationMutation = useMutation({
    mutationFn: async (payload: typeof editOrgData) => {
      const { id, ...data } = payload;
      return await apiRequest("PUT", `/api/organizations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({ title: "Organization Updated", description: "Organization has been updated successfully." });
      setIsEditOrgModalOpen(false);
      setSelectedOrganization(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update organization.", variant: "destructive" });
    },
  });

  const deleteOrganizationMutation = useMutation({
    mutationFn: async (orgId: string) => {
      return await apiRequest("DELETE", `/api/organizations/${orgId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setSelectedOrganization(null);
      toast({ title: "Organization Deleted", description: "Organization has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to delete organization.", variant: "destructive" });
    },
  });

  const addOrganizationMemberMutation = useMutation({
    mutationFn: async (payload: { userId: string; role: string; status: string }) => {
      if (!selectedOrganization?.id) throw new Error("No organization selected");
      return await apiRequest("POST", `/api/organizations/${selectedOrganization.id}/members`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", selectedOrganization?.id, "members"] });
      toast({ title: "Member Added", description: "Organization member added successfully." });
      setNewMemberData({ email: "", role: "member", status: "active" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add organization member.", variant: "destructive" });
    },
  });

  const handleAddMember = async () => {
    if (!newMemberData.email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    try {
      const response = await apiRequest("GET", `/api/users/lookup?email=${encodeURIComponent(newMemberData.email.trim())}`);
      const user = await response.json();
      await addOrganizationMemberMutation.mutateAsync({
        userId: user.userId,
        role: newMemberData.role,
        status: newMemberData.status,
      });
    } catch (error: any) {
      toast({ title: "User not found", description: error.message || "No user found for that email.", variant: "destructive" });
    }
  };

  const removeOrganizationMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return await apiRequest("DELETE", `/api/organization-members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", selectedOrganization?.id, "members"] });
      toast({ title: "Member Removed", description: "Organization member removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to remove organization member.", variant: "destructive" });
    },
  });

  const updateOrganizationMemberMutation = useMutation({
    mutationFn: async (payload: { id: string; role: string; status: string }) => {
      const { id, ...data } = payload;
      return await apiRequest("PUT", `/api/organization-members/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", selectedOrganization?.id, "members"] });
      toast({ title: "Member Updated", description: "Organization member updated successfully." });
      setIsEditMemberModalOpen(false);
      setEditingMember(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to update organization member.", variant: "destructive" });
    },
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrgStatusColor = (status?: string | null) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">System Administration</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage users, system settings, and monitor platform health
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsAddUserModalOpen(true)}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-add-user"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add New User
          </Button>
          <Button 
            onClick={() => window.location.href = '/white-label'}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Palette className="h-4 w-4 mr-2" />
            White Label
          </Button>
          <Button 
            onClick={() => exportDataMutation.mutate()}
            disabled={exportDataMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold">{systemStats?.totalUsers || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
                <p className="text-2xl font-bold">{systemStats?.activeUsers || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Surveys</p>
                <p className="text-2xl font-bold">{systemStats?.totalSurveys || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Database Size</p>
                <p className="text-2xl font-bold">{systemStats?.databaseSize || "0 MB"}</p>
              </div>
              <Database className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* User Search */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.organization}</div>
                            <div className="text-sm text-gray-500">{user.jobTitle}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {user.firstName} {user.lastName}? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteUserMutation.mutate(user.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Manage organizations and their members.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search organizations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={() => setIsAddOrgModalOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Organization
                </Button>
              </div>

              <div className="border rounded-lg mb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations
                      .filter(org =>
                        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (org.domain || "").toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((org) => (
                        <TableRow key={org.id} onClick={() => setSelectedOrganization(org)} className="cursor-pointer">
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell>{org.domain || "—"}</TableCell>
                          <TableCell>
                            <Badge className={getOrgStatusColor(org.status)}>
                              {org.status || "active"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditOrgData({
                                    id: org.id,
                                    name: org.name,
                                    domain: org.domain || "",
                                    status: org.status || "active",
                                  });
                                  setIsEditOrgModalOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {org.name}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteOrganizationMutation.mutate(org.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Organization Members</CardTitle>
                  <CardDescription>
                    {selectedOrganization ? `Members of ${selectedOrganization.name}` : "Select an organization to view members."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedOrganization ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <Input
                          placeholder="User email"
                          value={newMemberData.email}
                          onChange={(e) => setNewMemberData((prev) => ({ ...prev, email: e.target.value }))}
                        />
                        <Select
                          value={newMemberData.role}
                          onValueChange={(value) => setNewMemberData((prev) => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={newMemberData.status}
                          onValueChange={(value) => setNewMemberData((prev) => ({ ...prev, status: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={handleAddMember}
                          disabled={!newMemberData.email}
                        >
                          Add Member
                        </Button>
                      </div>

	                      <div className="border rounded-lg">
	                        <Table>
	                          <TableHeader>
	                            <TableRow>
	                              <TableHead>Name</TableHead>
	                              <TableHead>Email</TableHead>
	                              <TableHead>Role</TableHead>
	                              <TableHead>Status</TableHead>
	                              <TableHead>Actions</TableHead>
	                            </TableRow>
	                          </TableHeader>
	                          <TableBody>
	                            {organizationMembers.map((member) => (
	                              <TableRow key={member.id}>
	                                <TableCell className="font-medium">{member.name || member.userId}</TableCell>
	                                <TableCell>{member.email || "—"}</TableCell>
	                                <TableCell>{member.role || "member"}</TableCell>
	                                <TableCell>
	                                  <Badge className={getStatusColor(member.status || "active")}>
	                                    {member.status || "active"}
	                                  </Badge>
	                                </TableCell>
	                                <TableCell>
	                                  <div className="flex items-center gap-2">
	                                    <Button
	                                      variant="outline"
	                                      size="sm"
	                                      onClick={() => {
	                                        setEditingMember(member);
	                                        setEditMemberData({
	                                          id: member.id,
	                                          role: (member.role || "member") as any,
	                                          status: (member.status || "active") as any,
	                                        });
	                                        setIsEditMemberModalOpen(true);
	                                      }}
	                                    >
	                                      <Edit className="h-4 w-4" />
	                                    </Button>
	                                    <Button
	                                      variant="outline"
	                                      size="sm"
	                                      onClick={() => removeOrganizationMemberMutation.mutate(member.id)}
	                                    >
	                                      <Trash2 className="h-4 w-4" />
	                                    </Button>
	                                  </div>
	                                </TableCell>
	                              </TableRow>
	                            ))}
	                          </TableBody>
	                        </Table>
	                      </div>
                    </div>
	                  ) : (
	                    <div className="text-sm text-gray-500">
	                      Select an organization above to manage members.
	                    </div>
	                  )}
	                </CardContent>
	              </Card>
            </CardContent>
          </Card>

          <Dialog open={isAddOrgModalOpen} onOpenChange={setIsAddOrgModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Organization</DialogTitle>
                <DialogDescription>Create a new organization.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Organization name"
                  value={newOrgData.name}
                  onChange={(e) => setNewOrgData((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Domain (optional)"
                  value={newOrgData.domain}
                  onChange={(e) => setNewOrgData((prev) => ({ ...prev, domain: e.target.value }))}
                />
                <Select
                  value={newOrgData.status}
                  onValueChange={(value) => setNewOrgData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => createOrganizationMutation.mutate(newOrgData)}
                  disabled={!newOrgData.name}
                >
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditOrgModalOpen} onOpenChange={setIsEditOrgModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Organization</DialogTitle>
                <DialogDescription>Update organization details.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Organization name"
                  value={editOrgData.name}
                  onChange={(e) => setEditOrgData((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Domain (optional)"
                  value={editOrgData.domain}
                  onChange={(e) => setEditOrgData((prev) => ({ ...prev, domain: e.target.value }))}
                />
                <Select
                  value={editOrgData.status}
                  onValueChange={(value) => setEditOrgData((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => updateOrganizationMutation.mutate(editOrgData)}
                  disabled={!editOrgData.name}
                >
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

	        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
	                  <span>System Uptime</span>
	                  <Badge className="bg-green-100 text-green-800">
	                    <CheckCircle className="h-3 w-3 mr-1" />
	                    {systemStats?.systemUptime || "Unknown"}
	                  </Badge>
	                </div>
	                <div className="text-xs text-gray-500">
	                  Uptime reflects current worker instance runtime, not end-to-end infrastructure availability.
	                </div>
                <div className="flex items-center justify-between">
                  <span>Database Connection</span>
                  <Badge className={systemStats?.dbConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {systemStats?.dbConnected ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 mr-1" />
                    )}
                    {systemStats?.dbConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
	                <div className="flex items-center justify-between">
	                  <span>Last Backup</span>
	                  <Badge className="bg-blue-100 text-blue-800">
	                    <Clock className="h-3 w-3 mr-1" />
	                    {systemStats?.lastBackup || "Never"}
	                  </Badge>
	                </div>
	              </CardContent>
	            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HardDrive className="h-5 w-5 mr-2" />
                  Storage Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Database Size</span>
                      <span>{systemStats?.databaseSize || "0 MB"}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${databasePercent}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Uploaded Files</span>
                      <span>{systemStats?.uploadedFilesSize || "0 MB"}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${uploadsPercent}%` }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>

      {/* Add New User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with access to the system
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-first-name">First Name</Label>
                <Input 
                  id="new-first-name"
                  value={newUserData.firstName}
                  onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                  placeholder="John"
                  data-testid="input-new-first-name"
                />
              </div>
              <div>
                <Label htmlFor="new-last-name">Last Name</Label>
                <Input 
                  id="new-last-name"
                  value={newUserData.lastName}
                  onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                  placeholder="Smith"
                  data-testid="input-new-last-name"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="new-email">Email</Label>
              <Input 
                id="new-email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="john.smith@company.com"
                data-testid="input-new-email"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-password">Password</Label>
                <Input 
                  id="new-password"
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="Enter password"
                  data-testid="input-new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input 
                  id="confirm-password"
                  type="password"
                  value={newUserData.confirmPassword}
                  onChange={(e) => setNewUserData({ ...newUserData, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  data-testid="input-confirm-password"
                />
              </div>
            </div>

            {newUserData.password && newUserData.confirmPassword && newUserData.password !== newUserData.confirmPassword && (
              <p className="text-sm text-red-500">Passwords do not match</p>
            )}

            <div>
              <Label htmlFor="new-organization">Organization</Label>
              <Input 
                id="new-organization"
                value={newUserData.organization}
                onChange={(e) => setNewUserData({ ...newUserData, organization: e.target.value })}
                placeholder="Company Name"
                data-testid="input-new-organization"
              />
            </div>

            <div>
              <Label htmlFor="new-job-title">Job Title</Label>
              <Input 
                id="new-job-title"
                value={newUserData.jobTitle}
                onChange={(e) => setNewUserData({ ...newUserData, jobTitle: e.target.value })}
                placeholder="Environmental Consultant"
                data-testid="input-new-job-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-role">Role</Label>
                <Select value={newUserData.role} onValueChange={(value) => setNewUserData({ ...newUserData, role: value as any })}>
                  <SelectTrigger data-testid="select-new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="new-status">Status</Label>
                <Select value={newUserData.status} onValueChange={(value) => setNewUserData({ ...newUserData, status: value as any })}>
                  <SelectTrigger data-testid="select-new-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsAddUserModalOpen(false)}
                data-testid="button-cancel-add-user"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => addUserMutation.mutate(newUserData)}
                disabled={addUserMutation.isPending || !newUserData.firstName || !newUserData.lastName || !newUserData.email || !newUserData.password || newUserData.password !== newUserData.confirmPassword}
                data-testid="button-create-user"
              >
                {addUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-first-name">First Name</Label>
                <Input 
                  id="edit-first-name"
                  value={editUserData.firstName}
                  onChange={(e) => setEditUserData({ ...editUserData, firstName: e.target.value })}
                  placeholder="John"
                  data-testid="input-edit-first-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-last-name">Last Name</Label>
                <Input 
                  id="edit-last-name"
                  value={editUserData.lastName}
                  onChange={(e) => setEditUserData({ ...editUserData, lastName: e.target.value })}
                  placeholder="Smith"
                  data-testid="input-edit-last-name"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input 
                id="edit-email"
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                placeholder="john.smith@company.com"
                data-testid="input-edit-email"
              />
            </div>

            <div>
              <Label htmlFor="edit-organization">Organization</Label>
              <Input 
                id="edit-organization"
                value={editUserData.organization}
                onChange={(e) => setEditUserData({ ...editUserData, organization: e.target.value })}
                placeholder="Company Name"
                data-testid="input-edit-organization"
              />
            </div>

            <div>
              <Label htmlFor="edit-job-title">Job Title</Label>
              <Input 
                id="edit-job-title"
                value={editUserData.jobTitle}
                onChange={(e) => setEditUserData({ ...editUserData, jobTitle: e.target.value })}
                placeholder="Environmental Consultant"
                data-testid="input-edit-job-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editUserData.role} onValueChange={(value) => setEditUserData({ ...editUserData, role: value as any })}>
                  <SelectTrigger data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editUserData.status} onValueChange={(value) => setEditUserData({ ...editUserData, status: value as any })}>
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsEditModalOpen(false)}
                data-testid="button-cancel-edit-user"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => editUserMutation.mutate(editUserData)}
                disabled={editUserMutation.isPending || !editUserData.firstName || !editUserData.lastName || !editUserData.email}
                data-testid="button-update-user"
              >
                {editUserMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Member Modal */}
      <Dialog open={isEditMemberModalOpen} onOpenChange={setIsEditMemberModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update role or set a member to inactive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm">
              <div className="font-medium">{editingMember?.name || editingMember?.userId || "Member"}</div>
              <div className="text-gray-500">{editingMember?.email || "—"}</div>
            </div>
            <Select
              value={editMemberData.role}
              onValueChange={(value) => setEditMemberData((prev) => ({ ...prev, role: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={editMemberData.status}
              onValueChange={(value) => setEditMemberData((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsEditMemberModalOpen(false)}>Cancel</Button>
              <Button
                onClick={() => updateOrganizationMemberMutation.mutate(editMemberData)}
                disabled={!editMemberData.id || updateOrganizationMemberMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
