import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  BellRing, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  MessageCircle,
  FileText,
  AlertTriangle,
  X,
  MarkAsUnread
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'survey_update' | 'message' | 'system' | 'compliance_alert' | 'due_date';
  relatedId?: string;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  deliveryMethod: string[];
  sentAt?: string;
  createdAt: string;
}

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'high_priority'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["/api/notifications", filter],
    queryFn: () => apiRequest("GET", `/api/notifications?filter=${filter}`),
    enabled: isOpen,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest("PUT", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PUT", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Notifications Updated",
        description: "All notifications marked as read.",
      });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest("DELETE", `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'survey_update': return <FileText className="h-4 w-4" />;
      case 'message': return <MessageCircle className="h-4 w-4" />;
      case 'compliance_alert': return <AlertTriangle className="h-4 w-4" />;
      case 'due_date': return <Clock className="h-4 w-4" />;
      case 'system': return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'survey_update': return 'text-blue-600';
      case 'message': return 'text-green-600';
      case 'compliance_alert': return 'text-red-600';
      case 'due_date': return 'text-yellow-600';
      case 'system': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const filteredNotifications = notifications?.filter((notification: Notification) => {
    if (filter === 'unread' && notification.isRead) return false;
    if (filter === 'high_priority' && !['high', 'urgent'].includes(notification.priority)) return false;
    return true;
  });

  const unreadCount = notifications?.filter((n: Notification) => !n.isRead)?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-red-100 text-red-800">
                {unreadCount} unread
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Stay updated with your surveys, messages, and system alerts
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === 'unread' ? 'default' : 'outline'}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </Button>
            <Button
              size="sm"
              variant={filter === 'high_priority' ? 'default' : 'outline'}
              onClick={() => setFilter('high_priority')}
            >
              High Priority
            </Button>
          </div>

          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark All Read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px] w-full">
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-gray-500">Loading notifications...</div>
            </div>
          ) : filteredNotifications?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications?.map((notification: Notification) => (
                <Card 
                  key={notification.id} 
                  className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    !notification.isRead ? 'border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsReadMutation.mutate(notification.id);
                    }
                    if (notification.actionUrl) {
                      window.location.href = notification.actionUrl;
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex gap-3 flex-1">
                        <div className={`p-2 rounded-full ${getTypeColor(notification.type)} bg-opacity-10`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className={`font-medium ${!notification.isRead ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </h4>
                            <div className="flex gap-2 items-center">
                              <Badge className={getPriorityColor(notification.priority)} variant="outline">
                                {notification.priority}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotificationMutation.mutate(notification.id);
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {notification.content}
                          </p>
                          
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>{new Date(notification.createdAt).toLocaleString()}</span>
                            <div className="flex items-center gap-2">
                              {!notification.isRead && (
                                <Badge className="bg-blue-100 text-blue-800" variant="outline">
                                  Unread
                                </Badge>
                              )}
                              <Badge className={`${getTypeColor(notification.type)} bg-opacity-10`} variant="outline">
                                {notification.type.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Notification Bell Icon Component for Header
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications", "unread"],
    queryFn: () => apiRequest("GET", "/api/notifications?filter=unread"),
    refetchInterval: 30000,
  });

  const unreadCount = notifications?.length || 0;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(true)}
        data-testid="button-notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500 text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>
      
      <NotificationCenter isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}