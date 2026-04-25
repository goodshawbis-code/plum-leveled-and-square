import {
  useListBlueprints,
  useListSegments,
} from "@workspace/api-client-react";
import type { Blueprint, Segment } from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

function getSegmentColor(index: number) {
  const palette = [
    "#fc6703", "#3b82f6", "#22c55e", "#a855f7",
    "#f59e0b", "#ec4899", "#06b6d4",
  ];
  return palette[index % palette.length];
}

function BlueprintSegments({
  blueprint,
  globalOffset,
  onSegmentPress,
}: {
  blueprint: Blueprint;
  globalOffset: number;
  onSegmentPress: (seg: Segment) => void;
}) {
  const colors = useColors();
  const { data: segments, isLoading } = useListSegments(blueprint.id);

  if (isLoading) {
    return (
      <View style={styles.bpGroup}>
        <Text style={[styles.bpLabel, { color: colors.mutedForeground }]}>{blueprint.fileName}</Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
      </View>
    );
  }

  const segs = segments ?? [];

  return (
    <View style={styles.bpGroup}>
      <Text style={[styles.bpLabel, { color: colors.mutedForeground }]}>
        {blueprint.fileName.toUpperCase()}
      </Text>
      {segs.length === 0 ? (
        <Text style={[styles.emptyBp, { color: colors.mutedForeground }]}>No segments</Text>
      ) : (
        segs.map((seg, idx) => {
          const color = getSegmentColor(globalOffset + idx);
          return (
            <Pressable
              key={seg.id}
              testID={`seg-${seg.id}`}
              onPress={() => onSegmentPress(seg)}
              style={({ pressed }) => [
                styles.segItem,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.segDot, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.segName, { color: colors.foreground }]}>{seg.label}</Text>
                {seg.description ? (
                  <Text
                    style={[styles.segDesc, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {seg.description}
                  </Text>
                ) : null}
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          );
        })
      )}
    </View>
  );
}

export default function SegmentListScreen() {
  const { projId } = useLocalSearchParams<{ projId: string }>();
  const projectId = Number(projId);
  const router = useRouter();
  const colors = useColors();

  const { data: blueprints, isLoading } = useListBlueprints(projectId);

  const navigateToSegment = (seg: Segment) => {
    router.push({ pathname: "/segment/[segId]", params: { segId: seg.id } });
  };

  const topPad = Platform.OS === "web" ? 67 : 0;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!blueprints || blueprints.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Feather name="file" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Blueprint</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Upload a blueprint in the office app
        </Text>
      </View>
    );
  }

  let globalOffset = 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList
        sections={[{ data: blueprints }]}
        keyExtractor={(bp) => String(bp.id)}
        contentContainerStyle={{
          paddingTop: topPad + 12,
          paddingHorizontal: 16,
          paddingBottom: Platform.OS === "web" ? 34 : 20,
          gap: 16,
        }}
        renderItem={({ item: bp, index }) => {
          const offset = globalOffset;
          globalOffset += 10;
          return (
            <BlueprintSegments
              blueprint={bp}
              globalOffset={offset}
              onSegmentPress={navigateToSegment}
            />
          );
        }}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  bpGroup: { gap: 8 },
  bpLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 4 },
  emptyBp: { fontSize: 13, fontFamily: "Inter_400Regular", paddingHorizontal: 4 },
  segItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  segDot: { width: 12, height: 12, borderRadius: 6 },
  segName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  segDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260 },
});
