/**
 * TrialTrackingView — "ติดตามสินค้าทดลอง" owner-console section.
 *
 * Ported 1:1 from the web OwnerTrialsTracking (OwnerTrialTabs.tsx @ L533-648):
 *   - heading "ติดตามสินค้าทดลอง",
 *   - the 5 filter pills (ทั้งหมด / รออนุมัติ / กำลังทดสอบ / ประเมินแล้ว / ปฏิเสธ) with
 *     live counts from getRegistrationStatus, active = solid green pill, red count badge,
 *   - the search box ("ค้นหาชื่อ, เบอร์, สินค้า...") filtering by name + phone + product name,
 *   - the cross-product RegistrationCard list (every registration in the global roster,
 *     not scoped to one trial) with approve / reject + read-only evaluation sheet,
 *   - the empty state.
 *
 * Difference from TrialDetailApplicants (which is the SAME card, scoped to one trial):
 *   this section pulls the WHOLE MOCK_REGISTRATIONS roster across all trials and looks
 *   up each row's product by trialId — mirroring the web useAllRegistrations() source.
 *
 * Reuses RegistrationCard / EvalSummary / FilterPill from TrialDetailApplicants so the
 * card layout stays identical to the applicants tab.
 */

import { useMemo, useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { FlaskConical, CircleAlert, Clock, Check, Ban } from "lucide-react-native";

import { BottomSheet } from "../components/BottomSheet";
import { StickyFilterList } from "../components/StickyFilterList";
import { SearchBar } from "../components/SearchBar";
import {
  RegistrationCard,
  EvalSummary,
  FilterPill,
  type ApplicantsProduct,
} from "./trialDetail/TrialDetailApplicants";
import {
  MOCK_REGISTRATIONS,
  getRegistrationStatus,
  type Registration,
  type RegistrationStatus,
} from "../data/ownerTrialRegistrations";
import { TRIAL_PRODUCTS, type TrialProduct } from "./TrialProductsScreen";
import { useAddedTrials } from "../data/trialDrafts";
import { showToast } from "../components/Toast";
import { BRAND_GREEN } from "../theme/tokens";

type FilterKey = "all" | RegistrationStatus;

/** Minimal product the card falls back to when a registration's trial isn't in the catalog. */
function fallbackProduct(trialId: string): ApplicantsProduct {
  return { id: trialId, name: trialId, tagline: "", category: "", image: "", rewardPoints: 0 };
}

export function TrialTrackingOwnerSection({ insetsBottom = 24 }: { insetsBottom?: number } = {}) {
  // Owner-added trials merged on top of the static catalog — for product lookup.
  const added = useAddedTrials();
  const catalog = useMemo<TrialProduct[]>(
    () => [...added, ...TRIAL_PRODUCTS.filter((p) => !added.some((a) => a.id === p.id))],
    [added],
  );
  const productFor = (trialId: string): ApplicantsProduct =>
    catalog.find((p) => p.id === trialId) ?? fallbackProduct(trialId);

  // Local mutable roster copy so approve / reject works in the mockup.
  const [regs, setRegs] = useState<Registration[]>(() =>
    MOCK_REGISTRATIONS.slice().sort((a, b) => b.submittedAt - a.submittedAt),
  );

  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [evalReg, setEvalReg] = useState<Registration | null>(null);

  const countByStatus = (s: RegistrationStatus) =>
    regs.filter((r) => getRegistrationStatus(r) === s).length;

  const filtered = useMemo(() => {
    let result = regs;
    if (filter !== "all") result = result.filter((r) => getRegistrationStatus(r) === filter);
    const q = search.trim().toLowerCase();
    if (q)
      result = result.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(q) ||
          (r.phone || "").includes(q) ||
          productFor(r.trialId).name.toLowerCase().includes(q),
      );
    return result;
    // productFor depends on catalog; spread deps explicitly.
  }, [regs, filter, search, catalog]);

  const matchReg = (target: Registration) => (r: Registration) =>
    r.trialId === target.trialId &&
    r.name === target.name &&
    r.submittedAt === target.submittedAt;

  const approve = (reg: Registration) => {
    setRegs((prev) =>
      prev.map((r) => (matchReg(reg)(r) ? { ...r, approvedAt: Date.now() } : r)),
    );
    showToast(`อนุมัติคำขอของ "${reg.name || "ผู้สมัคร"}" เรียบร้อย`);
  };

  const reject = (reg: Registration) => {
    Alert.alert("ปฏิเสธคำขอ", `ปฏิเสธคำขอของ "${reg.name || "ผู้สมัคร"}"?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ปฏิเสธ",
        style: "destructive",
        onPress: () => {
          setRegs((prev) =>
            prev.map((r) => (matchReg(reg)(r) ? { ...r, rejectedAt: Date.now() } : r)),
          );
          showToast("ปฏิเสธคำขอเรียบร้อย", "info");
        },
      },
    ]);
  };

  const pills: { key: FilterKey; label: string; count: number; Icon: typeof FlaskConical }[] = [
    { key: "all", label: "ทั้งหมด", count: regs.length, Icon: FlaskConical },
    { key: "pending_approval", label: "รออนุมัติ", count: countByStatus("pending_approval"), Icon: CircleAlert },
    { key: "approved", label: "กำลังทดสอบ", count: countByStatus("approved"), Icon: Clock },
    { key: "evaluated", label: "ประเมินแล้ว", count: countByStatus("evaluated"), Icon: Check },
    { key: "rejected", label: "ปฏิเสธ", count: countByStatus("rejected"), Icon: Ban },
  ];

  return (
    <StickyFilterList
      filterKey={filter}
      insetsBottom={insetsBottom}
      filters={pills.map((p) => (
        <FilterPill
          key={p.key}
          label={p.label}
          count={p.count}
          Icon={p.Icon}
          active={filter === p.key}
          onPress={() => setFilter(p.key)}
        />
      ))}
    >
      {/* Search box (shared) */}
      <SearchBar value={search} onChangeText={setSearch} placeholder="ค้นหาชื่อ, เบอร์, สินค้า..." />

      {/* Card list / empty state */}
      {filtered.length === 0 ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#f3f4f6",
            paddingVertical: 64,
            alignItems: "center",
            gap: 8,
          }}
        >
          <FlaskConical size={40} color="#d1d5db" strokeWidth={1.5} />
          <Text style={{ fontSize: 14, color: "#9ca3af" }}>ไม่มีรายการที่ตรงกับเงื่อนไข</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map((r, i) => (
            <RegistrationCard
              key={`${r.trialId}-${r.name}-${r.submittedAt}-${i}`}
              reg={r}
              product={productFor(r.trialId)}
              onApprove={() => approve(r)}
              onReject={() => reject(r)}
              onViewEval={() => setEvalReg(r)}
            />
          ))}
        </View>
      )}

      {/* Read-only evaluation sheet */}
      <BottomSheet
        centerTitle
        visible={!!evalReg}
        onClose={() => setEvalReg(null)}
        title="แบบประเมินจากผู้ทดสอบ"
      >
        {evalReg && <EvalSummary reg={evalReg} product={productFor(evalReg.trialId)} />}
      </BottomSheet>
    </StickyFilterList>
  );
}
