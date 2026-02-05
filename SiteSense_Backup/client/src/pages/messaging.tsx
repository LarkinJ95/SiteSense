import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Search,
  Paperclip,
  MoreVertical,
  Users,
  Clock,
  AlertCircle,
  CheckCheck,
  Reply,
  Forward,
  Archive
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  fromUserId: string;
  toUserId?: string;
  surveyId?: string;
  subject: string;
  content: string;
  messageType: 'direct' | 'survey_comment' | 'system_alert';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  readAt?: string;
  attachmentUrl?: string;
  parentMessageId?: string;
  createdAt: string;
  fromUser?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  toUser?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  survey?: {
    siteName: string;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function Messaging() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageFilter, setMessageFilter] = useState("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newMessage, setNewMessage] = useState({
    toUserId: "",
    subject: "",
    content: "",
    priority: "normal" as const,
    surveyId: "",
  });

  const [replyContent, setReplyContent] = useState("");

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ["/api/messages", messageFilter],
    queryFn: () => apiRequest("GET", `/api/messages?filter=${messageFilter}`),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch users for compose
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => apiRequest("GET", "/api/users"),
  });

  // Fetch surveys for reference
  const { data: surveys } = useQuery({
    queryKey: ["/api/surveys"],
    queryFn: () => apiRequest("GET", "/api/surveys"),
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: typeof newMessage) => {
      return await apiRequest("POST", "/api/messages", messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      setIsComposeModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    },
  });

  // Reply to message mutation
  const replyMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      return await apiRequest("POST", `/api/messages/${messageId}/reply`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setReplyContent("");
      toast({
        title: "Reply Sent",
        description: "Your reply has been sent.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send reply.",
        variant: "destructive",
      });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest("PUT", `/api/messages/${messageId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const resetForm = () => {
    setNewMessage({
      toUserId: "",
      subject: "",
      content: "",
      priority: "normal",
      surveyId: "",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const filteredMessages = messages?.filter((message: Message) => {
    if (messageFilter === 'unread' && message.isRead) return false;
    if (messageFilter === 'high_priority' && !['high', 'urgent'].includes(message.priority)) return false;
    if (searchQuery && !message.subject.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !message.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const conversationMessages = messages?.filter((message: Message) => 
    message.id === selectedConversation || message.parentMessageId === selectedConversation
  ) || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  // Mark message as read when selected
  useEffect(() => {
    if (selectedConversation) {
      const message = messages?.find((m: Message) => m.id === selectedConversation);
      if (message && !message.isRead) {
        markAsReadMutation.mutate(selectedConversation);
      }
    }
  }, [selectedConversation]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading messages...</div>;
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex">
      {/* Message List Sidebar */}
      <div className="w-1/3 border-r bg-white dark:bg-gray-900">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <Button 
              size="sm"
              onClick={() => setIsComposeModalOpen(true)}
              data-testid="button-compose-message"
            >
              <Plus className="h-4 w-4 mr-2" />
              Compose
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <Input 
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-messages"
              />
            </div>
            
            <Select value={messageFilter} onValueChange={setMessageFilter}>
              <SelectTrigger data-testid="select-message-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="high_priority">High Priority</SelectItem>
                <SelectItem value="survey_comments">Survey Comments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-y-auto h-full pb-20">
          {filteredMessages?.map((message: Message) => (
            <div
              key={message.id}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                selectedConversation === message.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => setSelectedConversation(message.id)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {message.fromUser ? getInitials(message.fromUser.firstName, message.fromUser.lastName) : 'SY'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">
                        {message.fromUser ? `${message.fromUser.firstName} ${message.fromUser.lastName}` : 'System'}
                      </p>
                      <p className={`text-sm ${!message.isRead ? 'font-medium' : 'text-gray-600'}`}>
                        {message.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!message.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                      <Badge className={getPriorityColor(message.priority)} variant="outline">
                        {message.priority}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {message.content.substring(0, 60)}...
                  </p>
                  
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {new Date(message.createdAt).toLocaleDateString()}
                    </span>
                    {message.survey && (
                      <Badge variant="outline" className="text-xs">
                        {message.survey.siteName}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Detail/Conversation */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b bg-white dark:bg-gray-900">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">
                    {conversationMessages[0]?.subject}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {conversationMessages.length} message(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversationMessages.map((message: Message) => (
                <div key={message.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="text-xs">
                      {message.fromUser ? getInitials(message.fromUser.firstName, message.fromUser.lastName) : 'SY'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-sm">
                          {message.fromUser ? `${message.fromUser.firstName} ${message.fromUser.lastName}` : 'System'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {message.attachmentUrl && (
                        <div className="mt-2 p-2 bg-white dark:bg-gray-700 rounded border">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">Attachment</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setReplyContent(`@${message.fromUser?.firstName} ${message.fromUser?.lastName} `);
                        }}
                      >
                        <Reply className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Forward className="h-3 w-3 mr-1" />
                        Forward
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t bg-white dark:bg-gray-900">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="min-h-[80px]"
                  data-testid="textarea-reply"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => replyMutation.mutate({ 
                      messageId: selectedConversation, 
                      content: replyContent 
                    })}
                    disabled={!replyContent.trim() || replyMutation.isPending}
                    data-testid="button-send-reply"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a message to start the conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Message Modal */}
      <Dialog open={isComposeModalOpen} onOpenChange={setIsComposeModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compose New Message</DialogTitle>
            <DialogDescription>
              Send a message to team members or add a survey comment
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="to-user">To</Label>
                <Select value={newMessage.toUserId} onValueChange={(value) => setNewMessage({ ...newMessage, toUserId: value })}>
                  <SelectTrigger data-testid="select-message-recipient">
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user: User) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newMessage.priority} onValueChange={(value) => setNewMessage({ ...newMessage, priority: value as any })}>
                  <SelectTrigger data-testid="select-message-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="survey-reference">Survey Reference (Optional)</Label>
              <Select value={newMessage.surveyId} onValueChange={(value) => setNewMessage({ ...newMessage, surveyId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Link to a survey (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {surveys?.map((survey: any) => (
                    <SelectItem key={survey.id} value={survey.id}>
                      {survey.siteName} - {survey.surveyType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input 
                id="subject"
                value={newMessage.subject}
                onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                placeholder="Message subject"
                data-testid="input-message-subject"
              />
            </div>

            <div>
              <Label htmlFor="content">Message</Label>
              <Textarea 
                id="content"
                value={newMessage.content}
                onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                placeholder="Type your message here..."
                className="min-h-[120px]"
                data-testid="textarea-message-content"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsComposeModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => sendMessageMutation.mutate(newMessage)}
                disabled={sendMessageMutation.isPending || !newMessage.toUserId || !newMessage.subject || !newMessage.content}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}