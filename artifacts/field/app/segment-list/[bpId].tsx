import { useListSegments } from "@workspace/api-client-react";
import type { Segment } from "@workspace/api-client-react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useLayoutEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const SEGMENT_COLORS = [
  "#fc6703",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
];

function getSegmentColor(index: number): string {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

function SegmentRow({
  segment,
  index,
  onPress,
}: {
  segment: Segment;
  index: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const color = getSegmentColor(index);
  return (
    <Pressable
      testID={`seg-list-row-${segment.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.colorDot, { backgroundColor: color }]} />
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]} numberOfLines={1}>
          {segment.label}
        </Text>
        <Text style={[styles.rowType, { color: colors.mutedForeground }]}>
          {segment.type}
          {segment.description ? `  ·  ${segment.description}` : ""}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function SegmentListScreen() {
  const { bpId } = useLocalSearchParams<{ bpId: string }>();
  const blueprintId = Number(bpId);
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useColors();

  const { data: segments, isLoading } = useListSegments(blueprintId);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Segments" });
  }, [navigation]);

  const topPad = Platform.OS === "web" ? 67 : 0;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const segs = segments ?? [];

  if (segs.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Feather name="tag" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Segments</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Tag areas in the office app to see them here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: topPad + 12, paddingBottom: Platform.OS === "web" ? 34 : 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.count, { color: colors.mutedForeground }]}>
        {segs.length} SEGMENT{segs.length !== 1 ? "S" : ""}
      </Text>
      {segs.map((seg, idx) => (
        <SegmentRow
          key={seg.id}
          segment={seg}
          index={idx}
          onPress={() =>
            router.push({ pathname: "/segment/[segId]", params: { segId: seg.id } })
          }
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  scroll: { padding: 16, gap: 10 },
  count: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  colorDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  rowType: { fontSize: 12, fontFamily: "Inter_400Regular" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260 },
});
