import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  MessageCircle,
  Lock,
  Clock,
  CheckCheck,
  Search,
  MoreVertical,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";

interface Conversation {
  id: string;
  mentor_id: string;
  mentee_id: string;
  is_active: boolean;
  mentor: {
    id: string;
    user_id: string;
    profile: {
      full_name: string | null;
      avatar_url: string | null;
    };
  };
  mentee_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  last_message?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface MentorMessagingProps {
  mentorId?: string;
  asMentor?: boolean;
}

const MentorMessaging = ({ mentorId, asMentor = false }: MentorMessagingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, asMentor]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          if (newMsg.sender_id !== user?.id) {
            markMessagesAsRead(selectedConversation.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, user]);

  const fetchConversations = async () => {
    if (!user) return;

    let query = supabase
      .from("conversations")
      .select(`
        *,
        mentor:mentors(
          id,
          user_id
        )
      `)
      .eq("is_active", true);

    if (asMentor) {
      // Get the mentor record for current user
      const { data: mentorData } = await supabase
        .from("mentors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (mentorData) {
        query = query.eq("mentor_id", mentorData.id);
      }
    } else {
      query = query.eq("mentee_id", user.id);
    }

    const { data } = await query;

    if (data) {
      // Fetch profile info for each conversation
      const conversationsWithProfiles = await Promise.all(
        data.map(async (conv) => {
          // Get mentor profile
          const { data: mentorProfile } = await supabase
            .from("public_profile_directory")
            .select("full_name, avatar_url")
            .eq("user_id", conv.mentor.user_id)
            .single();

          // Get mentee profile
          const { data: menteeProfile } = await supabase
            .from("public_profile_directory")
            .select("full_name, avatar_url")
            .eq("user_id", conv.mentee_id)
            .single();

          // Get last message
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("receiver_id", user.id)
            .eq("is_read", false);

          return {
            ...conv,
            mentor: {
              ...conv.mentor,
              profile: mentorProfile || { full_name: null, avatar_url: null },
            },
            mentee_profile: menteeProfile,
            last_message: lastMsg?.content,
            unread_count: count || 0,
          };
        })
      );

      setConversations(conversationsWithProfiles);
    }
    setIsLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return;

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    setIsSending(true);
    const receiverId = asMentor
      ? selectedConversation.mentee_id
      : selectedConversation.mentor.user_id;

    const { error } = await supabase.from("messages").insert({
      conversation_id: selectedConversation.id,
      sender_id: user.id,
      receiver_id: receiverId,
      content: newMessage.trim(),
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error.message,
      });
    } else {
      setNewMessage("");
    }
    setIsSending(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const filteredConversations = conversations.filter((conv) => {
    const name = asMentor
      ? conv.mentee_profile?.full_name
      : conv.mentor.profile?.full_name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getDisplayName = (conv: Conversation) => {
    return asMentor
      ? conv.mentee_profile?.full_name || "Student"
      : conv.mentor.profile?.full_name || "Mentor";
  };

  const getAvatar = (conv: Conversation) => {
    return asMentor
      ? conv.mentee_profile?.avatar_url
      : conv.mentor.profile?.avatar_url;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Conversations List */}
      <Card className="w-80 flex-shrink-0 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Messages
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-340px)]">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-1">
                  Messages are available after a paid session
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border/50 text-left ${
                    selectedConversation?.id === conv.id ? "bg-primary/5" : ""
                  }`}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={getAvatar(conv) || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                      {getDisplayName(conv).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{getDisplayName(conv)}</p>
                      {conv.unread_count! > 0 && (
                        <Badge className="ml-2">{conv.unread_count}</Badge>
                      )}
                    </div>
                    {conv.last_message && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 border-border/50 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={getAvatar(selectedConversation) || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                      {getDisplayName(selectedConversation).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{getDisplayName(selectedConversation)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {asMentor ? "Student" : "Mentor"}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          }`}
                        >
                          {message.content.startsWith("[IMAGE]:") ? (
                            <img
                              src={message.content.replace("[IMAGE]:", "")}
                              alt="Attachment"
                              className="max-w-xs rounded-xl border my-1 object-cover"
                            />
                          ) : (
                            <p className="text-sm">{message.content}</p>
                          )}
                          <div
                            className={`flex items-center gap-1 mt-1 text-xs ${
                              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {format(new Date(message.created_at), "HH:mm")}
                            {isOwn && message.is_read && (
                              <CheckCheck className="w-3 h-3 ml-1" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* Message Input */}
            <div className="p-4 border-t space-y-2">
              <div className="flex gap-2 items-center">
                <label className="cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !user || !selectedConversation) return;

                      setIsSending(true);
                      try {
                        const fileExt = file.name.split(".").pop();
                        const filePath = `${selectedConversation.id}/${Date.now()}.${fileExt}`;
                        const { error: uploadErr } = await supabase.storage
                          .from("chat-attachments")
                          .upload(filePath, file);

                        let imageUrl = "";
                        if (!uploadErr) {
                          const { data: publicUrlData } = supabase.storage
                            .from("chat-attachments")
                            .getPublicUrl(filePath);
                          imageUrl = publicUrlData.publicUrl;
                        } else {
                          // Fallback data URL
                          imageUrl = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.readAsDataURL(file);
                          });
                        }

                        const receiverId = asMentor
                          ? selectedConversation.mentee_id
                          : selectedConversation.mentor.user_id;

                        await supabase.from("messages").insert({
                          conversation_id: selectedConversation.id,
                          sender_id: user.id,
                          receiver_id: receiverId,
                          content: `[IMAGE]:${imageUrl}`,
                        });

                        // Refresh messages so image shows up immediately
                        await fetchMessages(selectedConversation.id);
                        toast({ title: "Image sent!" });
                      } catch {
                        toast({ variant: "destructive", title: "Image upload failed" });
                      } finally {
                        setIsSending(false);
                        // Reset the file input so the same file can be re-selected
                        e.target.value = "";
                      }
                    }}
                  />
                  <ImageIcon className="w-5 h-5" />
                </label>

                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  disabled={isSending}
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim() || isSending}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a conversation to start messaging</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MentorMessaging;
