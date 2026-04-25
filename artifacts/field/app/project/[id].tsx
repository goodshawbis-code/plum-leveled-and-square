import {
  useGetProject,
  useListBlueprints,
  useListSegments,
  useGetProjectEstimate,
} from "@workspace/api-client-react";
import type { Blueprint, Segment, EstimateLineItem } from "@workspace/api-client-react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { pctFraction } from "@/utils/coords";

const STATUS_WORKFLOW = ["DRAFT", "ESTIMATING", "BID SENT", "IN PROGRESS", "CO"];

const STATUS_MAP: Record<string, string> = {
  active: "ESTIMATING",
  completed: "IN PROGRESS",
  archived: "DRAFT",
};

const PIN_COLORS = [
  "#d93a2a",
  "#d93a2a",
  "#d93a2a",
  "#d93a2a",
  "#d93a2a",
  "#d93a2a",
  "#9333ea",
  "#22a05b",
];

function getPinColor(index: number, done: boolean): string {
  if (done) return "#1d2d5e";
  return PIN_COLORS[index % PIN_COLORS.length];
}

function buildImageUrl(rawUrl: string): string {
  const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  if (rawUrl.startsWith("http")) return rawUrl;
  const fixedPath = rawUrl.startsWith("/storage/") ? `/api${rawUrl}` : rawUrl;
  return `${baseUrl}${fixedPath}`;
}

