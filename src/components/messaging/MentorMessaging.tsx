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
  FileText,
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
  attachment_path?: string | null;
  attachment_mime_type?: string | null;
}

interface MentorMessagingProps {
  mentorId?: string;
  asMentor?: boolean;
}

const isNeonStaging = process.env.NEXT_PUBLIC_MEROTALENT_BACKEND_MODE === "neon-staging";

const AttachmentPreview = ({ path, mimeType, conversationId, messageId }: {
  path: string; mimeType?: string | null; conversationId: string; messageId: string;
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (isNeonStaging) {
        try {
          const response = await fetch(`/api/v1/neon-staging/messaging/attachments?conversationId=${encodeURIComponent(conversationId)}&messageId=${encodeURIComponent(messageId)}`, { cache: "no-store" });
          if (!response.ok) throw new Error("Attachment unavailable");
          const body = await response.json();
          if (active) setUrl(body.data?.signedUrl ?? null);
        } catch { if (active) setFailed(true); }
        return;
      }
      const { data, error } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path, 300);
      if (active) setUrl(!error ? data?.signedUrl || null : null);
    })();
    return () => { active = false; };
  }, [path, conversationId, messageId]);

  if (!url) return <p className="text-xs opacity-80">{failed ? "Attachment unavailable or expired." : "Loading attachment…"}</p>;
  if (mimeType?.startsWith("image/")) {
    return <img src={url} alt="Message attachment" className="max-w-xs rounded-xl border my-1 object-cover" />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm underline">
      <FileText className="h-4 w-4" /> Open attachment
    </a>
  );
};

