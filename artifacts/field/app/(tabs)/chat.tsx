import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const SAFETY_KEYWORDS = ["safety", "accident", "hazard", "injury", "incident", "emergency", "hurt", "fire", "fall", "electric"];

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

export default function ChatTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);

  const [senderName, setSenderName] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState("");

  const [message, setMessage] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<string>("image/jpeg");
  const [sending, setSending] = useState(false);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["field-chat", projectId],
    queryFn: async () => {
      const url = projectId
        ? `${BASE_URL}/api/chat-messages?projectId=${projectId}`
        : `${BASE_URL}/api/chat-messages`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 3000,
    enabled: nameSet,
  });

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow photo access to share site photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoType(result.assets[0].mimeType ?? "image/jpeg");
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow camera access to take site photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoType(result.assets[0].mimeType ?? "image/jpeg");
    }
  };

  const handlePhotoPress = () => {
    if (Platform.OS === "web") {
      handlePickPhoto();
    } else {
      Alert.alert("Add Photo", "", [
        { text: "Take Photo", onPress: handleTakePhoto },
        { text: "Choose from Library", onPress: handlePickPhoto },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !photoUri) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("senderName", senderName);
      fd.append("message", message.trim() || "📷 Site photo");
      if (projectId) fd.append("projectId", String(projectId));
      if (projectName) fd.append("projectName", projectName);
      if (photoUri) {
        const filename = photoUri.split("/").pop() ?? "photo.jpg";
        fd.append("photo", { uri: photoUri, name: filename, type: photoType } as any);
      }
      const res = await fetch(`${BASE_URL}/api/chat-messages`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Failed to send");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMessage("");
      setPhotoUri(null);
      qc.invalidateQueries({ queryKey: ["field-chat"] });
      scrollRef.current?.scrollToEnd({ animated: true });
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Send Failed", "Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const hasSafetyWord = SAFETY_KEYWORDS.some((kw) => message.toLowerCase().includes(kw));
  const s = styles(colors);

  if (!nameSet) {
    return (
      <View style={[s.container, s.center, { paddingTop: insets.top }]}>
        <Feather name="message-square" size={48} color={colors.primary} style={{ marginBottom: 20 }} />
        <Text style={[s.title, { textAlign: "center" }]}>Field Chat</Text>
        <Text style={[s.sub, { textAlign: "center", marginTop: 8, marginBottom: 28, maxWidth: 280 }]}>
          Talk between job sites, share photos, and stay coordinated.{"\n"}Enter your name to get started.
        </Text>
        <TextInput
          style={[s.nameInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          placeholder="Your name (e.g. Mike — Site Lead)"
          placeholderTextColor={colors.mutedForeground}
          value={nameInput}
          onChangeText={setNameInput}
          autoFocus
          onSubmitEditing={() => {
            if (nameInput.trim()) {
              setSenderName(nameInput.trim());
              setNameSet(true);
            }
          }}
        />
        <TouchableOpacity
          style={[s.primaryBtn, { backgroundColor: nameInput.trim() ? colors.primary : colors.muted, marginTop: 12 }]}
          onPress={() => {
            if (nameInput.trim()) {
              setSenderName(nameInput.trim());
              setNameSet(true);
            }
          }}
          disabled={!nameInput.trim()}
        >
          <Text style={[s.primaryBtnText, { color: nameInput.trim() ? "#fff" : colors.mutedForeground }]}>
            Enter Chat
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={insets.bottom + 10}
    >
      <View style={[s.chatHeader, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[s.chatHeaderTitle, { color: colors.foreground }]}>
            Field Chat
          </Text>
          <Text style={[s.chatHeaderSub, { color: colors.mutedForeground }]}>
            You: {senderName}{projectName ? ` · ${projectName}` : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: colors.muted }]}
            onPress={() => setNameSet(false)}
          >
            <Feather name="user" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[s.projectBar, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
        <Feather name="map-pin" size={13} color={colors.mutedForeground} />
        <TextInput
          style={[s.projectInput, { color: colors.foreground }]}
          placeholder="Job site / project name (optional)"
          placeholderTextColor={colors.mutedForeground}
          value={projectName}
          onChangeText={setProjectName}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 4 }}
      >
        {isLoading && (
          <View style={s.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
        {!isLoading && messages.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Feather name="message-circle" size={40} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
            <Text style={[s.sub, { marginTop: 12, textAlign: "center" }]}>No messages yet.{"\n"}Send the first message to your crew.</Text>
          </View>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderName === senderName;
          const isBot = msg.isSystemReply;
          const photoFullUrl = msg.photoUrl
            ? msg.photoUrl.startsWith("http") ? msg.photoUrl : `${BASE_URL}${msg.photoUrl}`
            : null;
          return (
            <View
              key={msg.id}
              style={[
                s.msgRow,
                isMine && !isBot ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" },
                { maxWidth: "82%" },
              ]}
            >
              {isBot ? (
                <View style={[s.msgBubble, s.botBubble]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Feather name="alert-triangle" size={13} color="#dc2626" />
                    <Text style={s.botName}>Safety Bot</Text>
                  </View>
                  <Text style={s.botText}>{msg.message}</Text>
                </View>
              ) : (
                <View
                  style={[
                    s.msgBubble,
                    isMine
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                    msg.safetyFlag && !isMine ? s.safetyBubble : undefined,
                  ]}
                >
                  {!isMine && (
                    <Text style={[s.msgSender, { color: colors.primary }]}>{msg.senderName}</Text>
                  )}
                  {photoFullUrl && (
                    <Image
                      source={{ uri: photoFullUrl }}
                      style={s.msgImage}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={[s.msgText, { color: isMine ? "#fff" : colors.foreground }]}>
                    {msg.message}
                  </Text>
                  <Text style={[s.msgTime, { color: isMine ? "rgba(255,255,255,0.6)" : colors.mutedForeground }]}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={[s.composer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        {hasSafetyWord && (
          <View style={s.safetyWarning}>
            <Feather name="alert-triangle" size={12} color="#f59e0b" />
            <Text style={s.safetyWarningText}>Safety keyword detected — a safety alert will auto-send</Text>
          </View>
        )}
        {photoUri && (
          <View style={s.photoPreviewRow}>
            <Image source={{ uri: photoUri }} style={s.photoPreview} resizeMode="cover" />
            <TouchableOpacity style={s.removePhoto} onPress={() => setPhotoUri(null)}>
              <Feather name="x" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        <View style={s.inputRow}>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: colors.muted }]}
            onPress={handlePhotoPress}
          >
            <Feather name="camera" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TextInput
            style={[s.messageInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Message crew…"
            placeholderTextColor={colors.mutedForeground}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: (message.trim() || photoUri) ? colors.primary : colors.muted }]}
            onPress={handleSend}
            disabled={sending || (!message.trim() && !photoUri)}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={18} color={(message.trim() || photoUri) ? "#fff" : colors.mutedForeground} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    sub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    nameInput: { width: "100%", maxWidth: 320, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
    primaryBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, alignItems: "center", width: "100%", maxWidth: 320 },
    primaryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    chatHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    chatHeaderTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
    chatHeaderSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
    projectBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1 },
    projectInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
    iconBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    msgRow: { marginBottom: 4 },
    msgBubble: { borderRadius: 14, padding: 10, maxWidth: "100%" },
    botBubble: { backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecaca", padding: 12 },
    safetyBubble: { backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa" },
    botName: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#dc2626" },
    botText: { fontSize: 13, color: "#7f1d1d", fontFamily: "Inter_500Medium", lineHeight: 19 },
    msgSender: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
    msgImage: { width: "100%", height: 160, borderRadius: 8, marginBottom: 6 },
    msgText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
    msgTime: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 4, textAlign: "right" },
    composer: { borderTopWidth: 1, paddingTop: 8, paddingHorizontal: 12 },
    safetyWarning: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fef3c7", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6 },
    safetyWarningText: { fontSize: 11, color: "#92400e", fontFamily: "Inter_500Medium", flex: 1 },
    photoPreviewRow: { position: "relative", marginBottom: 8, alignSelf: "flex-start" },
    photoPreview: { width: 72, height: 72, borderRadius: 8 },
    removePhoto: { position: "absolute", top: -6, right: -6, backgroundColor: "#374151", borderRadius: 10, padding: 3 },
    inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
    messageInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, maxHeight: 100, fontFamily: "Inter_400Regular" },
    sendBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  });
