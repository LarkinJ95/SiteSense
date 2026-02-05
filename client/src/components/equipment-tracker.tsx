import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Wrench, Calendar, AlertTriangle } from "lucide-react";

export interface Equipment {
  name: string;
  serialNumber: string;
  calibrationDate: string;
  nextCalibration: string;
  status: 'calibrated' | 'due' | 'overdue';
}

interface EquipmentTrackerProps {
  equipment: Equipment[];
  onEquipmentChange: (equipment: Equipment[]) => void;
}

const commonEquipment = [
  'Air Sampling Pump',
  'Digital Multimeter',
  'Moisture Meter',
  'pH Meter',
  'Sampling Kit',
  'Protective Equipment',
  'Camera/Documentation',
  'GPS Device',
  'Sound Level Meter',
  'Thermometer/Hygrometer'
];

export function EquipmentTracker({ equipment, onEquipmentChange }: EquipmentTrackerProps) {
  const [newEquipment, setNewEquipment] = useState<Partial<Equipment>>({
    name: '',
    serialNumber: '',
    calibrationDate: '',
    nextCalibration: ''
  });

  const addEquipment = () => {
    if (newEquipment.name && newEquipment.calibrationDate) {
      const calibDate = new Date(newEquipment.calibrationDate);
      const nextCalDate = new Date(calibDate);
      nextCalDate.setFullYear(calibDate.getFullYear() + 1); // Default to 1 year

      const equipment_item: Equipment = {
        name: newEquipment.name,
        serialNumber: newEquipment.serialNumber || 'N/A',
        calibrationDate: newEquipment.calibrationDate,
        nextCalibration: newEquipment.nextCalibration || nextCalDate.toISOString().split('T')[0],
        status: getCalibrationStatus(newEquipment.nextCalibration || nextCalDate.toISOString().split('T')[0])
      };

      onEquipmentChange([...equipment, equipment_item]);
      setNewEquipment({ name: '', serialNumber: '', calibrationDate: '', nextCalibration: '' });
    }
  };

  const removeEquipment = (index: number) => {
    onEquipmentChange(equipment.filter((_, i) => i !== index));
  };

  const getCalibrationStatus = (nextCalibration: string): Equipment['status'] => {
    const today = new Date();
    const nextCal = new Date(nextCalibration);
    const daysUntilCal = Math.ceil((nextCal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilCal < 0) return 'overdue';
    if (daysUntilCal < 30) return 'due';
    return 'calibrated';
  };

  const getStatusColor = (status: Equipment['status']) => {
    switch (status) {
      case 'calibrated': return 'bg-green-100 text-green-800';
      case 'due': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
    }
  };

  const getStatusIcon = (status: Equipment['status']) => {
    switch (status) {
      case 'calibrated': return <Wrench className="h-3 w-3" />;
      case 'due': return <Calendar className="h-3 w-3" />;
      case 'overdue': return <AlertTriangle className="h-3 w-3" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Equipment Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Add Equipment Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <Label htmlFor="equipment-name">Equipment</Label>
            <Input
              id="equipment-name"
              list="common-equipment"
              placeholder="Select or type equipment name"
              value={newEquipment.name}
              onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
              data-testid="input-equipment-name"
            />
            <datalist id="common-equipment">
              {commonEquipment.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
          
          <div>
            <Label htmlFor="serial-number">Serial Number</Label>
            <Input
              id="serial-number"
              placeholder="SN123456"
              value={newEquipment.serialNumber}
              onChange={(e) => setNewEquipment({ ...newEquipment, serialNumber: e.target.value })}
              data-testid="input-serial-number"
            />
          </div>
          
          <div>
            <Label htmlFor="calibration-date">Last Calibration</Label>
            <Input
              id="calibration-date"
              type="date"
              value={newEquipment.calibrationDate}
              onChange={(e) => setNewEquipment({ ...newEquipment, calibrationDate: e.target.value })}
              data-testid="input-calibration-date"
            />
          </div>
          
          <div className="flex items-end">
            <Button 
              onClick={addEquipment}
              disabled={!newEquipment.name || !newEquipment.calibrationDate}
              className="w-full"
              data-testid="button-add-equipment"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Equipment List */}
        {equipment.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Survey Equipment ({equipment.length})</h4>
            {equipment.map((item, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      S/N: {item.serialNumber} • Calibrated: {new Date(item.calibrationDate).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge 
                    className={`${getStatusColor(item.status)} flex items-center gap-1`}
                    data-testid={`badge-equipment-status-${index}`}
                  >
                    {getStatusIcon(item.status)}
                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Badge>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEquipment(index)}
                  data-testid={`button-remove-equipment-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {equipment.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Wrench className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No equipment added yet</p>
            <p className="text-sm">Add equipment to track calibration status</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}