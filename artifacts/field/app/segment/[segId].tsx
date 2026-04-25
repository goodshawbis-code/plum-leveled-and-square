import {
  useGetSegment,
  useListBids,
  useListSegmentPhotos,
  useUpdateSegmentField,
} from "@workspace/api-client-react";
import type { VendorBidDetail, SegmentPhoto } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function BidCard({ bid, isSelected }: { bid: VendorBidDetail; isSelected?: boolean }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.bidCard,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
    >
      <View style={styles.bidHeader}>
        <Text style={[styles.bidVendor, { color: colors.foreground }]}>{bid.vendor.name}</Text>
        {isSelected && (
          <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
            <Feather name="check" size={10} color={colors.primaryForeground} />
            <Text style={[styles.selectedBadgeText, { color: colors.primaryForeground }]}>
              SELECTED
            </Text>
          </View>
        )}
      </View>
      <View style={styles.bidDetails}>
        <View style={styles.bidStat}>
          <Text style={[styles.bidStatLabel, { color: colors.mutedForeground }]}>UNIT PRICE</Text>
          <Text style={[styles.bidStatValue, { color: colors.primary }]}>
            ${bid.unitPrice.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.bidDivider, { backgroundColor: colors.border }]} />
        <View style={styles.bidStat}>
          <Text style={[styles.bidStatLabel, { color: colors.mutedForeground }]}>QTY</Text>
          <Text style={[styles.bidStatValue, { color: colors.foreground }]}>{bid.quantity}</Text>
        </View>
        <View style={[styles.bidDivider, { backgroundColor: colors.border }]} />
        <View style={styles.bidStat}>
          <Text style={[styles.bidStatLabel, { color: colors.mutedForeground }]}>TOTAL</Text>
          <Text style={[styles.bidStatValue, { color: colors.foreground }]}>
            ${(bid.unitPrice * bid.quantity).toFixed(0)}
          </Text>
        </View>
      </View>
      {bid.vendor.phone ? (
        <View style={[styles.bidContact, { borderTopColor: colors.border }]}>
          <Feather name="phone" size={12} color={colors.mutedForeground} />
          <Text style={[styles.bidContactText, { color: colors.mutedForeground }]}>
            {bid.vendor.phone}
          </Text>
        </View>
      ) : null}
      {bid.notes ? (
        <View style={[styles.bidNotes, { borderTopColor: colors.border }]}>
          <Text style={[styles.bidNotesText, { color: colors.mutedForeground }]}>{bid.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PhotoStrip({
  photos,
  onAdd,
  uploading,
}: {
  photos: SegmentPhoto[];
  onAdd: () => void;
  uploading: boolean;
}) {
  const colors = useColors();
  const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>FIELD PHOTOS</Text>
        <Pressable
          onPress={onAdd}
          disabled={uploading}
          style={[styles.addPhotoBtn, { borderColor: colors.primary, opacity: uploading ? 0.5 : 1 }]}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Feather name="camera" size={13} color={colors.primary} />
              <Text style={[styles.addPhotoBtnText, { color: colors.primary }]}>Add Photo</Text>
            </>
          )}
        </Pressable>
      </View>
      {photos.length === 0 ? (
        <View style={styles.emptyPhotos}>
          <Feather name="image" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyPhotosText, { color: colors.mutedForeground }]}>
            No photos yet
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoStrip}
        >
          {photos.map((p) => {
            const uri = p.fileUrl.startsWith("http") ? p.fileUrl : `${baseUrl}${p.fileUrl}`;
            return (
              <View key={p.id} style={styles.photoWrapper}>
                <Image
                  source={{ uri }}
                  style={[styles.photoThumb, { borderColor: colors.border }]}
                  resizeMode="cover"
                />
                {p.caption ? (
                  <Text
                    style={[styles.photoCaption, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {p.caption}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

export default function SegmentDetailScreen() {
  const { segId } = useLocalSearchParams<{ segId: string }>();
  const segmentId = Number(segId);
  const navigation = useNavigation();
  const colors = useColors();
  const qc = useQueryClient();

  const {
    data: segment,
    isLoading: segLoading,
    isError: segError,
    refetch: refetchSegment,
  } = useGetSegment(segmentId);
  const { data: bids, isLoading: bidsLoading, isError: bidsError, refetch: refetchBids } = useListBids(segmentId);
  const { data: photos = [], refetch: refetchPhotos } = useListSegmentPhotos(segmentId);
  const updateField = useUpdateSegmentField();

  const [fieldNotes, setFieldNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const savedOpacity = useRef(new Animated.Value(0)).current;

  function showSavedToast() {
    Animated.sequence([
      Animated.timing(savedOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(savedOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchSegment(), refetchBids(), refetchPhotos()]);
    setRefreshing(false);
  }

  useEffect(() => {
    if (segment) {
      setFieldNotes(segment.fieldNotes ?? "");
    }
  }, [segment?.id]);

  useLayoutEffect(() => {
    if (segment) {
      navigation.setOptions({ title: segment.label });
    }
  }, [segment, navigation]);

  const isCompleted = !!segment?.completedAt;

  async function handleToggleComplete() {
    if (!segment) return;
    const completing = !isCompleted;
    const newCompletedAt = completing ? new Date().toISOString() : null;
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    updateField.mutate(
      { id: segmentId, data: { completedAt: newCompletedAt } },
      {
        onSuccess: async () => {
          if (Platform.OS !== "web") {
            await Haptics.notificationAsync(
              completing
                ? Haptics.NotificationFeedbackType.Success
                : Haptics.NotificationFeedbackType.Warning,
            );
          }
          qc.invalidateQueries({ queryKey: ["getSegment", segmentId] });
          qc.invalidateQueries({ queryKey: ["listSegments"] });
        },
        onError: async () => {
          if (Platform.OS !== "web") {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          Alert.alert("Error", "Could not update segment. Please try again.");
        },
      },
    );
  }

  async function handleSaveNotes() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSavingNotes(true);
    updateField.mutate(
      { id: segmentId, data: { fieldNotes: fieldNotes.trim() || null } },
      {
        onSuccess: async () => {
          setNotesDirty(false);
          showSavedToast();
          if (Platform.OS !== "web") {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          qc.invalidateQueries({ queryKey: ["getSegment", segmentId] });
        },
        onError: async () => {
          if (Platform.OS !== "web") {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          Alert.alert("Error", "Could not save notes. Please try again.");
        },
        onSettled: () => setSavingNotes(false),
      },
    );
  }

  async function pickAndUpload(source: "camera" | "library") {
    if (source === "camera") {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (camPerm.status !== "granted") {
        Alert.alert("Permission required", "Please allow camera access to take photos.");
        return;
      }
    } else {
      const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libPerm.status !== "granted") {
        Alert.alert("Permission required", "Please allow photo library access to add photos.");
        return;
      }
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.8 });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingPhoto(true);
    try {
      const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
      const formData = new FormData();
      formData.append("photo", {
        uri: asset.uri,
        name: asset.fileName ?? `photo-${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as Blob);
      const resp = await fetch(`${baseUrl}/api/segments/${segmentId}/photos`, {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error("Upload failed");
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await refetchPhotos();
    } catch {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert("Upload failed", "Could not upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleAddPhoto() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (Platform.OS === "web") {
      pickAndUpload("library");
      return;
    }
    Alert.alert("Add Photo", "Choose a source", [
      { text: "Take Photo", onPress: () => pickAndUpload("camera") },
      { text: "Choose from Library", onPress: () => pickAndUpload("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  const topPad = Platform.OS === "web" ? 67 : 0;
  const isLoading = segLoading || bidsLoading;
  const isError = segError || bidsError;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !segment) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Feather name={isError ? "wifi-off" : "alert-circle"} size={40} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          {isError ? "Connection Error" : "Segment Not Found"}
        </Text>
        {isError && (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Could not reach the server
          </Text>
        )}
      </View>
    );
  }

  const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  const bidList = bids ?? [];
  const selectedBid = bidList.find((b) => b.isSelected) ?? null;
  const displayBid = selectedBid ?? bidList[0] ?? null;
  const materialFromBid = displayBid?.material ?? null;
  const picUrl = materialFromBid?.pictureUrl
    ? materialFromBid.pictureUrl.startsWith("http")
      ? materialFromBid.pictureUrl
      : `${baseUrl}${materialFromBid.pictureUrl}`
    : null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* "Saved!" toast — floats above content */}
      <Animated.View
        pointerEvents="none"
        style={[styles.savedToast, { opacity: savedOpacity }]}
      >
        <Feather name="check-circle" size={14} color="#fff" />
        <Text style={styles.savedToastText}>Saved</Text>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: Platform.OS === "web" ? 34 : 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
      {picUrl ? (
        <Image
          source={{ uri: picUrl }}
          style={[styles.materialImage, { borderColor: colors.border }]}
          resizeMode="cover"
        />
      ) : materialFromBid ? (
        <View
          style={[
            styles.materialImagePlaceholder,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Feather name="box" size={48} color={colors.mutedForeground} />
          <Text style={[styles.materialName, { color: colors.mutedForeground }]}>
            {materialFromBid.name}
          </Text>
        </View>
      ) : null}

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SEGMENT</Text>
          <Pressable
            testID="complete-toggle"
            onPress={handleToggleComplete}
            disabled={updateField.isPending}
            style={[
              styles.completeBtn,
              {
                backgroundColor: isCompleted ? colors.primary : "transparent",
                borderColor: isCompleted ? colors.primary : colors.border,
              },
            ]}
          >
            <Feather
              name={isCompleted ? "check-circle" : "circle"}
              size={14}
              color={isCompleted ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.completeBtnText,
                { color: isCompleted ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {isCompleted ? "Completed" : "Mark Complete"}
            </Text>
          </Pressable>
        </View>
        <InfoRow label="Label" value={segment.label} />
        <InfoRow label="Type" value={segment.type} />
        {segment.description ? (
          <InfoRow label="Description" value={segment.description} />
        ) : null}
        {isCompleted && segment.completedAt ? (
          <InfoRow
            label="Completed"
            value={new Date(segment.completedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          />
        ) : null}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>FIELD NOTES</Text>
        <TextInput
          testID="field-notes-input"
          style={[
            styles.notesInput,
            {
              color: colors.foreground,
              borderColor: notesDirty ? colors.primary : colors.border,
              backgroundColor: colors.background,
            },
          ]}
          value={fieldNotes}
          onChangeText={(t) => {
            setFieldNotes(t);
            setNotesDirty(t !== (segment.fieldNotes ?? ""));
          }}
          placeholder="Add notes for the field crew…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        {notesDirty && (
          <Pressable
            testID="save-notes-btn"
            onPress={handleSaveNotes}
            disabled={savingNotes}
            style={[styles.saveNotesBtn, { backgroundColor: colors.primary, opacity: savingNotes ? 0.6 : 1 }]}
          >
            {savingNotes ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.saveNotesBtnText, { color: colors.primaryForeground }]}>
                Save Notes
              </Text>
            )}
          </Pressable>
        )}
      </View>

      <PhotoStrip photos={photos} onAdd={handleAddPhoto} uploading={uploadingPhoto} />

      {materialFromBid && (
        <View
          style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>MATERIAL</Text>
          <InfoRow label="Name" value={materialFromBid.name} />
          {materialFromBid.type ? <InfoRow label="Type" value={materialFromBid.type} /> : null}
          {materialFromBid.spec ? <InfoRow label="Spec" value={materialFromBid.spec} /> : null}
          {materialFromBid.unit ? <InfoRow label="Unit" value={materialFromBid.unit} /> : null}
          {materialFromBid.description ? (
            <InfoRow label="Description" value={materialFromBid.description} />
          ) : null}
        </View>
      )}

      {displayBid && (
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.card,
              borderColor: selectedBid ? colors.primary : colors.border,
              borderWidth: selectedBid ? 2 : 1,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: selectedBid ? colors.primary : colors.mutedForeground }]}>
            {selectedBid ? "ASSIGNED SUPPLIER" : "PENDING ASSIGNMENT"}
          </Text>
          <InfoRow label="Vendor" value={displayBid.vendor.name} />
          {displayBid.vendor.contactName ? (
            <InfoRow label="Contact" value={displayBid.vendor.contactName} />
          ) : null}
          {displayBid.vendor.phone ? (
            <InfoRow label="Phone" value={displayBid.vendor.phone} />
          ) : null}
          {displayBid.vendor.email ? (
            <InfoRow label="Email" value={displayBid.vendor.email} />
          ) : null}
          <InfoRow label="Qty" value={String(displayBid.quantity)} />
          <InfoRow label="Unit Price" value={`$${displayBid.unitPrice.toFixed(2)}`} />
          <InfoRow
            label="Subtotal"
            value={`$${(displayBid.unitPrice * displayBid.quantity).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          {displayBid.notes ? (
            <InfoRow label="Bid Notes" value={displayBid.notes} />
          ) : null}
        </View>
      )}

      {!displayBid && (
        <View
          style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.emptyBids}>
            <Feather name="dollar-sign" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyBidsText, { color: colors.mutedForeground }]}>
              No vendor bids yet
            </Text>
          </View>
        </View>
      )}

      {bidList.length > 1 && (
        <View style={styles.bidsSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.mutedForeground, paddingHorizontal: 0 },
            ]}
          >
            ALL BIDS
          </Text>
          {bidList.map((bid) => (
            <BidCard key={bid.id} bid={bid} isSelected={bid.isSelected} />
          ))}
        </View>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  scroll: { padding: 16, gap: 12 },
  materialImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  materialImagePlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 4,
  },
  materialName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
  },
  completeBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  infoLabel: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 2, textAlign: "right" },
  notesInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
    borderRadius: 6,
    borderWidth: 1,
    padding: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 90,
  },
  saveNotesBtn: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
  },
  saveNotesBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 8,
  },
  addPhotoBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyPhotos: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyPhotosText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  photoStrip: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 6,
    gap: 10,
    flexDirection: "row",
  },
  photoWrapper: { gap: 4 },
  photoThumb: {
    width: 120,
    height: 120,
    borderRadius: 6,
    borderWidth: 1,
  },
  photoCaption: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    width: 120,
  },
  costBanner: {
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  costLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  costValue: { fontSize: 32, fontFamily: "Inter_700Bold" },
  bidsSection: { gap: 10 },
  bidCard: {
    borderRadius: 8,
    overflow: "hidden",
  },
  bidHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bidVendor: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  selectedBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  bidDetails: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  bidStat: { flex: 1 },
  bidStatLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bidStatValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  bidDivider: { width: 1 },
  bidContact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  bidContactText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bidNotes: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  bidNotesText: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  emptyBids: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyBidsText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260 },
  savedToast: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1d2d5e",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  savedToastText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
