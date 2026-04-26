import React, { useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

interface SafetyTopic {
  id: number;
  title: string;
  content: string;
  weekOf: string;
  createdBy: string;
  isPublished: boolean;
}

interface JhaCheckin {
  foremanName: string;
  projectId?: number;
  checkDate: string;
  scaffoldingStable: boolean;
  ppeVerified: boolean;
  trenchSafe: boolean;
  hazardsReviewed: boolean;
  firstAidAccessible: boolean;
  emergencyContactsPosted: boolean;
  notes?: string;
}

const JHA_ITEMS: { key: keyof Omit<JhaCheckin, "foremanName" | "projectId" | "checkDate" | "notes">; label: string; description: string; icon: string }[] = [
  { key: "scaffoldingStable", label: "Scaffolding Stable", description: "All scaffolding inspected and stable. Guardrails and toe boards in place.", icon: "layers" },
  { key: "ppeVerified", label: "PPE Verified", description: "Hard hats, safety glasses, hi-vis vests, and gloves present for all crew.", icon: "shield" },
  { key: "trenchSafe", label: "Trench / Excavation Safe", description: "Trenches sloped, shored, or shielded per OSHA. Competent person on site.", icon: "alert-triangle" },
  { key: "hazardsReviewed", label: "Hazards Reviewed with Crew", description: "Daily hazards briefed: overhead lines, heavy equipment paths, material lifts.", icon: "eye" },
  { key: "firstAidAccessible", label: "First Aid Accessible", description: "First aid kit located and accessible. AED if available.", icon: "plus-circle" },
  { key: "emergencyContactsPosted", label: "Emergency Contacts Posted", description: "Site address and emergency contacts posted at entry. 911 and PM contacts visible.", icon: "phone" },
];

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

type Screen = "hub" | "jha";

export default function SafetyTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [screen, setScreen] = useState<Screen>("hub");
  const [foremanName, setForemanName] = useState("");
  const [jhaChecks, setJhaChecks] = useState<Record<string, boolean>>({});
  const [jhaNotes, setJhaNotes] = useState("");
  const [jhaSubmitted, setJhaSubmitted] = useState(false);
  const [ackName, setAckName] = useState("");
  const [ackDialogVisible, setAckDialogVisible] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [ackNotes, setAckNotes] = useState("");

  const { data: currentTopic, isLoading: topicLoading, isError: topicError } = useQuery<SafetyTopic | null>({
    queryKey: ["safety-current"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/safety-topics/current`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async ({ topicId, foremanName, notes }: { topicId: number; foremanName: string; notes?: string }) => {
      const res = await fetch(`${BASE_URL}/api/safety-topics/${topicId}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foremanName, notes }),
      });
      if (!res.ok) throw new Error("Failed to acknowledge");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["safety-current"] });
      setAckDialogVisible(false);
      setAckName("");
      setAckNotes("");
      Alert.alert("Logged!", "Your discussion has been recorded with a timestamp for the office.");
    },
    onError: () => Alert.alert("Error", "Failed to log discussion. Please try again."),
  });

  const jhaSubmitMutation = useMutation({
    mutationFn: async (data: JhaCheckin) => {
      const res = await fetch(`${BASE_URL}/api/jha-checkins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      setJhaSubmitted(true);
    },
    onError: () => Alert.alert("Error", "Failed to submit JHA. Please try again."),
  });

  const handleAcknowledge = () => {
    if (!ackName.trim() || !currentTopic) return;
    acknowledgeMutation.mutate({ topicId: currentTopic.id, foremanName: ackName.trim(), notes: ackNotes.trim() || undefined });
  };

  const handleJhaSubmit = () => {
    if (!foremanName.trim()) {
      Alert.alert("Required", "Please enter your name before submitting.");
      return;
    }
    const data: JhaCheckin = {
      foremanName: foremanName.trim(),
      checkDate: getTodayString(),
      scaffoldingStable: !!jhaChecks["scaffoldingStable"],
      ppeVerified: !!jhaChecks["ppeVerified"],
      trenchSafe: !!jhaChecks["trenchSafe"],
      hazardsReviewed: !!jhaChecks["hazardsReviewed"],
      firstAidAccessible: !!jhaChecks["firstAidAccessible"],
      emergencyContactsPosted: !!jhaChecks["emergencyContactsPosted"],
      notes: jhaNotes.trim() || undefined,
    };
    jhaSubmitMutation.mutate(data);
  };

  const resetJha = () => {
    setJhaChecks({});
    setJhaNotes("");
    setJhaSubmitted(false);
    setForemanName("");
  };

  const styles = makeStyles(colors);

  if (screen === "jha") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => { setScreen("hub"); resetJha(); }} style={styles.backButton}>
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>Safety Hub</Text>
          </TouchableOpacity>

          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Daily JHA Check-Off</Text>
          <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
            {getTodayString()} — Complete before work begins
          </Text>

          {jhaSubmitted ? (
            <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: "#22c55e" }]}>
              <Feather name="check-circle" size={48} color="#22c55e" style={{ marginBottom: 12 }} />
              <Text style={[styles.successTitle, { color: colors.foreground }]}>JHA Submitted!</Text>
              <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
                Today's Job Hazard Analysis has been logged and sent to the office. Stay safe out there.
              </Text>
              <TouchableOpacity onPress={resetJha} style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 16 }]}>
                <Text style={styles.primaryButtonText}>New Check-Off</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>FOREMAN NAME *</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="Your full name"
                  placeholderTextColor={colors.mutedForeground}
                  value={foremanName}
                  onChangeText={setForemanName}
                />
              </View>

              {JHA_ITEMS.map((item) => {
                const checked = !!jhaChecks[item.key];
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.jhaItem, { backgroundColor: colors.card, borderColor: checked ? "#22c55e" : colors.border, borderWidth: checked ? 2 : 1 }]}
                    onPress={() => setJhaChecks((p) => ({ ...p, [item.key]: !p[item.key] }))}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkBox, { borderColor: checked ? "#22c55e" : colors.border, backgroundColor: checked ? "#22c55e" : colors.background }]}>
                      {checked && <Feather name="check" size={14} color="white" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.jhaItemHeader}>
                        <Feather name={item.icon as any} size={15} color={checked ? "#22c55e" : colors.mutedForeground} />
                        <Text style={[styles.jhaItemLabel, { color: checked ? "#15803d" : colors.foreground }]}>{item.label}</Text>
                      </View>
                      <Text style={[styles.jhaItemDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>HAZARDS / NOTES (optional)</Text>
                <TextInput
                  style={[styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="Any site-specific hazards or notes for the record..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                  value={jhaNotes}
                  onChangeText={setJhaNotes}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: jhaSubmitMutation.isPending ? 0.7 : 1 }]}
                onPress={handleJhaSubmit}
                disabled={jhaSubmitMutation.isPending}
              >
                {jhaSubmitMutation.isPending ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Feather name="send" size={18} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Submit JHA</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <Text style={[styles.appLabel, { color: colors.mutedForeground }]}>FOREMAN LIVE</Text>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Safety Hub</Text>
        </View>

        {/* Daily JHA Card */}
        <TouchableOpacity
          style={[styles.jhaCard, { backgroundColor: "#f0fdf4", borderColor: "#22c55e" }]}
          onPress={() => setScreen("jha")}
          activeOpacity={0.85}
        >
          <View style={styles.jhaCardContent}>
            <View style={[styles.jhaIcon, { backgroundColor: "#22c55e" }]}>
              <Feather name="clipboard" size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.jhaCardTitle, { color: "#15803d" }]}>Daily JHA Check-Off</Text>
              <Text style={[styles.jhaCardSubtitle, { color: "#16a34a" }]}>Tap to complete today's Job Hazard Analysis before work starts</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#22c55e" />
          </View>
        </TouchableOpacity>

        {/* Safety Topic of the Week */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Safety Topic of the Week</Text>

        {topicLoading && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {topicError && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="wifi-off" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, marginTop: 8 }]}>Connection Error</Text>
          </View>
        )}

        {!topicLoading && !topicError && !currentTopic && (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="shield" size={36} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Topic This Week</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>The office hasn't published a safety topic yet. Check back later.</Text>
          </View>
        )}

        {currentTopic && (
          <View style={[styles.topicCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.topicHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.topicBadgeRow}>
                  <View style={styles.topicBadge}>
                    <Text style={styles.topicBadgeText}>WEEK OF {currentTopic.weekOf}</Text>
                  </View>
                </View>
                <Text style={[styles.topicTitle, { color: colors.foreground }]}>{currentTopic.title}</Text>
                <Text style={[styles.topicMeta, { color: colors.mutedForeground }]}>Published by {currentTopic.createdBy}</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.topicContent, { color: colors.foreground }]}>{currentTopic.content}</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={[styles.discussButton, { backgroundColor: colors.primary }]}
              onPress={() => { setSelectedTopicId(currentTopic.id); setAckDialogVisible(true); }}
              activeOpacity={0.85}
            >
              <Feather name="users" size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.discussButtonText}>Discussed with Crew</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Acknowledge Dialog (inline) */}
        {ackDialogVisible && (
          <View style={[styles.ackPanel, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <Text style={[styles.ackTitle, { color: colors.foreground }]}>Log Discussion</Text>
            <Text style={[styles.ackSubtitle, { color: colors.mutedForeground }]}>This will timestamp your crew discussion for the office record.</Text>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 12 }]}>FOREMAN NAME *</Text>
            <TextInput
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Your full name"
              placeholderTextColor={colors.mutedForeground}
              value={ackName}
              onChangeText={setAckName}
              autoFocus
            />
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 10 }]}>NOTES (optional)</Text>
            <TextInput
              style={[styles.notesInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Any follow-up items or crew questions..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={2}
              value={ackNotes}
              onChangeText={setAckNotes}
            />
            <View style={styles.ackButtons}>
              <TouchableOpacity onPress={() => setAckDialogVisible(false)} style={[styles.secondaryButton, { borderColor: colors.border }]}>
                <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAcknowledge}
                style={[styles.primaryButton, { flex: 1, backgroundColor: colors.primary, opacity: (!ackName.trim() || acknowledgeMutation.isPending) ? 0.7 : 1 }]}
                disabled={!ackName.trim() || acknowledgeMutation.isPending}
              >
                {acknowledgeMutation.isPending ? <ActivityIndicator color="white" size="small" /> : (
                  <Text style={styles.primaryButtonText}>Log Discussion</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
    pageHeader: { marginBottom: 4 },
    appLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 1.5, marginBottom: 2 },
    pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
    pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 8, marginTop: 2 },
    sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 8 },
    sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 4 },
    card: { borderRadius: 12, borderWidth: 1, padding: 16, alignItems: "center" },
    jhaCard: { borderRadius: 14, borderWidth: 2, padding: 16 },
    jhaCardContent: { flexDirection: "row", alignItems: "center", gap: 12 },
    jhaIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    jhaCardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
    jhaCardSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    topicCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
    topicHeader: { padding: 16, flexDirection: "row" },
    topicBadgeRow: { flexDirection: "row", marginBottom: 6 },
    topicBadge: { backgroundColor: "#dbeafe", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
    topicBadgeText: { color: "#1d4ed8", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
    topicTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
    topicMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
    topicContent: { padding: 16, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
    divider: { height: 1 },
    discussButton: { margin: 16, borderRadius: 10, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center" },
    discussButtonText: { color: "white", fontFamily: "Inter_700Bold", fontSize: 16 },
    emptyCard: { borderRadius: 12, borderWidth: 1, borderStyle: "dashed", padding: 32, alignItems: "center" },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
    emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
    jhaItem: { borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12 },
    jhaItemHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
    jhaItemLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    jhaItemDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
    checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 2 },
    textInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 8, fontSize: 14, fontFamily: "Inter_400Regular" },
    notesInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: "Inter_400Regular", minHeight: 80, textAlignVertical: "top" },
    primaryButton: { borderRadius: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center" },
    primaryButtonText: { color: "white", fontFamily: "Inter_700Bold", fontSize: 16 },
    secondaryButton: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    secondaryButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
    ackPanel: { borderRadius: 14, borderWidth: 2, padding: 16 },
    ackTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
    ackSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
    ackButtons: { flexDirection: "row", gap: 10, marginTop: 16 },
    successCard: { borderRadius: 14, borderWidth: 2, padding: 32, alignItems: "center" },
    successTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 8 },
    successBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
    backButton: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
    backText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  });
}
