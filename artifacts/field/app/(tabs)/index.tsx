import { useListProjects } from "@workspace/api-client-react";
import type { Project } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; filled: boolean }> = {
  active:    { label: "ACTIVE",    bg: "#1d2d5e", color: "#ffffff", filled: true  },
  completed: { label: "DONE",      bg: "transparent", color: "#7a7060", filled: false },
  archived:  { label: "ARCHIVED",  bg: "transparent", color: "#7a7060", filled: false },
  estimating:{ label: "ESTIMATING",bg: "#c98a2e", color: "#ffffff", filled: true  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: cfg.bg,
          borderWidth: cfg.filled ? 0 : 1,
          borderColor: "#cec8be",
        },
      ]}
    >
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      testID={`project-${project.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
            {project.name}
          </Text>
          {project.notes ? (
            <Text style={[styles.cardCompany, { color: colors.mutedForeground }]} numberOfLines={1}>
              {project.notes}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={project.status} />
      </View>

      {project.address ? (
        <View style={styles.addressRow}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.addressText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {project.address}
          </Text>
        </View>
      ) : null}

      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>STATUS</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={1}>
            {project.status.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>TYPE</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>FIELD</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>VIEW</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>Open →</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function ProjectsTab() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: projects, isLoading, isError, refetch, isFetching } = useListProjects();

  const active = (projects ?? []).filter((p) => p.status !== "archived");

  const totalValue = 0;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Connection Error</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Could not reach the server
        </Text>
        <Pressable
          onPress={() => refetch()}
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.retryBtnText, { color: colors.primaryForeground }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={active}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.list,
          {
            paddingTop: insets.top + 16,
            paddingBottom: 20,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {/* App header */}
            <View style={styles.appHeader}>
              <View>
                <Text style={[styles.appLabel, { color: colors.mutedForeground }]}>
                  PLUMB LEVEL & SQUARE
                </Text>
                <Text style={[styles.appTitle, { color: colors.foreground }]}>Projects</Text>
              </View>
              <Pressable
                onPress={() => {}}
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="plus" size={22} color={colors.primaryForeground} />
              </Pressable>
            </View>

            {/* Stats summary */}
            <View style={[styles.statsCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <View style={styles.statBlock}>
                <Text style={[styles.statsCardLabel, { color: colors.mutedForeground }]}>
                  ACTIVE PROJECTS
                </Text>
                <Text style={[styles.statsCardValue, { color: colors.foreground }]}>
                  {active.length}
                </Text>
              </View>
              <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statBlock}>
                <Text style={[styles.statsCardLabel, { color: colors.mutedForeground }]}>
                  TOTAL
                </Text>
                <Text style={[styles.statsCardValue, { color: colors.foreground }]}>
                  {(projects ?? []).length}
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="folder" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Projects</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Projects created in the office will appear here
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => router.push({ pathname: "/project/[id]", params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  list: { paddingHorizontal: 16, gap: 0 },

  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  appLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 2 },
  appTitle: { fontSize: 30, fontFamily: "Inter_700Bold" },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },

  statsCard: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  statBlock: { flex: 1 },
  statsCardLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 4 },
  statsCardValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statsDivider: { width: 1, marginHorizontal: 16 },

  card: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  cardName: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  cardCompany: { fontSize: 13, fontFamily: "Inter_400Regular" },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  addressText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  stat: { flex: 1 },
  statLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, marginBottom: 2 },
  statValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statDivider: { width: 1, height: 28, marginHorizontal: 12 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },

  emptyCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 240 },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