function BlueprintWithPins({
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
  const [imgError, setImgError] = useState(false);
  const screenWidth = Dimensions.get("window").width - 32;

  const imageUrl = buildImageUrl(blueprint.fileUrl);
  const isPdf = blueprint.fileUrl.toLowerCase().endsWith(".pdf");

  const aspectRatio = imgSize.height > 0 ? imgSize.width / imgSize.height : 4 / 3;
  const displayWidth = screenWidth;
  const displayHeight = displayWidth / aspectRatio;

  useEffect(() => {
    if (!isPdf) {
      Image.getSize(imageUrl, (w, h) => setImgSize({ width: w, height: h }), () => setImgError(true));
    }
  }, [imageUrl, isPdf]);

  const bpH = displayHeight || displayWidth * 0.75;
  const showFallback = isPdf || imgError;

  return (
    <View
      style={[
        styles.blueprintWrapper,
        { borderColor: colors.border, height: bpH },
        showFallback && styles.blueprintFallback,
      ]}
    >
      {showFallback ? (
        <View style={styles.blueprintGridBg}>
          {isPdf && (
            <View style={styles.pdfBadge}>
              <Feather name="file-text" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.pdfBadgeText}>{blueprint.fileName}</Text>
            </View>
          )}
        </View>
      ) : (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: displayWidth, height: bpH }}
          resizeMode="contain"
          onError={() => setImgError(true)}
        />
      )}

      {segments.map((seg, idx) => {
        const left = pctFraction(seg.x) * displayWidth;
        const top = pctFraction(seg.y) * bpH;
        const width = pctFraction(seg.width) * displayWidth;
        const height = pctFraction(seg.height) * bpH;
        const pinX = left + width / 2 - 16;
        const pinY = top + height / 2 - 16;
        const done = !!seg.completedAt;
        const color = getPinColor(idx, done);
        return (
          <React.Fragment key={seg.id}>
            {/* Segment area overlay — tappable rectangle */}
            <TouchableOpacity
              style={[
                styles.segmentOverlay,
                {
                  left,
                  top,
                  width,
                  height,
                  borderColor: color,
                  backgroundColor: done ? "rgba(29,45,94,0.15)" : `${color}28`,
                },
              ]}
              onPress={() => onSegmentPress(seg)}
              activeOpacity={0.7}
            />
            {/* Numbered pin centred on the overlay */}
            <TouchableOpacity
              testID={`segment-overlay-${seg.id}`}
              style={[styles.pinWrapper, { left: pinX, top: pinY }]}
              onPress={() => onSegmentPress(seg)}
              activeOpacity={0.75}
            >
              <View style={[styles.pin, { backgroundColor: color }]}>
                <Text style={styles.pinText}>{idx + 1}</Text>
              </View>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
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
  const done = !!segment.completedAt;
  const pinColor = getPinColor(index, done);

  return (
    <Pressable
      testID={`segment-list-${segment.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.segRow,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.segPin, { backgroundColor: pinColor }]}>
        <Text style={styles.segPinText}>{index + 1}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.segName, { color: colors.foreground }]}>{segment.label}</Text>
        {segment.description ? (
          <Text style={[styles.segDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
            {segment.description}
          </Text>
        ) : null}
      </View>
      {done && (
        <View style={[styles.doneBadge, { backgroundColor: colors.success }]}>
          <Text style={[styles.doneBadgeText, { color: colors.successForeground }]}>DONE</Text>
        </View>
      )}
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
    <View style={{ gap: 12 }}>
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

      <BlueprintWithPins
        blueprint={activeBp}
        segments={segs}
        onSegmentPress={onSegmentPress}
      />

      {segs.length === 0 ? (
        <View style={styles.center}>
          <Feather name="tag" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No segments tagged yet
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            TAKEOFF SEGMENTS · {segs.length} {segs.length === 1 ? "item" : "items"}
          </Text>
          {segs.map((seg, idx) => (
            <SegmentRow
              key={seg.id}
              segment={seg}
              index={idx}
              onPress={() => onSegmentPress(seg)}
            />
          ))}
        </View>
      )}
    </View>
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
    <View style={{ gap: 8 }}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        TAKEOFF SEGMENTS · {segs.length} {segs.length === 1 ? "item" : "items"}
      </Text>
      {segs.map((seg, idx) => (
        <SegmentRow
          key={seg.id}
          segment={seg}
          index={idx}
          onPress={() => onSegmentPress(seg)}
        />
      ))}
    </View>
  );
}

function EstimateView({ projectId }: { projectId: number }) {
  const colors = useColors();
  const { data: estimate, isLoading, isError } = useGetProjectEstimate(projectId);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !estimate) {
    return (
      <View style={styles.center}>
        <Feather name="file-text" size={40} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Estimate Yet</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Add vendor bids in the office app to generate an estimate
        </Text>
      </View>
    );
  }

  const total = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(estimate.totalCost);

  return (
    <View style={{ gap: 12 }}>
      {/* Total banner */}
      <View style={[styles.estimateTotalCard, { backgroundColor: colors.primary }]}>
        <Text style={[styles.estimateTotalLabel, { color: colors.primaryForeground }]}>
          HARD BID TOTAL
        </Text>
        <Text style={[styles.estimateTotalValue, { color: colors.primaryForeground }]}>
          {total}
        </Text>
        <Text style={[styles.estimateTotalSub, { color: colors.primaryForeground }]}>
          {estimate.lineItems.length} line {estimate.lineItems.length === 1 ? "item" : "items"}
        </Text>
      </View>

      {/* Line items */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
        BID LINE ITEMS
      </Text>
      {estimate.lineItems.map((item: EstimateLineItem) => (
        <View
          key={item.segmentId}
          style={[styles.estimateRow, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.estimateRowTop}>
            <Text style={[styles.estimateSegLabel, { color: colors.foreground }]} numberOfLines={1}>
              {item.segmentLabel}
            </Text>
            <Text style={[styles.estimateRowTotal, { color: colors.primary }]}>
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.lineTotal)}
            </Text>
          </View>
          <Text style={[styles.estimateRowSub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.materialName} · {item.materialSpec}
          </Text>
          <View style={styles.estimateRowMeta}>
            <Text style={[styles.estimateRowMetaText, { color: colors.mutedForeground }]}>
              {item.vendorName}
            </Text>
            <Text style={[styles.estimateRowMetaText, { color: colors.mutedForeground }]}>
              {item.quantity} {item.unit} @ ${item.unitPrice.toFixed(2)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const projectId = Number(id);
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tabMode, setTabMode] = useState<"field" | "office">("field");
  const [view, setView] = useState<"blueprint" | "list">("blueprint");
  const [selectedBlueprintIdx, setSelectedBlueprintIdx] = useState(0);

  const { data: project, refetch: refetchProject } = useGetProject(projectId);
  const { data: blueprints, isLoading: bpLoading, refetch: refetchBlueprints } = useListBlueprints(projectId);
  const activeBp = blueprints?.[selectedBlueprintIdx];

  const [refreshing, setRefreshing] = useState(false);
  const currentStatus = STATUS_MAP[project?.status ?? "active"] ?? "ESTIMATING";

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refetchProject(), refetchBlueprints()]);
    setRefreshing(false);
  }

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const navigateToSegment = (seg: Segment) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: "/segment/[segId]", params: { segId: seg.id } });
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

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
      {/* Custom header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: topPad + 8,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          hitSlop={10}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {project?.name ?? "Project"}
        </Text>
        <Pressable hitSlop={10}>
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </Pressable>
      </View>

      {/* Office / Field tab switcher */}
      <View
        style={[
          styles.tabSwitcherWrap,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.tabSwitcher, { borderColor: colors.border }]}>
          <Pressable
            style={[
              styles.tabBtn,
              styles.tabBtnLeft,
              { borderColor: colors.border },
              tabMode === "office" && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => {
              if (tabMode !== "office" && Platform.OS !== "web") Haptics.selectionAsync();
              setTabMode("office");
            }}
          >
            <Feather name="monitor" size={13} color={tabMode === "office" ? colors.primaryForeground : colors.mutedForeground} />
            <Text style={[styles.tabBtnText, { color: tabMode === "office" ? colors.primaryForeground : colors.mutedForeground }]}>
              Office · Estimate
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.tabBtn,
              styles.tabBtnRight,
              tabMode === "field"
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { borderColor: colors.border },
            ]}
            onPress={() => {
              if (tabMode !== "field" && Platform.OS !== "web") Haptics.selectionAsync();
              setTabMode("field");
            }}
          >
            <Feather name="user" size={13} color={tabMode === "field" ? colors.primaryForeground : colors.mutedForeground} />
            <Text style={[styles.tabBtnText, { color: tabMode === "field" ? colors.primaryForeground : colors.mutedForeground }]}>
              Field · Foreman
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Project info card */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.infoName, { color: colors.foreground }]}>
            {project?.name}
          </Text>
          {project?.address ? (
            <View style={styles.infoAddrRow}>
              <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              <Text style={[styles.infoAddr, { color: colors.mutedForeground }]}>
                {project.address}
              </Text>
            </View>
          ) : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
          >
            {STATUS_WORKFLOW.map((step) => {
              const isActive = step === currentStatus;
              return (
                <View
                  key={step}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isActive ? colors.primary : "transparent",
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: isActive ? colors.primaryForeground : colors.mutedForeground },
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Blueprint / List toggle */}
        <View style={[styles.toggleWrap, { backgroundColor: colors.muted }]}>
          <Pressable
            testID="view-toggle-blueprint"
            onPress={() => {
              if (view !== "blueprint" && Platform.OS !== "web") {
                Haptics.selectionAsync();
              }
              setView("blueprint");
            }}
            style={[
              styles.toggleBtn,
              view === "blueprint" && { backgroundColor: colors.card },
            ]}
          >
            <Feather
              name="map"
              size={14}
              color={view === "blueprint" ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.toggleBtnText,
                { color: view === "blueprint" ? colors.primary : colors.mutedForeground },
              ]}
            >
              Blueprint
            </Text>
          </Pressable>
          <Pressable
            testID="view-toggle-list"
            onPress={() => {
              if (view !== "list" && Platform.OS !== "web") {
                Haptics.selectionAsync();
              }
              setView("list");
            }}
            style={[
              styles.toggleBtn,
              view === "list" && { backgroundColor: colors.card },
            ]}
          >
            <Feather
              name="list"
              size={14}
              color={view === "list" ? colors.primary : colors.mutedForeground}
            />
            <Text
              style={[
                styles.toggleBtnText,
                { color: view === "list" ? colors.primary : colors.mutedForeground },
              ]}
            >
              Segments
            </Text>
          </Pressable>
        </View>

        <View style={{ padding: 16, paddingBottom: 32, gap: 12 }}>
          {tabMode === "office" ? (
            <EstimateView projectId={projectId} />
          ) : !hasBlueprints ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Feather name="file" size={40} color={colors.mutedForeground} />
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },

  tabSwitcherWrap: {
    padding: 12,
    borderBottomWidth: 1,
  },
  tabSwitcher: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderWidth: 0,
  },
  tabBtnLeft: { borderRightWidth: 1 },
  tabBtnRight: {},
  tabBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  infoCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
  },
  infoName: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 6 },
  infoAddrRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 },
  infoAddr: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  pillsRow: { gap: 6, paddingRight: 4 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },

  toggleWrap: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 8,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  bpTabs: { gap: 8, paddingBottom: 4 },
  bpTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  bpTabText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  blueprintWrapper: {
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
  },
  blueprintFallback: {
    backgroundColor: "#1a2e52",
    borderColor: "#2a3e6a",
  },
  blueprintGridBg: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  pdfBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pdfBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
  segmentOverlay: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 4,
  },
  pinWrapper: { position: "absolute", width: 32, height: 32 },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  pinText: { color: "#ffffff", fontSize: 13, fontFamily: "Inter_700Bold" },

  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  segRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  segPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  segPinText: { color: "#ffffff", fontSize: 12, fontFamily: "Inter_700Bold" },
  segName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  segDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  doneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  doneBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  emptyCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 240 },

  estimateTotalCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 4,
  },
  estimateTotalLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.2, opacity: 0.85 },
  estimateTotalValue: { fontSize: 34, fontFamily: "Inter_700Bold" },
  estimateTotalSub: { fontSize: 13, fontFamily: "Inter_400Regular", opacity: 0.75 },

  estimateRow: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  estimateRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  estimateSegLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  estimateRowTotal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  estimateRowSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  estimateRowMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  estimateRowMetaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
