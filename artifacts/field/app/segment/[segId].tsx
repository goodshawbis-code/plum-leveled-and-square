import {
  useGetSegment,
  useListBids,
} from "@workspace/api-client-react";
import type { VendorBidDetail } from "@workspace/api-client-react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useLayoutEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function BidCard({ bid, isSelected }: { bid: VendorBidDetail; isSelected?: boolean }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.bidCard,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
    >
      <View style={styles.bidHeader}>
        <Text style={[styles.bidVendor, { color: colors.foreground }]}>{bid.vendor.name}</Text>
        {isSelected && (
          <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
            <Feather name="check" size={10} color={colors.primaryForeground} />
            <Text style={[styles.selectedBadgeText, { color: colors.primaryForeground }]}>
              SELECTED
            </Text>
          </View>
        )}
      </View>
      <View style={styles.bidDetails}>
        <View style={styles.bidStat}>
          <Text style={[styles.bidStatLabel, { color: colors.mutedForeground }]}>UNIT PRICE</Text>
          <Text style={[styles.bidStatValue, { color: colors.primary }]}>
            ${bid.unitPrice.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.bidDivider, { backgroundColor: colors.border }]} />
        <View style={styles.bidStat}>
          <Text style={[styles.bidStatLabel, { color: colors.mutedForeground }]}>QTY</Text>
          <Text style={[styles.bidStatValue, { color: colors.foreground }]}>{bid.quantity}</Text>
        </View>
        <View style={[styles.bidDivider, { backgroundColor: colors.border }]} />
        <View style={styles.bidStat}>
          <Text style={[styles.bidStatLabel, { color: colors.mutedForeground }]}>TOTAL</Text>
          <Text style={[styles.bidStatValue, { color: colors.foreground }]}>
            ${(bid.unitPrice * bid.quantity).toFixed(0)}
          </Text>
        </View>
      </View>
      {bid.vendor.phone ? (
        <View style={[styles.bidContact, { borderTopColor: colors.border }]}>
          <Feather name="phone" size={12} color={colors.mutedForeground} />
          <Text style={[styles.bidContactText, { color: colors.mutedForeground }]}>
            {bid.vendor.phone}
          </Text>
        </View>
      ) : null}
      {bid.notes ? (
        <View style={[styles.bidNotes, { borderTopColor: colors.border }]}>
          <Text style={[styles.bidNotesText, { color: colors.mutedForeground }]}>{bid.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function SegmentDetailScreen() {
  const { segId } = useLocalSearchParams<{ segId: string }>();
  const segmentId = Number(segId);
  const navigation = useNavigation();
  const colors = useColors();

  const { data: segment, isLoading: segLoading } = useGetSegment(segmentId);
  const { data: bids, isLoading: bidsLoading } = useListBids(segmentId);

  useLayoutEffect(() => {
    if (segment) {
      navigation.setOptions({ title: segment.label });
    }
  }, [segment, navigation]);

  const topPad = Platform.OS === "web" ? 67 : 0;
  const isLoading = segLoading || bidsLoading;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!segment) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Segment Not Found</Text>
      </View>
    );
  }

  const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
  const bidList = bids ?? [];
  const selectedBid = bidList.find((b) => b.isSelected) ?? bidList[0] ?? null;
  const materialFromBid = selectedBid?.material ?? null;
  const picUrl = materialFromBid?.pictureUrl
    ? materialFromBid.pictureUrl.startsWith("http")
      ? materialFromBid.pictureUrl
      : `${baseUrl}${materialFromBid.pictureUrl}`
    : null;

  const totalCost =
    selectedBid != null ? selectedBid.unitPrice * selectedBid.quantity : 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: topPad + 12, paddingBottom: Platform.OS === "web" ? 34 : 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {picUrl ? (
        <Image
          source={{ uri: picUrl }}
          style={[styles.materialImage, { borderColor: colors.border }]}
          resizeMode="cover"
        />
      ) : materialFromBid ? (
        <View
          style={[
            styles.materialImagePlaceholder,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Feather name="box" size={48} color={colors.mutedForeground} />
          <Text style={[styles.materialName, { color: colors.mutedForeground }]}>
            {materialFromBid.name}
          </Text>
        </View>
      ) : null}

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SEGMENT</Text>
        <InfoRow label="Label" value={segment.label} />
        <InfoRow label="Type" value={segment.type} />
        {segment.description ? (
          <InfoRow label="Description" value={segment.description} />
        ) : null}
      </View>

      {materialFromBid && (
        <View
          style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>MATERIAL</Text>
          <InfoRow label="Name" value={materialFromBid.name} />
          {materialFromBid.type ? <InfoRow label="Type" value={materialFromBid.type} /> : null}
          {materialFromBid.spec ? <InfoRow label="Spec" value={materialFromBid.spec} /> : null}
          {materialFromBid.unit ? <InfoRow label="Unit" value={materialFromBid.unit} /> : null}
          {materialFromBid.description ? (
            <InfoRow label="Description" value={materialFromBid.description} />
          ) : null}
        </View>
      )}

      {selectedBid && (
        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary,
              borderWidth: 2,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>ASSIGNED SUPPLIER</Text>
          <InfoRow label="Vendor" value={selectedBid.vendor.name} />
          {selectedBid.vendor.contactName ? (
            <InfoRow label="Contact" value={selectedBid.vendor.contactName} />
          ) : null}
          {selectedBid.vendor.phone ? (
            <InfoRow label="Phone" value={selectedBid.vendor.phone} />
          ) : null}
          {selectedBid.vendor.email ? (
            <InfoRow label="Email" value={selectedBid.vendor.email} />
          ) : null}
          <InfoRow label="Qty" value={String(selectedBid.quantity)} />
          <InfoRow
            label="Unit Price"
            value={`$${selectedBid.unitPrice.toFixed(2)}`}
          />
          <InfoRow
            label="Subtotal"
            value={`$${(selectedBid.unitPrice * selectedBid.quantity).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          {selectedBid.notes ? (
            <InfoRow label="Field Notes" value={selectedBid.notes} />
          ) : null}
        </View>
      )}

      {!selectedBid && bidList.length === 0 && (
        <View
          style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.emptyBids}>
            <Feather name="dollar-sign" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyBidsText, { color: colors.mutedForeground }]}>
              No vendor bids yet
            </Text>
          </View>
        </View>
      )}

      {bidList.length > 1 && (
        <View style={styles.bidsSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.mutedForeground, paddingHorizontal: 0 },
            ]}
          >
            ALL BIDS
          </Text>
          {bidList.map((bid) => (
            <BidCard key={bid.id} bid={bid} isSelected={bid.isSelected} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  scroll: { padding: 16, gap: 12 },
  materialImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  materialImagePlaceholder: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 4,
  },
  materialName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  section: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  infoLabel: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 2, textAlign: "right" },
  costBanner: {
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  costLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  costValue: { fontSize: 32, fontFamily: "Inter_700Bold" },
  bidsSection: { gap: 10 },
  bidCard: {
    borderRadius: 8,
    overflow: "hidden",
  },
  bidHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bidVendor: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  selectedBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  bidDetails: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  bidStat: { flex: 1 },
  bidStatLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bidStatValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  bidDivider: { width: 1 },
  bidContact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  bidContactText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bidNotes: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  bidNotesText: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  emptyBids: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyBidsText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
});
