import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProjectRfis,
  useCreateRfi,
  useUpdateRfi,
  getListProjectRfisQueryKey,
} from "@workspace/api-client-react";
import type { Rfi } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low:    { label: "Low",    color: "#16a34a", bg: "#16a34a18" },
  medium: { label: "Medium", color: "#d97706", bg: "#d9770618" },
  high:   { label: "High",   color: "#dc2626", bg: "#dc262618" },
  urgent: { label: "Urgent", color: "#7c3aed", bg: "#7c3aed18" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  open:     { label: "Open",     color: "#dc2626", bg: "#dc262618" },
  answered: { label: "Answered", color: "#d97706", bg: "#d9770618" },
  closed:   { label: "Closed",   color: "#16a34a", bg: "#16a34a18" },
};

function RFICard({ rfi }: { rfi: Rfi }) {
  const colors = useColors();
  const pr = PRIORITY_CONFIG[rfi.priority] ?? PRIORITY_CONFIG.medium;
  const st = STATUS_CONFIG[rfi.status] ?? STATUS_CONFIG.open;

  return (
    <View style={[s.rfiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={s.rfiTop}>
        <Text style={[s.rfiNum, { color: colors.mutedForeground }]}>RFI-{String(rfi.rfiNumber).padStart(3, "0")}</Text>
        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: pr.bg }]}>
            <Text style={[s.badgeText, { color: pr.color }]}>{pr.label}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
      </View>
      <Text style={[s.rfiTitle, { color: colors.foreground }]}>{rfi.title}</Text>
      <Text style={[s.rfiDesc, { color: colors.mutedForeground }]} numberOfLines={3}>{rfi.description}</Text>
      <Text style={[s.rfiMeta, { color: colors.mutedForeground }]}>
        Submitted by {rfi.submittedBy}
        {rfi.status === "answered" && rfi.response ? " · Response received" : ""}
      </Text>
      {rfi.status === "answered" && rfi.response ? (
        <View style={[s.responseBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[s.responseLabel, { color: colors.mutedForeground }]}>OFFICE RESPONSE</Text>
          <Text style={[s.responseText, { color: colors.foreground }]}>{rfi.response}</Text>
        </View>
      ) : null}
    </View>
  );
}

const PRIORITIES: Array<{ key: string; label: string }> = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "urgent", label: "Urgent" },
];

export function RFIsView({ projectId }: { projectId: number }) {
  const colors = useColors();
  const queryClient = useQueryClient();

  const { data: rfis, isLoading } = useListProjectRfis(projectId);
  const { mutateAsync: createRfi } = useCreateRfi();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [submittedBy, setSubmittedBy] = useState("Foreman");
  const [submitting, setSubmitting] = useState(false);

  function openModal() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setSubmittedBy("Foreman");
    setModalVisible(true);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert("Missing", "Please enter an RFI title.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Missing", "Please enter a description.");
      return;
    }
    setSubmitting(true);
    try {
      await createRfi({
        id: projectId,
        data: {
          title: title.trim(),
          description: description.trim(),
          priority,
          submittedBy: submittedBy.trim() || "Foreman",
        },
      });
      await queryClient.invalidateQueries({ queryKey: getListProjectRfisQueryKey(projectId) });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
    } catch {
      Alert.alert("Error", "Failed to submit RFI.");
    } finally {
      setSubmitting(false);
    }
  }

  const openCount = rfis?.filter((r) => r.status === "open").length ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <View style={s.headerRow}>
        <View style={{ gap: 2 }}>
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>
            RFIs · {rfis?.length ?? 0}
          </Text>
          {openCount > 0 && (
            <Text style={[s.openCount, { color: "#dc2626" }]}>{openCount} awaiting response</Text>
          )}
        </View>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.primary }]}
          onPress={openModal}
        >
          <Feather name="plus" size={14} color={colors.primaryForeground} />
          <Text style={[s.addBtnText, { color: colors.primaryForeground }]}>New RFI</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : !rfis || rfis.length === 0 ? (
        <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="file-text" size={36} color={colors.mutedForeground} />
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>No RFIs Yet</Text>
          <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
            Submit a Request for Information when you need clarification from the office on plans, specs, or materials.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {rfis.map((rfi) => (
            <RFICard key={rfi.id} rfi={rfi} />
          ))}
        </View>
      )}

      {/* New RFI Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={[s.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity hitSlop={12} onPress={() => setModalVisible(false)}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>New RFI</Text>
            <TouchableOpacity hitSlop={8} onPress={handleSubmit} disabled={submitting}>
              {submitting
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[s.modalSave, { color: colors.primary }]}>Submit</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20 }}>
            {/* From */}
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Submitted By</Text>
              <TextInput
                value={submittedBy}
                onChangeText={setSubmittedBy}
                style={[s.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="Foreman"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            {/* Title */}
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>RFI Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                style={[s.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="e.g. Confirm footing depth at grid B-4"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            {/* Description */}
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Description / Question *</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={[s.textArea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="Describe what you need clarification on. Include sheet numbers, detail references, or locations where relevant…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            {/* Priority */}
            <View style={s.fieldGroup}>
              <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Priority</Text>
              <View style={s.priorityRow}>
                {PRIORITIES.map((p) => {
                  const cfg = PRIORITY_CONFIG[p.key];
                  const active = priority === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[
                        s.priorityBtn,
                        {
                          borderColor: active ? cfg.color : colors.border,
                          backgroundColor: active ? cfg.bg : colors.card,
                        },
                      ]}
                      onPress={() => setPriority(p.key as typeof priority)}
                    >
                      <Text style={[s.priorityBtnText, { color: active ? cfg.color : colors.mutedForeground }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={[s.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[s.infoText, { color: colors.mutedForeground }]}>
                Your RFI will be sent directly to the office. They will respond and update the status.
              </Text>
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
  openCount: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  rfiCard: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 8 },
  rfiTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rfiNum: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  badgeRow: { flexDirection: "row", gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  rfiTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rfiDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  rfiMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  responseBox: { borderRadius: 8, borderWidth: 1, padding: 12, gap: 4 },
  responseLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  responseText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

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
  textArea: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, fontFamily: "Inter_400Regular", minHeight: 130 },

  priorityRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  priorityBtn: { flex: 1, borderWidth: 1.5, borderRadius: 8, paddingVertical: 10, alignItems: "center", minWidth: 72 },
  priorityBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  infoBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderWidth: 1, borderRadius: 8, padding: 12 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 16 },
});
