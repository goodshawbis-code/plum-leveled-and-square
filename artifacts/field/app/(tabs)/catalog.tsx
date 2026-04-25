import { useListMaterials } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function CatalogTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: materials, isLoading, isError } = useListMaterials();
  const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

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
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={materials ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + 16, paddingBottom: 20 },
        ]}
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <Text style={[styles.appLabel, { color: colors.mutedForeground }]}>
              PLUMB LEVEL & SQUARE
            </Text>
            <Text style={[styles.appTitle, { color: colors.foreground }]}>Catalog</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="layers" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Materials</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add materials in the office app
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const picUrl = item.pictureUrl
            ? item.pictureUrl.startsWith("http")
              ? item.pictureUrl
              : `${baseUrl}${item.pictureUrl}`
            : null;
          return (
            <View
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {picUrl ? (
                <Image source={{ uri: picUrl }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumbPlaceholder, { backgroundColor: colors.muted }]}>
                  <Feather name="box" size={24} color={colors.mutedForeground} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.matName, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.matSpec, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.type} · {item.spec}
                </Text>
                <View style={styles.unitRow}>
                  <View style={[styles.unitBadge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.unitText, { color: colors.mutedForeground }]}>
                      {item.unit}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  list: { paddingHorizontal: 16 },
  pageHeader: { marginBottom: 16 },
  appLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 2 },
  appTitle: { fontSize: 30, fontFamily: "Inter_700Bold" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  matName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  matSpec: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 6 },
  unitRow: { flexDirection: "row" },
  unitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  unitText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 240 },
});
