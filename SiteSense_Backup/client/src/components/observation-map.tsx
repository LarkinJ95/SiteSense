import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Play, Pause, RotateCcw, Zap, ExternalLink } from "lucide-react";
import type { Observation } from "@shared/schema";

interface ObservationMapProps {
  observations: Observation[];
  className?: string;
}

export function ObservationMap({ observations, className = "" }: ObservationMapProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 means show all
  const [playSpeed, setPlaySpeed] = useState(2000); // milliseconds
  const intervalRef = useRef<NodeJS.Timeout>();
  
  const gpsObservations = observations.filter(obs => obs.latitude && obs.longitude);
  
  useEffect(() => {
    if (isPlaying && gpsObservations.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= gpsObservations.length - 1) {
            setIsPlaying(false);
            return -1; // Return to show all
          }
          return prev + 1;
        });
      }, playSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, gpsObservations.length, playSpeed]);
  
  const handlePlay = () => {
    if (gpsObservations.length === 0) return;
    
    if (!isPlaying) {
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };
  
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(-1);
  };
  
  const getRiskBadge = (riskLevel: string | null) => {
    const variants = {
      high: "bg-red-500 text-white",
      medium: "bg-yellow-500 text-white", 
      low: "bg-green-500 text-white",
    };
    
    return (
      <Badge className={variants[riskLevel as keyof typeof variants] || "bg-gray-500 text-white"}>
        {riskLevel || 'Not assessed'}
      </Badge>
    );
  };
  
  const openInMaps = (lat: string, lng: string) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };
  
  if (gpsObservations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            GPS Map View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">No GPS-tagged observations available</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Add observations with GPS coordinates to see them on the map
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate center point for initial map view
  const avgLat = gpsObservations.reduce((sum, obs) => sum + parseFloat(obs.latitude!), 0) / gpsObservations.length;
  const avgLng = gpsObservations.reduce((sum, obs) => sum + parseFloat(obs.longitude!), 0) / gpsObservations.length;
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-gray-900 dark:text-gray-100">
            <MapPin className="h-5 w-5 mr-2" />
            GPS Observation Locations ({gpsObservations.length} locations)
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlaySpeed(playSpeed === 1000 ? 2000 : playSpeed === 2000 ? 3000 : 1000)}
              data-testid="button-speed-toggle"
            >
              <Zap className="h-4 w-4 mr-1" />
              {playSpeed === 1000 ? 'Fast' : playSpeed === 2000 ? 'Normal' : 'Slow'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={currentIndex === -1 && !isPlaying}
              data-testid="button-reset-animation"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant={isPlaying ? "secondary" : "default"}
              size="sm"
              onClick={handlePlay}
              data-testid="button-play-pause"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openInMaps(avgLat.toString(), avgLng.toString())}
              data-testid="button-open-maps"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Interactive GPS Observations List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {gpsObservations.map((observation, index) => {
            const isCurrentlyHighlighted = currentIndex === index;
            const isVisible = currentIndex === -1 || currentIndex >= index;
            
            return (
              <div
                key={observation.id}
                className={`p-4 border rounded-lg transition-all duration-500 ${
                  isCurrentlyHighlighted 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400 shadow-lg transform scale-105' 
                    : isVisible 
                      ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800' 
                      : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-50'
                }`}
                data-testid={`observation-${observation.id}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm flex items-center text-gray-900 dark:text-gray-100">
                    <div 
                      className={`w-4 h-4 rounded-full mr-2 border-2 border-white shadow-sm ${
                        observation.riskLevel === 'high' ? 'bg-red-500' :
                        observation.riskLevel === 'medium' ? 'bg-yellow-500' :
                        observation.riskLevel === 'low' ? 'bg-green-500' : 'bg-gray-500'
                      } ${isCurrentlyHighlighted ? 'animate-pulse' : ''}`}
                    />
                    {observation.area}
                  </h4>
                  <div className="flex items-center space-x-2">
                    {getRiskBadge(observation.riskLevel)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInMaps(observation.latitude!, observation.longitude!)}
                      data-testid={`button-open-location-${observation.id}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <div>
                    <span className="font-medium">Material:</span> {observation.materialType}
                  </div>
                  <div>
                    <span className="font-medium">Condition:</span> {observation.condition}
                  </div>
                  {observation.quantity && (
                    <div>
                      <span className="font-medium">Quantity:</span> {observation.quantity}
                    </div>
                  )}
                  {observation.sampleCollected && (
                    <div className="text-blue-600 dark:text-blue-400">
                      <span className="font-medium">Sample ID:</span> {observation.sampleId || 'Not specified'}
                    </div>
                  )}
                </div>
                
                {observation.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 text-xs">
                    <span className="font-medium text-gray-900 dark:text-gray-100">Notes:</span>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">{observation.notes}</p>
                  </div>
                )}
                
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                  <span>GPS: {parseFloat(observation.latitude!).toFixed(6)}, {parseFloat(observation.longitude!).toFixed(6)}</span>
                  <span className="text-blue-600 dark:text-blue-400">#{index + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Animation Status */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              {currentIndex === -1 
                ? `Showing all ${gpsObservations.length} observations`
                : `Animation: ${currentIndex + 1} / ${gpsObservations.length}`
              }
            </div>
            {currentIndex >= 0 && currentIndex < gpsObservations.length && (
              <div className="text-right">
                <div className="font-medium">{gpsObservations[currentIndex].area}</div>
                <div className="text-xs text-gray-500">{gpsObservations[currentIndex].materialType}</div>
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          {currentIndex >= 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${((currentIndex + 1) / gpsObservations.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}