import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProjectComments,
  useCreateComment,
  useDeleteComment,
  getListProjectCommentsQueryKey,
} from "@workspace/api-client-react";
import type { SiteComment } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  gps: { label: "GPS", color: "#16a34a" },
  blueprint: { label: "Blueprint Pin", color: "#2563eb" },
  none: { label: "General", color: "#6b7280" },
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CommentCard({ comment, onDelete }: { comment: SiteComment; onDelete: () => void }) {
  const colors = useColors();
  const pin = PRIORITY_LABELS[comment.pinType] ?? PRIORITY_LABELS.none;

  return (
    <View style={[s.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={s.commentTop}>
        <View style={s.commentMeta}>
          <View style={[s.pinBadge, { backgroundColor: pin.color + "20" }]}>
            <Feather
              name={comment.pinType === "gps" ? "map-pin" : comment.pinType === "blueprint" ? "layers" : "message-circle"}
              size={10}
              color={pin.color}
            />
            <Text style={[s.pinBadgeText, { color: pin.color }]}>{pin.label}</Text>
          </View>
          <Text style={[s.commentAuthor, { color: colors.mutedForeground }]}>
            {comment.authorName} · {timeAgo(comment.createdAt)}
          </Text>
        </View>
        <TouchableOpacity
          hitSlop={10}
          onPress={onDelete}
          style={{ padding: 4 }}
        >
          <Feather name="trash-2" size={14} color={colors.destructive} />
        </TouchableOpacity>
      </View>
      <Text style={[s.commentContent, { color: colors.foreground }]}>{comment.content}</Text>
      {comment.locationLabel ? (
        <View style={s.locationRow}>
          <Feather name="navigation" size={11} color={colors.mutedForeground} />
          <Text style={[s.locationText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {comment.locationLabel}
          </Text>
        </View>
      ) : comment.locationLat && comment.locationLng ? (
        <View style={s.locationRow}>
          <Feather name="navigation" size={11} color={colors.mutedForeground} />
          <Text style={[s.locationText, { color: colors.mutedForeground }]}>
            {comment.locationLat.toFixed(5)}, {comment.locationLng.toFixed(5)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function CommentsView({ projectId }: { projectId: number }) {
  const colors = useColors();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useListProjectComments(projectId);
  const { mutateAsync: createComment } = useCreateComment();
  const { mutateAsync: deleteComment } = useDeleteComment();

  const [modalVisible, setModalVisible] = useState(false);
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("Foreman");
  const [pinType, setPinType] = useState<"none" | "gps">("none");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; label?: string } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function getLocation() {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to tag your position.");
        setGettingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const label = geo
        ? [geo.street, geo.city, geo.region].filter(Boolean).join(", ")
        : undefined;
      setGpsCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude, label });
      setPinType("gps");
    } catch {
      Alert.alert("Error", "Could not get location. Check permissions.");
    } finally {
      setGettingLocation(false);
    }
  }

  function clearGps() {
    setGpsCoords(null);
    setPinType("none");
  }

  function openModal() {
    setContent("");
    setAuthorName("Foreman");
    setPinType("none");
    setGpsCoords(null);
    setModalVisible(true);
  }

  async function handleSubmit() {
    if (!content.trim()) {
      Alert.alert("Missing", "Please enter comment text.");
      return;
    }
    setSubmitting(true);
    try {
      await createComment({
        id: projectId,
        data: {
          content: content.trim(),
          authorName: authorName.trim() || "Foreman",
          pinType,
          locationLat: gpsCoords?.lat,
          locationLng: gpsCoords?.lng,
          locationLabel: gpsCoords?.label,
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListProjectCommentsQueryKey(projectId) });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
    } catch {
      Alert.alert("Error", "Failed to save comment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    Alert.alert("Delete Comment", "Remove this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await deleteComment({ id });
            await queryClient.invalidateQueries({ queryKey: getListProjectCommentsQueryKey(projectId) });
          } catch {
            Alert.alert("Error", "Failed to delete comment.");
          }
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s.headerRow}>
        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>
          COMMENTS · {comments?.length ?? 0}
        </Text>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.primary }]}
          onPress={openModal}
        >
          <Feather name="plus" size={14} color={colors.primaryForeground} />
          <Text style={[s.addBtnText, { color: colors.primaryForeground }]}>New Comment</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : !comments || comments.length === 0 ? (
        <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="message-circle" size={36} color={colors.mutedForeground} />
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>No Comments Yet</Text>
          <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
            Tap "New Comment" to log a note, tag your GPS location, or flag something on the blueprint.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {comments.map((c) => (
            <CommentCard key={c.id} comment={c} onDelete={() => handleDelete(c.id)} />
          ))}
        </View>
      )}

      {/* Add Comment Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={[s.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity hitSlop={12} onPress={() => setModalVisible(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>New Comment</Text>
            <TouchableOpacity
              hitSlop={8}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[s.modalSave, { color: colors.primary }]}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20 }}>
            {/* Author */}
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Your Name</Text>
              <TextInput
                value={authorName}
                onChangeText={setAuthorName}
                style={[s.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="Foreman"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="next"
              />
            </View>

            {/* Content */}
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Comment *</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                style={[s.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="Describe what you're noting, flagging, or asking about…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* Location */}
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Location Tag</Text>
              {gpsCoords ? (
                <View style={[s.gpsCard, { backgroundColor: "#16a34a15", borderColor: "#16a34a40" }]}>
                  <Feather name="map-pin" size={16} color="#16a34a" />
                  <View style={{ flex: 1 }}>
                    {gpsCoords.label
                      ? <Text style={[s.gpsLabel, { color: colors.foreground }]}>{gpsCoords.label}</Text>
                      : <Text style={[s.gpsLabel, { color: colors.foreground }]}>
                          {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                        </Text>
                    }
                    <Text style={[s.gpsSub, { color: colors.mutedForeground }]}>GPS location captured</Text>
                  </View>
                  <TouchableOpacity onPress={clearGps} hitSlop={8}>
                    <Feather name="x" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[s.locationBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={getLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Feather name="map-pin" size={16} color={colors.primary} />}
                  <Text style={[s.locationBtnText, { color: colors.primary }]}>
                    {gettingLocation ? "Getting location…" : "Tag My Current Location"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  commentCard: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 8 },
  commentTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  commentMeta: { gap: 4, flex: 1 },
  pinBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: "flex-start" },
  pinBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  commentAuthor: { fontSize: 11, fontFamily: "Inter_400Regular" },
  commentContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },

  emptyCard: { borderRadius: 10, borderWidth: 1, padding: 32, alignItems: "center", gap: 10, marginTop: 4 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260 },

  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  modalSave: { fontSize: 15, fontFamily: "Inter_600SemiBold" },

  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  textInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 110 },

  gpsCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 8, padding: 12 },
  gpsLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  gpsSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  locationBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 8, padding: 14 },
  locationBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