const MentorMessaging = ({ mentorId, asMentor = false }: MentorMessagingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, asMentor]);

  useEffect(() => {
    if (selectedConversation) {
      selectedIdRef.current = selectedConversation.id;
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

    if (isNeonStaging) {
      const cursorKey = `merotalent.message_cursor.${user?.id}`;
      const cursor = sessionStorage.getItem(cursorKey);
      const source = new EventSource(cursor && /^(0|[1-9][0-9]{0,18})$/.test(cursor)
        ? `/api/v1/realtime/stream?cursor=${cursor}` : "/api/v1/realtime/stream");
      source.addEventListener("message", (event) => {
        if (event.lastEventId) sessionStorage.setItem(cursorKey, event.lastEventId);
        try {
          const payload = JSON.parse(event.data) as { conversationId?: string };
          if (payload.conversationId === selectedConversation.id) {
            void fetchMessages(selectedConversation.id);
            void markMessagesAsRead(selectedConversation.id);
          }
          void fetchConversations();
        } catch { /* Ignore a malformed event; the reconnect snapshot still recovers. */ }
      });
      source.addEventListener("reconnect", () => {
        void fetchConversations();
        void fetchMessages(selectedConversation.id);
      });
      source.addEventListener("open", () => {
        void fetchConversations();
        void fetchMessages(selectedConversation.id);
      });
      const refresh = () => {
        if (document.visibilityState === "visible") {
          void fetchConversations();
          void fetchMessages(selectedConversation.id);
        }
      };
      document.addEventListener("visibilitychange", refresh);
      return () => { source.close(); document.removeEventListener("visibilitychange", refresh); };
    }

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

    if (isNeonStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/messaging", { cache: "no-store" });
        if (!response.ok) throw new Error(`Conversation request failed (${response.status}).`);
        const json = await response.json();
        const rows = (json.data ?? []) as Array<{
          id: string; mentor_id: string; mentee_id: string; is_active: boolean;
          other_name: string | null; other_avatar: string | null; last_message: string | null; unread_count: number;
        }>;
        setConversations(rows.filter((row) => asMentor ? row.mentee_id !== user.id : row.mentee_id === user.id)
          .map((row) => ({ ...row, mentor: { id: row.mentor_id, user_id: row.mentee_id === user.id ? "" : user.id,
            profile: { full_name: row.mentee_id === user.id ? row.other_name : null,
              avatar_url: row.mentee_id === user.id ? row.other_avatar : null } },
            mentee_profile: row.mentee_id !== user.id ? { full_name: row.other_name, avatar_url: row.other_avatar } : undefined,
            last_message: row.last_message ?? undefined,
          })));
        setError(null);
      } catch {
        setError("Conversations could not be loaded. Please retry.");
      } finally { setIsLoading(false); }
      return;
    }

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

  const fetchMessages = async (conversationId: string, before?: string) => {
    if (isNeonStaging) {
      try {
        const url = `/api/v1/neon-staging/messaging?conversationId=${encodeURIComponent(conversationId)}` +
          (before ? `&before=${encodeURIComponent(before)}` : "");
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`Message request failed (${response.status}).`);
        const json = await response.json();
        if (selectedIdRef.current !== conversationId) return;
        const incoming = (json.data?.messages ?? []) as Message[];
        setMessages((current) => before ? [...incoming.filter((row) => !current.some((existing) => existing.id === row.id)), ...current] : incoming);
        setOlderCursor(typeof json.data?.nextCursor === "string" ? json.data.nextCursor : null);
        setError(null);
      } catch { setError("Messages could not be loaded. Please retry."); }
      return;
    }
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

    if (isNeonStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/messaging", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "mark-read", conversationId }),
        });
        if (!response.ok) throw new Error(`Mark read failed (${response.status}).`);
        void fetchConversations();
      } catch { setError("Could not update read status. Please retry."); }
      return;
    }

    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    if (error) console.error("Failed to mark messages read", error);
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    setIsSending(true);
    if (isNeonStaging) {
      try {
        const response = await fetch("/api/v1/neon-staging/messaging", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId: selectedConversation.id, content: newMessage.trim() }),
        });
        if (!response.ok) throw new Error(`Message send failed (${response.status}).`);
        const json = await response.json();
        setMessages((current) => current.some((row) => row.id === json.data.id) ? current : [...current, json.data]);
        setNewMessage("");
        setError(null);
        void fetchConversations();
      } catch {
        setError("Message was not sent. Please retry.");
        toast({ variant: "destructive", title: "Failed to send message" });
      } finally { setIsSending(false); }
      return;
    }
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
      {error && <div role="alert" className="sr-only">{error}</div>}
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
            {error && <button type="button" onClick={() => void fetchConversations()} className="mx-4 my-2 text-sm text-destructive underline">{error} Retry</button>}
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
                  onClick={() => { selectedIdRef.current = conv.id; setMessages([]); setOlderCursor(null); setSelectedConversation(conv); }}
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
                  {isNeonStaging && olderCursor && (
                    <button type="button" className="mx-auto block text-sm text-primary underline" onClick={() => void fetchMessages(selectedConversation.id, olderCursor)}>
                      Load older messages
                    </button>
                  )}
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
                          {message.attachment_path ? (
                            <AttachmentPreview path={message.attachment_path} mimeType={message.attachment_mime_type}
                              conversationId={message.conversation_id} messageId={message.id} />
                          ) : message.content.startsWith("[IMAGE]:") ? (
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
                <label className="cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900" aria-label="Attach a file">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !user || !selectedConversation) return;

                      if (file.size > 5 * 1024 * 1024) {
                        toast({ variant: "destructive", title: "Attachment is too large", description: "Choose a file up to 5 MB." });
                        e.target.value = "";
                        return;
                      }
                      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
                      if (!allowedTypes.includes(file.type)) {
                        toast({ variant: "destructive", title: "Unsupported attachment", description: "Use JPG, PNG, WebP, or PDF." });
                        e.target.value = "";
                        return;
                      }
                      setIsSending(true);
                      try {
                        if (isNeonStaging) {
                          const form = new FormData();
                          form.set("conversationId", selectedConversation.id);
                          form.set("file", file);
                          const sent = await new Promise<Message>((resolve, reject) => {
                            const xhr = new XMLHttpRequest();
                            xhr.open("POST", "/api/v1/neon-staging/messaging/attachments");
                            xhr.upload.onprogress = (event) => {
                              if (event.lengthComputable) setUploadProgress(Math.round(event.loaded / event.total * 100));
                            };
                            xhr.onload = () => {
                              try {
                                const body = JSON.parse(xhr.responseText);
                                if (xhr.status !== 201 || !body.data) throw new Error(body.error || "Upload failed");
                                resolve(body.data as Message);
                              } catch (error) { reject(error); }
                            };
                            xhr.onerror = () => reject(new Error("Network error"));
                            xhr.send(form);
                          });
                          setMessages((current) => current.some((row) => row.id === sent.id) ? current : [...current, sent]);
                          setError(null);
                          toast({ title: "Attachment sent" });
                          return;
                        }
                        const fileExt = file.name.split(".").pop()?.toLowerCase();
                        if (!fileExt) throw new Error("The attachment needs a file extension.");
                        const filePath = `${user.id}/chat_attachment/${selectedConversation.id}/${crypto.randomUUID()}.${fileExt}`;
                        const { error: uploadErr } = await supabase.storage
                          .from("chat-attachments")
                          .upload(filePath, file, { contentType: file.type, upsert: false });
                        if (uploadErr) throw uploadErr;

                        const receiverId = asMentor
                          ? selectedConversation.mentee_id
                          : selectedConversation.mentor.user_id;

                        const { error: sendError } = await (supabase as any).from("messages").insert({
                          conversation_id: selectedConversation.id,
                          sender_id: user.id,
                          receiver_id: receiverId,
                          content: `[ATTACHMENT] ${file.name}`,
                          attachment_path: filePath,
                          attachment_mime_type: file.type,
                        });
                        if (sendError) {
                          await supabase.storage.from("chat-attachments").remove([filePath]);
                          throw sendError;
                        }

                        // Refresh messages so image shows up immediately
                        await fetchMessages(selectedConversation.id);
                        toast({ title: "Attachment sent!" });
                      } catch {
                        toast({ variant: "destructive", title: "Attachment was not sent", description: "Your text message is unchanged. Please retry the file." });
                      } finally {
                        setIsSending(false);
                        setUploadProgress(null);
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
              {uploadProgress !== null && <p role="status" className="text-xs text-muted-foreground">Uploading attachment: {uploadProgress}%</p>}
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
