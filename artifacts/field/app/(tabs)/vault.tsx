import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const CATEGORIES = [
  { id: "coi", label: "Certificate of Insurance", shortLabel: "COI", icon: "shield" },
  { id: "workers_comp", label: "Worker's Compensation", shortLabel: "W.Comp", icon: "heart" },
  { id: "wa_license", label: "Washington Business License", shortLabel: "WA Lic.", icon: "file-text" },
  { id: "or_license", label: "Oregon Business License", shortLabel: "OR Lic.", icon: "file-text" },
  { id: "right_to_work", label: "Right to Work Authorization", shortLabel: "RTW", icon: "check-circle" },
  { id: "other", label: "Other Documents", shortLabel: "Other", icon: "folder" },
] as const;

interface ComplianceDoc {
  id: number;
  category: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

function daysUntilExpiry(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function VaultTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: docs = [], isLoading, refetch } = useQuery<ComplianceDoc[]>({
    queryKey: ["compliance-docs-active"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/compliance-docs/active`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30000,
  });

  const openDoc = async (doc: ComplianceDoc) => {
    const url = doc.fileUrl.startsWith("http") ? doc.fileUrl : `${BASE_URL}${doc.fileUrl}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Cannot Open", "Unable to open this document on your device.");
      }
    } catch {
      Alert.alert("Error", "Failed to open document.");
    }
  };

  const visibleDocs = activeCategory
    ? docs.filter((d) => d.category === activeCategory)
    : docs;

  const grouped = CATEGORIES.reduce<Record<string, ComplianceDoc[]>>((acc, cat) => {
    const items = visibleDocs.filter((d) => d.category === cat.id);
    if (items.length) acc[cat.id] = items;
    return acc;
  }, {});

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.headerLabel}>FOREMAN LIVE</Text>
        <View style={s.headerRow}>
          <Feather name="lock" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={s.headerTitle}>Legal Vault</Text>
        </View>
        <Text style={s.headerSub}>Compliance documents — show GC or inspector on-site</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        <TouchableOpacity
          style={[s.catChip, activeCategory === null && s.catChipActive]}
          onPress={() => setActiveCategory(null)}
        >
          <Text style={[s.catChipText, activeCategory === null && s.catChipTextActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => {
          const count = docs.filter((d) => d.category === cat.id).length;
          if (count === 0) return null;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[s.catChip, activeCategory === cat.id && s.catChipActive]}
              onPress={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            >
              <Text style={[s.catChipText, activeCategory === cat.id && s.catChipTextActive]}>
                {cat.shortLabel} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.mutedText, { marginTop: 12 }]}>Loading documents…</Text>
        </View>
      ) : docs.length === 0 ? (
        <View style={s.center}>
          <Feather name="lock" size={48} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
          <Text style={[s.mutedText, { marginTop: 16, textAlign: "center" }]}>
            No documents uploaded yet.{"\n"}Ask your office to add certificates.
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: insets.bottom + 20 }}>
          {Object.entries(grouped).map(([catId, catDocs]) => {
            const catMeta = CATEGORIES.find((c) => c.id === catId);
            return (
              <View key={catId}>
                <View style={s.sectionHeader}>
                  <Feather name={(catMeta?.icon ?? "folder") as any} size={14} color={colors.mutedForeground} />
                  <Text style={s.sectionTitle}>{catMeta?.label ?? catId}</Text>
                </View>
                <View style={s.cardGroup}>
                  {catDocs.map((doc) => {
                    const expDays = doc.expiresAt ? daysUntilExpiry(doc.expiresAt) : null;
                    const isExpired = expDays !== null && expDays < 0;
                    const isWarn = expDays !== null && expDays >= 0 && expDays <= 30;
                    const isPdf = doc.fileType?.includes("pdf");
                    return (
                      <TouchableOpacity
                        key={doc.id}
                        style={[s.docCard, { backgroundColor: colors.card, borderColor: isExpired ? "#ef4444" : isWarn ? "#f59e0b" : colors.border }]}
                        onPress={() => openDoc(doc)}
                        activeOpacity={0.7}
                      >
                        <View style={s.docCardLeft}>
                          <View style={[s.docIcon, { backgroundColor: isExpired ? "#fee2e2" : colors.muted }]}>
                            <Feather
                              name={isPdf ? "file-text" : "image"}
                              size={20}
                              color={isExpired ? "#ef4444" : colors.primary}
                            />
                          </View>
                        </View>
                        <View style={s.docCardContent}>
                          <Text style={[s.docTitle, { color: colors.foreground }]} numberOfLines={1}>
                            {doc.title}
                          </Text>
                          {doc.description ? (
                            <Text style={[s.docSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                              {doc.description}
                            </Text>
                          ) : null}
                          {isExpired && (
                            <View style={s.badge}>
                              <Feather name="alert-triangle" size={10} color="#ef4444" />
                              <Text style={[s.badgeText, { color: "#ef4444" }]}>EXPIRED</Text>
                            </View>
                          )}
                          {isWarn && !isExpired && (
                            <View style={s.badge}>
                              <Feather name="clock" size={10} color="#f59e0b" />
                              <Text style={[s.badgeText, { color: "#f59e0b" }]}>Expires in {expDays}d</Text>
                            </View>
                          )}
                        </View>
                        <View style={s.docCardRight}>
                          <View style={[s.openButton, { backgroundColor: colors.primary }]}>
                            <Feather name="external-link" size={14} color="#fff" />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5, color: colors.mutedForeground, marginBottom: 4 },
    headerRow: { flexDirection: "row", alignItems: "center" },
    headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground },
    headerSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: "Inter_400Regular" },
    catScroll: { flexGrow: 0, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catChipText: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    catChipTextActive: { color: "#fff" },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
    mutedText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
    cardGroup: { gap: 8 },
    docCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 12, gap: 12 },
    docCardLeft: {},
    docIcon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    docCardContent: { flex: 1, gap: 2 },
    docTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    docSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
    badge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
    docCardRight: {},
    openButton: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  });
