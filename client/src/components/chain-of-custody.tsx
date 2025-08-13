import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package,
  User,
  Clock,
  MapPin,
  Camera,
  Scan,
  Plus,
  Edit,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle,
  Truck,
  FileText,
  Thermometer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ChainOfCustodyRecord {
  id: string;
  sampleId: string;
  currentCustodian: string;
  location: string;
  status: 'collected' | 'in_transit' | 'received' | 'analyzed' | 'completed';
  temperature?: number;
  transferHistory: Array<{
    from: string;
    to: string;
    transferTime: string;
    location: string;
    gpsCoordinates?: { lat: number; lng: number };
    signature?: string;
    witnessSignature?: string;
    photoEvidence?: string[];
    condition: string;
    temperature?: number;
    notes?: string;
  }>;
  sealNumbers?: string[];
  createdAt: string;
  lastUpdated: string;
}

export function ChainOfCustody() {
  const [activeTab, setActiveTab] = useState("records");
  const [selectedRecord, setSelectedRecord] = useState<string>("");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chain of custody records
  const { data: custodyRecords, isLoading } = useQuery({
    queryKey: ["/api/chain-of-custody"],
    queryFn: () => apiRequest("GET", "/api/chain-of-custody"),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'collected': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-yellow-100 text-yellow-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'analyzed': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const initiateCustodyTransfer = useMutation({
    mutationFn: async (transferData: any) => {
      return await apiRequest("POST", `/api/chain-of-custody/${selectedRecord}/transfer`, transferData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chain-of-custody"] });
      setIsTransferModalOpen(false);
      toast({
        title: "Transfer Initiated",
        description: "Chain of custody transfer has been recorded.",
      });
    },
  });

  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }),
          (error) => reject(error),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Chain of Custody Management</h3>
          <p className="text-sm text-gray-600">
            Track sample custody with GPS verification and audit trails
          </p>
        </div>
        <Button onClick={() => setIsTransferModalOpen(true)} data-testid="button-new-transfer">
          <Plus className="h-4 w-4 mr-2" />
          New Transfer
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="records">Custody Records</TabsTrigger>
          <TabsTrigger value="in-transit">In Transit</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Custody Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <div className="grid gap-4">
            {custodyRecords?.map((record: ChainOfCustodyRecord) => (
              <Card key={record.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">Sample: {record.sampleId}</CardTitle>
                      <CardDescription>
                        Current Custodian: {record.currentCustodian}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(record.status)}>
                        {record.status.replace('_', ' ')}
                      </Badge>
                      {record.temperature && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Thermometer className="h-3 w-3" />
                          {record.temperature}°F
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-xs text-gray-600">Current Location</Label>
                      <p className="text-sm flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {record.location}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Transfer Count</Label>
                      <p className="text-sm font-medium">{record.transferHistory?.length || 0}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Seal Numbers</Label>
                      <p className="text-sm">{record.sealNumbers?.join(', ') || 'None'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Last Updated</Label>
                      <p className="text-sm">{new Date(record.lastUpdated).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Transfer History */}
                  {record.transferHistory && record.transferHistory.length > 0 && (
                    <div className="mt-4">
                      <Label className="text-sm font-medium mb-2 block">Transfer History</Label>
                      <div className="space-y-2">
                        {record.transferHistory.map((transfer, index) => (
                          <div key={index} className="border rounded p-3 bg-gray-50 dark:bg-gray-800">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium">{transfer.from} → {transfer.to}</span>
                              </div>
                              <span className="text-xs text-gray-600">
                                {new Date(transfer.transferTime).toLocaleString()}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                              <div>
                                <span className="font-medium">Location:</span> {transfer.location}
                              </div>
                              <div>
                                <span className="font-medium">Condition:</span> {transfer.condition}
                              </div>
                              {transfer.temperature && (
                                <div>
                                  <span className="font-medium">Temperature:</span> {transfer.temperature}°F
                                </div>
                              )}
                              {transfer.gpsCoordinates && (
                                <div>
                                  <span className="font-medium">GPS:</span> 
                                  {transfer.gpsCoordinates.lat.toFixed(6)}, {transfer.gpsCoordinates.lng.toFixed(6)}
                                </div>
                              )}
                            </div>
                            {transfer.notes && (
                              <div className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Notes:</span> {transfer.notes}
                              </div>
                            )}
                            <div className="flex gap-2 mt-2">
                              {transfer.signature && (
                                <Badge variant="outline" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Signed
                                </Badge>
                              )}
                              {transfer.witnessSignature && (
                                <Badge variant="outline" className="text-xs">
                                  <User className="h-3 w-3 mr-1" />
                                  Witnessed
                                </Badge>
                              )}
                              {transfer.photoEvidence && transfer.photoEvidence.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Camera className="h-3 w-3 mr-1" />
                                  {transfer.photoEvidence.length} Photos
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4">
                    <div className="text-xs text-gray-500">
                      Created: {new Date(record.createdAt).toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedRecord(record.id);
                          setIsTransferModalOpen(true);
                        }}
                      >
                        <Truck className="h-4 w-4 mr-1" />
                        Transfer
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* In Transit Tab */}
        <TabsContent value="in-transit" className="space-y-4">
          <div className="grid gap-4">
            {custodyRecords?.filter((record: ChainOfCustodyRecord) => record.status === 'in_transit')
              .map((record: ChainOfCustodyRecord) => (
                <Card key={record.id} className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{record.sampleId}</h4>
                        <p className="text-sm text-gray-600">
                          In transit to: {record.currentCustodian}
                        </p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800 animate-pulse">
                        <Truck className="h-3 w-3 mr-1" />
                        In Transit
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            
            {custodyRecords?.filter((record: ChainOfCustodyRecord) => record.status === 'in_transit').length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No samples currently in transit
              </div>
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Samples</p>
                    <p className="text-2xl font-bold">{custodyRecords?.length || 0}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">In Transit</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {custodyRecords?.filter((r: ChainOfCustodyRecord) => r.status === 'in_transit').length || 0}
                    </p>
                  </div>
                  <Truck className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {custodyRecords?.filter((r: ChainOfCustodyRecord) => r.status === 'completed').length || 0}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Transfer Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Initiate Custody Transfer</DialogTitle>
            <DialogDescription>
              Record the transfer of sample custody with GPS verification and signatures
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transferTo">Transfer To</Label>
                <Input id="transferTo" placeholder="Recipient name" data-testid="input-transfer-to" />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <div className="flex gap-2">
                  <Input id="location" placeholder="Transfer location" />
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={async () => {
                      try {
                        const coords = await getCurrentLocation();
                        toast({
                          title: "Location Captured",
                          description: `GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
                        });
                      } catch (error) {
                        toast({
                          title: "Location Error",
                          description: "Unable to get GPS coordinates",
                          variant: "destructive",
                        });
                      }
                    }}
                    data-testid="button-get-gps"
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="condition">Sample Condition</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="compromised">Compromised</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="temperature">Temperature (°F)</Label>
                <Input id="temperature" type="number" placeholder="Temperature" data-testid="input-temperature" />
              </div>
            </div>
            
            <div>
              <Label htmlFor="transferNotes">Transfer Notes</Label>
              <Textarea 
                id="transferNotes" 
                placeholder="Additional notes about the transfer..." 
                data-testid="textarea-transfer-notes"
              />
            </div>
            
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Add Photos
              </Button>
              <Button variant="outline" className="flex-1">
                <Scan className="h-4 w-4 mr-2" />
                Scan Seal
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => initiateCustodyTransfer.mutate({ 
                transferTo: "Recipient Name",
                location: "Transfer Location" 
              })}
              disabled={initiateCustodyTransfer.isPending}
            >
              <FileText className="h-4 w-4 mr-2" />
              Record Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}