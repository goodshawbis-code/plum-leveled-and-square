import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  AlertTriangle,
  Image as ImageIcon,
  RefreshCw,
  Users,
  Shield,
  Bot,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getApiUrl } from "@/lib/utils";

interface ChatMessage {
  id: number;
  projectId: number | null;
  projectName: string | null;
  senderName: string;
  message: string;
  photoUrl: string | null;
  isSystemReply: boolean;
  safetyFlag: boolean;
  createdAt: string;
}

interface ProjectEntry {
  projectId: number;
  projectName: string | null;
}

export default function FieldChat() {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useQuery<ProjectEntry[]>({
    queryKey: ["chat-projects"],
    queryFn: async () => {
      const res = await fetch(getApiUrl("/api/chat-messages/projects"));
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: messages = [], isLoading, isFetching } = useQuery<ChatMessage[]>({
    queryKey: ["chat-messages", selectedProject],
    queryFn: async () => {
      const url =
        selectedProject !== "all"
          ? getApiUrl(`/api/chat-messages?projectId=${selectedProject}`)
          : getApiUrl("/api/chat-messages");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const safetyCount = messages.filter((m) => m.safetyFlag && !m.isSystemReply).length;
  const projectsWithActivity = projects.length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Field Chat Monitor</h1>
            <p className="text-sm text-muted-foreground">
              Read-only view of foreman communications across all job sites
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isFetching && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
          Live (refreshing every 3s)
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Messages</p>
          <p className="text-3xl font-bold">{messages.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Active Job Sites</p>
          <p className="text-3xl font-bold text-primary">{projectsWithActivity}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Safety Flags</p>
          <p className={`text-3xl font-bold ${safetyCount > 0 ? "text-red-600" : "text-green-600"}`}>
            {safetyCount}
          </p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Messages
            </CardTitle>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-52 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Job Sites</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.projectId} value={String(p.projectId)}>
                    {p.projectName ?? `Project #${p.projectId}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] overflow-y-auto space-y-3 pr-1">
            {isLoading && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Loading messages…
              </div>
            )}
            {!isLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-10 w-10 opacity-20 mb-3" />
                <p className="text-sm">No messages yet. Foremen chat from the Foreman Live app.</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg p-3 ${
                  msg.isSystemReply
                    ? "bg-red-50 border border-red-200"
                    : msg.safetyFlag
                    ? "bg-amber-50 border border-amber-200"
                    : "bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {msg.isSystemReply ? (
                    <Bot className="h-3.5 w-3.5 text-red-600" />
                  ) : msg.safetyFlag ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={`font-semibold text-xs ${msg.isSystemReply ? "text-red-700" : msg.safetyFlag ? "text-amber-700" : "text-foreground"}`}>
                    {msg.senderName}
                  </span>
                  {msg.projectName && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                      {msg.projectName}
                    </Badge>
                  )}
                  {msg.safetyFlag && !msg.isSystemReply && (
                    <Badge className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0 h-4">Safety</Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className={`text-sm ${msg.isSystemReply ? "text-red-800 font-medium" : ""}`}>
                  {msg.message}
                </p>
                {msg.photoUrl && (
                  <a
                    href={getApiUrl(msg.photoUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block"
                  >
                    <img
                      src={getApiUrl(msg.photoUrl)}
                      alt="Site photo"
                      className="rounded-md max-h-48 object-cover border"
                    />
                  </a>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
