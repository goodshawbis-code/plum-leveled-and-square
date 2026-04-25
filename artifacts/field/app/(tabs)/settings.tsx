import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

function SettingRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon as any} size={16} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      {value ? (
        <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>
      ) : (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </View>
  );
}

export default function SettingsTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 16 }}>
        <Text style={[styles.appLabel, { color: colors.mutedForeground }]}>
          PLUMB LEVEL & SQUARE
        </Text>
        <Text style={[styles.appTitle, { color: colors.foreground }]}>Settings</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow icon="user" label="Account" />
        <SettingRow icon="bell" label="Notifications" />
        <SettingRow icon="shield" label="Privacy" />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
        <SettingRow icon="info" label="Version" value="1.0.0" />
        <SettingRow icon="help-circle" label="Support" />
      </View>

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        plumb level and Squared · Field App
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 2 },
  appTitle: { fontSize: 30, fontFamily: "Inter_700Bold" },
  section: {
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  rowValue: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footer: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 32,
  },
});
