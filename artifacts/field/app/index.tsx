import { useListProjects } from "@workspace/api-client-react";
import type { Project } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

function StatusBadge({ status }: { status: Project["status"] }) {
  const colors = useColors();
  const config: Record<Project["status"], { label: string; color: string; bg: string }> = {
    active: { label: "ACTIVE", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
    completed: { label: "DONE", color: colors.mutedForeground, bg: colors.muted },
    archived: { label: "ARCHIVED", color: colors.mutedForeground, bg: colors.muted },
  };
  const c = config[status];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.color }]}>{c.label}</Text>
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
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Feather name="layout" size={22} color={colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
            {project.name}
          </Text>
          <Text style={[styles.cardAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
            {project.address}
          </Text>
        </View>
        <StatusBadge status={project.status} />
      </View>
      {project.notes ? (
        <Text style={[styles.cardNotes, { color: colors.mutedForeground }]} numberOfLines={2}>
          {project.notes}
        </Text>
      ) : null}
      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data: projects, isLoading, isError, refetch, isFetching } = useListProjects();

  const topPad = Platform.OS === "web" ? 67 : 0;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
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

  const active = (projects ?? []).filter((p) => p.status === "active");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={active}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPad + 12, paddingBottom: Platform.OS === "web" ? 34 : 20 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
            {active.length} ACTIVE PROJECT{active.length !== 1 ? "S" : ""}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Feather name="folder" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Active Projects</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Active projects from the office will appear here
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => router.push({ pathname: "/project/[id]", params: { id: item.id } })}
          />
        )}
        scrollEnabled={!!(active.length > 0)}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  list: { paddingHorizontal: 16, gap: 12 },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    marginBottom: 4,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "rgba(252,103,3,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  cardAddress: { fontSize: 13, fontFamily: "Inter_400Regular" },
  cardNotes: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
    paddingBottom: 12,
    lineHeight: 18,
  },
  cardFooter: {
    borderTopWidth: 1,
    padding: 12,
    alignItems: "flex-end",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
