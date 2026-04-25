import {
  useGetProject,
  useListBlueprints,
  useListSegments,
} from "@workspace/api-client-react";
import type { Blueprint, Segment } from "@workspace/api-client-react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { pctFraction } from "@/utils/coords";

const SEGMENT_COLORS = [
  "#fc6703",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
];

function getSegmentColor(index: number) {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

function BlueprintWithSegments({
  blueprint,
  segments,
  onSegmentPress,
}: {
  blueprint: Blueprint;
  segments: Segment[];
  onSegmentPress: (seg: Segment) => void;
}) {
  const colors = useColors();
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const screenWidth = Dimensions.get("window").width - 32;

  const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  const rawUrl = blueprint.fileUrl;
  const imageUrl = rawUrl.startsWith("http") ? rawUrl : `${baseUrl}${rawUrl}`;

  const aspectRatio = imgSize.height > 0 ? imgSize.width / imgSize.height : 4 / 3;
  const displayWidth = screenWidth;
  const displayHeight = displayWidth / aspectRatio;

  useEffect(() => {
    Image.getSize(imageUrl, (w, h) => setImgSize({ width: w, height: h }), () => {});
  }, [imageUrl]);

  return (
    <View style={[styles.blueprintContainer, { borderColor: colors.border }]}>
      <Image
        source={{ uri: imageUrl }}
        style={{ width: displayWidth, height: displayHeight || displayWidth * 0.75 }}
        resizeMode="contain"
      />
      {imgSize.width > 0 &&
        segments.map((seg, idx) => {
          const color = getSegmentColor(idx);
          const bpH = displayHeight || displayWidth * 0.75;
          const left = pctFraction(seg.x) * displayWidth;
          const top = pctFraction(seg.y) * bpH;
          const width = pctFraction(seg.width) * displayWidth;
          const height = pctFraction(seg.height) * bpH;
          return (
            <TouchableOpacity
              key={seg.id}
              testID={`segment-overlay-${seg.id}`}
              onPress={() => onSegmentPress(seg)}
              style={[
                styles.segmentOverlay,
                {
                  left,
                  top,
                  width,
                  height,
                  borderColor: color,
                  backgroundColor: `${color}22`,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentLabel, { color }]} numberOfLines={1}>
                {seg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
    </View>
  );
}

function SegmentListItem({
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
      testID={`segment-list-${segment.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segItem,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.segDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.segName, { color: colors.foreground }]}>{segment.label}</Text>
        {segment.description ? (
          <Text style={[styles.segNotes, { color: colors.mutedForeground }]} numberOfLines={1}>
            {segment.description}
          </Text>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

function BlueprintView({
  activeBp,
  blueprints,
  selectedBlueprintIdx,
  onSelectBlueprint,
  onSegmentPress,
}: {
  activeBp: Blueprint;
  blueprints: Blueprint[];
  selectedBlueprintIdx: number;
  onSelectBlueprint: (idx: number) => void;
  onSegmentPress: (seg: Segment) => void;
}) {
  const colors = useColors();
  const { data: segments, isLoading, isError } = useListSegments(activeBp.id);
  const segs = segments ?? [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Could not load segments
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {blueprints.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bpTabs}
        >
          {blueprints.map((bp, idx) => (
            <Pressable
              key={bp.id}
              onPress={() => onSelectBlueprint(idx)}
              style={[
                styles.bpTab,
                {
                  backgroundColor: idx === selectedBlueprintIdx ? colors.primary : colors.muted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.bpTabText,
                  {
                    color:
                      idx === selectedBlueprintIdx
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                  },
                ]}
              >
                {bp.fileName}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <BlueprintWithSegments
        blueprint={activeBp}
        segments={segs}
        onSegmentPress={onSegmentPress}
      />
      {segs.length > 0 ? (
        <View style={styles.legendRow}>
          <Text style={[styles.legendTitle, { color: colors.mutedForeground }]}>
            TAP A HIGHLIGHTED AREA TO VIEW DETAILS
          </Text>
        </View>
      ) : (
        <View style={styles.center}>
          <Feather name="tag" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No segments tagged yet
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function SegmentsListView({
  activeBp,
  onSegmentPress,
}: {
  activeBp: Blueprint;
  onSegmentPress: (seg: Segment) => void;
}) {
  const colors = useColors();
  const { data: segments, isLoading, isError } = useListSegments(activeBp.id);
  const segs = segments ?? [];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Could not load segments
        </Text>
      </View>
    );
  }

  if (segs.length === 0) {
    return (
      <View style={styles.center}>
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
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Platform.OS === "web" ? 34 : 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.segList}>
        {segs.map((seg, idx) => (
          <SegmentListItem
            key={seg.id}
            segment={seg}
            index={idx}
            onPress={() => onSegmentPress(seg)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = Number(id);
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useColors();
  const [view, setView] = useState<"blueprint" | "list">("blueprint");
  const [selectedBlueprintIdx, setSelectedBlueprintIdx] = useState(0);

  const { data: project } = useGetProject(projectId);
  const { data: blueprints, isLoading: bpLoading } = useListBlueprints(projectId);
  const activeBp = blueprints?.[selectedBlueprintIdx];

  useLayoutEffect(() => {
    navigation.setOptions({
      title: project?.name ?? "Project",
      headerRight: blueprints && blueprints.length > 0
        ? () => (
            <Pressable
              testID="open-segment-list"
              onPress={() =>
                router.push({
                  pathname: "/segment-list/[projId]",
                  params: { projId: projectId },
                })
              }
              style={{ marginRight: 4 }}
            >
              <Feather name="list" size={22} color={colors.primary} />
            </Pressable>
          )
        : undefined,
    });
  }, [project, blueprints, navigation, router, colors.primary, projectId]);

  const topPad = Platform.OS === "web" ? 67 : 0;

  const navigateToSegment = (seg: Segment) => {
    router.push({ pathname: "/segment/[segId]", params: { segId: seg.id } });
  };

  if (bpLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const hasBlueprints = blueprints && blueprints.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.toolbar, { borderBottomColor: colors.border, paddingTop: topPad }]}>
        <View style={[styles.viewToggle, { backgroundColor: colors.muted }]}>
          <Pressable
            testID="view-toggle-blueprint"
            onPress={() => setView("blueprint")}
            style={[
              styles.toggleBtn,
              view === "blueprint" && { backgroundColor: colors.card },
            ]}
          >
            <Feather
              name="map"
              size={16}
              color={view === "blueprint" ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.toggleText,
                { color: view === "blueprint" ? colors.primary : colors.mutedForeground },
              ]}
            >
              Blueprint
            </Text>
          </Pressable>
          <Pressable
            testID="view-toggle-list"
            onPress={() => setView("list")}
            style={[
              styles.toggleBtn,
              view === "list" && { backgroundColor: colors.card },
            ]}
          >
            <Feather
              name="list"
              size={16}
              color={view === "list" ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.toggleText,
                { color: view === "list" ? colors.primary : colors.mutedForeground },
              ]}
            >
              Segments
            </Text>
          </Pressable>
        </View>
      </View>

      {!hasBlueprints ? (
        <View style={styles.center}>
          <Feather name="file" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Blueprint</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Upload a blueprint in the office app
          </Text>
        </View>
      ) : view === "blueprint" && activeBp ? (
        <BlueprintView
          activeBp={activeBp}
          blueprints={blueprints}
          selectedBlueprintIdx={selectedBlueprintIdx}
          onSelectBlueprint={setSelectedBlueprintIdx}
          onSegmentPress={navigateToSegment}
        />
      ) : activeBp ? (
        <SegmentsListView activeBp={activeBp} onSegmentPress={navigateToSegment} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  toolbar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  viewToggle: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 3,
    alignSelf: "flex-start",
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scrollContent: { padding: 16, gap: 12 },
  bpTabs: { gap: 8, paddingBottom: 4 },
  bpTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  bpTabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  blueprintContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  segmentOverlay: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
    minHeight: 24,
  },
  segmentLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
    paddingHorizontal: 2,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  legendRow: { alignItems: "center", paddingVertical: 4 },
  legendTitle: { fontSize: 10, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  segList: { gap: 10 },
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
  segNotes: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260 },
});
