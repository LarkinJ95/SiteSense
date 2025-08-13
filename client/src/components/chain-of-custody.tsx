import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  Package,
  MapPin,
  Thermometer,
  Camera,
  Scan,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Plus,
  Download,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ChainOfCustodyRecord {
  id: string;
  sampleId: string;
  surveyId: string;
  currentCustodian: string;
  previousCustodian?: string;
  transferDate: string;
  transferReason: string;
  condition: 'good' | 'damaged' | 'sealed' | 'opened';
  location: string;
  temperature?: number;
  sealIntact: boolean;
  witnessName?: string;
  witnessSignature?: string;
  digitalSignature?: string;
  photos: string[];
  notes?: string;
  barcodeScanned: boolean;
  gpsCoordinates?: string;
  createdAt: string;
}

interface ChainOfCustodyProps {
  sampleId?: string;
  surveyId?: string;
}

export function ChainOfCustody({ sampleId, surveyId }: ChainOfCustodyProps) {
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newTransfer, setNewTransfer] = useState({
    sampleId: sampleId || "",
    currentCustodian: "",
    transferReason: "",
    condition: "good" as const,
    location: "",
    temperature: "",
    sealIntact: true,
    witnessName: "",
    notes: "",
    barcodeScanned: false,
    gpsCoordinates: "",
  });

  // Fetch chain of custody records
  const { data: custodyRecords, isLoading } = useQuery({
    queryKey: ["/api/chain-of-custody", sampleId],
    queryFn: () => apiRequest("GET", `/api/chain-of-custody${sampleId ? `?sampleId=${sampleId}` : ''}`),
  });

  // Create custody transfer
  const transferMutation = useMutation({
    mutationFn: async (transferData: typeof newTransfer) => {
      return await apiRequest("POST", "/api/chain-of-custody", {
        ...transferData,
        surveyId,
        temperature: transferData.temperature ? parseFloat(transferData.temperature) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chain-of-custody"] });
      toast({
        title: "Transfer Recorded",
        description: "Chain of custody transfer has been recorded.",
      });
      setIsTransferModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record chain of custody transfer.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewTransfer({
      sampleId: sampleId || "",
      currentCustodian: "",
      transferReason: "",
      condition: "good",
      location: "",
      temperature: "",
      sealIntact: true,
      witnessName: "",
      notes: "",
      barcodeScanned: false,
      gpsCoordinates: "",
    });
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'good': return 'bg-green-100 text-green-800';
      case 'sealed': return 'bg-blue-100 text-blue-800';
      case 'opened': return 'bg-yellow-100 text-yellow-800';
      case 'damaged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const captureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const coordinates = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        setNewTransfer({ ...newTransfer, gpsCoordinates: coordinates });
        toast({
          title: "GPS Captured",
          description: `Location: ${coordinates}`,
        });
      }, (error) => {
        toast({
          title: "GPS Error",
          description: "Unable to capture GPS coordinates.",
          variant: "destructive",
        });
      });
    } else {
      toast({
        title: "GPS Not Supported",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading chain of custody...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Chain of Custody
          </h3>
          <p className="text-sm text-gray-600">
            Track sample transfers and maintain custody integrity
          </p>
        </div>
        <Button 
          onClick={() => setIsTransferModalOpen(true)}
          data-testid="button-record-transfer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record Transfer
        </Button>
      </div>

      <div className="space-y-4">
        {custodyRecords?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h4 className="text-lg font-medium mb-2">No Custody Records</h4>
              <p className="text-gray-600 mb-4">
                Start tracking samples by recording the first custody transfer
              </p>
              <Button onClick={() => setIsTransferModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Record First Transfer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {custodyRecords?.map((record: ChainOfCustodyRecord, index: number) => (
              <Card key={record.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">
                        Transfer #{custodyRecords.length - index}
                      </CardTitle>
                      <CardDescription>
                        Sample ID: {record.sampleId}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getConditionColor(record.condition)}>
                        {record.condition}
                      </Badge>
                      {record.sealIntact ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Seal Intact
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Seal Broken
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-xs text-gray-600">Current Custodian</Label>
                      <p className="font-medium">{record.currentCustodian}</p>
                    </div>
                    {record.previousCustodian && (
                      <div>
                        <Label className="text-xs text-gray-600">Previous Custodian</Label>
                        <p className="font-medium">{record.previousCustodian}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-gray-600">Location</Label>
                      <p className="font-medium">{record.location}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600">Transfer Date</Label>
                      <p className="font-medium">{new Date(record.transferDate).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-xs text-gray-600">Transfer Reason</Label>
                      <p className="text-sm">{record.transferReason}</p>
                    </div>
                    {record.temperature && (
                      <div>
                        <Label className="text-xs text-gray-600">Temperature</Label>
                        <p className="text-sm flex items-center">
                          <Thermometer className="h-3 w-3 mr-1" />
                          {record.temperature}°C
                        </p>
                      </div>
                    )}
                    {record.witnessName && (
                      <div>
                        <Label className="text-xs text-gray-600">Witness</Label>
                        <p className="text-sm flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {record.witnessName}
                        </p>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-gray-600">Barcode Scanned</Label>
                      <p className="text-sm flex items-center">
                        {record.barcodeScanned ? (
                          <>
                            <Scan className="h-3 w-3 mr-1 text-green-600" />
                            <span className="text-green-600">Yes</span>
                          </>
                        ) : (
                          <>
                            <Scan className="h-3 w-3 mr-1 text-gray-400" />
                            <span className="text-gray-600">No</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {record.gpsCoordinates && (
                    <div className="mb-4">
                      <Label className="text-xs text-gray-600">GPS Coordinates</Label>
                      <p className="text-sm flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {record.gpsCoordinates}
                      </p>
                    </div>
                  )}

                  {record.notes && (
                    <div className="mb-4">
                      <Label className="text-xs text-gray-600">Notes</Label>
                      <p className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        {record.notes}
                      </p>
                    </div>
                  )}

                  {record.photos.length > 0 && (
                    <div>
                      <Label className="text-xs text-gray-600">Photos</Label>
                      <div className="flex gap-2 mt-1">
                        {record.photos.map((photo, photoIndex) => (
                          <div key={photoIndex} className="flex items-center gap-1 text-sm">
                            <Camera className="h-3 w-3" />
                            Photo {photoIndex + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Record Transfer Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Chain of Custody Transfer</DialogTitle>
            <DialogDescription>
              Document the transfer of sample custody with complete details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sample-id">Sample ID</Label>
                <Input 
                  id="sample-id"
                  value={newTransfer.sampleId}
                  onChange={(e) => setNewTransfer({ ...newTransfer, sampleId: e.target.value })}
                  placeholder="SAMPLE-001"
                  data-testid="input-sample-id"
                />
              </div>
              <div>
                <Label htmlFor="current-custodian">Current Custodian</Label>
                <Input 
                  id="current-custodian"
                  value={newTransfer.currentCustodian}
                  onChange={(e) => setNewTransfer({ ...newTransfer, currentCustodian: e.target.value })}
                  placeholder="John Doe"
                  data-testid="input-current-custodian"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transfer-reason">Transfer Reason</Label>
                <Select 
                  value={newTransfer.transferReason} 
                  onValueChange={(value) => setNewTransfer({ ...newTransfer, transferReason: value })}
                >
                  <SelectTrigger data-testid="select-transfer-reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collection">Sample Collection</SelectItem>
                    <SelectItem value="transport">Transport to Lab</SelectItem>
                    <SelectItem value="analysis">Lab Analysis</SelectItem>
                    <SelectItem value="storage">Long-term Storage</SelectItem>
                    <SelectItem value="disposal">Sample Disposal</SelectItem>
                    <SelectItem value="return">Return to Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="condition">Sample Condition</Label>
                <Select 
                  value={newTransfer.condition} 
                  onValueChange={(value) => setNewTransfer({ ...newTransfer, condition: value as any })}
                >
                  <SelectTrigger data-testid="select-condition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="sealed">Sealed</SelectItem>
                    <SelectItem value="opened">Opened</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location"
                  value={newTransfer.location}
                  onChange={(e) => setNewTransfer({ ...newTransfer, location: e.target.value })}
                  placeholder="Lab Room A"
                  data-testid="input-location"
                />
              </div>
              <div>
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input 
                  id="temperature"
                  type="number"
                  value={newTransfer.temperature}
                  onChange={(e) => setNewTransfer({ ...newTransfer, temperature: e.target.value })}
                  placeholder="22.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="witness">Witness Name</Label>
              <Input 
                id="witness"
                value={newTransfer.witnessName}
                onChange={(e) => setNewTransfer({ ...newTransfer, witnessName: e.target.value })}
                placeholder="Jane Smith (optional)"
              />
            </div>

            <div>
              <Label htmlFor="gps">GPS Coordinates</Label>
              <div className="flex gap-2">
                <Input 
                  id="gps"
                  value={newTransfer.gpsCoordinates}
                  onChange={(e) => setNewTransfer({ ...newTransfer, gpsCoordinates: e.target.value })}
                  placeholder="40.7128, -74.0060"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={captureGPS}>
                  <MapPin className="h-4 w-4 mr-1" />
                  Capture
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes"
                value={newTransfer.notes}
                onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })}
                placeholder="Additional notes about the transfer..."
                data-testid="textarea-notes"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="seal-intact"
                  checked={newTransfer.sealIntact}
                  onCheckedChange={(checked) => setNewTransfer({ ...newTransfer, sealIntact: checked })}
                />
                <Label htmlFor="seal-intact">Seal Intact</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="barcode-scanned"
                  checked={newTransfer.barcodeScanned}
                  onCheckedChange={(checked) => setNewTransfer({ ...newTransfer, barcodeScanned: checked })}
                />
                <Label htmlFor="barcode-scanned">Barcode Scanned</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => transferMutation.mutate(newTransfer)}
                disabled={transferMutation.isPending || !newTransfer.sampleId || !newTransfer.currentCustodian}
                data-testid="button-save-transfer"
              >
                <FileCheck className="h-4 w-4 mr-2" />
                {transferMutation.isPending ? "Recording..." : "Record Transfer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}