import { useOffline } from "@/hooks/use-offline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, WifiOff, Upload, Clock, CheckCircle } from "lucide-react";

export function OfflineIndicator() {
  const { isOnline, offlineData, syncOfflineData, clearOfflineData, pendingCount } = useOffline();

  if (isOnline && pendingCount === 0) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Wifi className="h-3 w-3" />
        Online
      </Badge>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-orange-500" />
            )}
            {isOnline ? 'Online' : 'Offline Mode'}
          </span>
          {!isOnline && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {pendingCount} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      {pendingCount > 0 && (
        <CardContent>
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              {!isOnline && (
                <p className="flex items-center gap-2 mb-2">
                  <WifiOff className="h-4 w-4" />
                  Working offline - data will sync when connection is restored
                </p>
              )}
              
              <div className="space-y-1">
                {offlineData.surveys.length > 0 && (
                  <div className="flex justify-between">
                    <span>Surveys pending:</span>
                    <span className="font-medium">{offlineData.surveys.length}</span>
                  </div>
                )}
                {offlineData.observations.length > 0 && (
                  <div className="flex justify-between">
                    <span>Observations pending:</span>
                    <span className="font-medium">{offlineData.observations.length}</span>
                  </div>
                )}
                {offlineData.photos.length > 0 && (
                  <div className="flex justify-between">
                    <span>Photos pending:</span>
                    <span className="font-medium">{offlineData.photos.length}</span>
                  </div>
                )}
              </div>
            </div>
            
            {isOnline && (
              <div className="flex gap-2">
                <Button 
                  onClick={syncOfflineData}
                  size="sm"
                  className="flex-1"
                  data-testid="button-sync-offline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
                <Button 
                  onClick={clearOfflineData}
                  variant="outline"
                  size="sm"
                  data-testid="button-clear-offline"
                >
                  Clear
                </Button>
              </div>
            )}
            
            {offlineData.lastSync && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Last sync: {new Date(offlineData.lastSync).toLocaleString()}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}