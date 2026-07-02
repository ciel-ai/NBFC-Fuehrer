import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { useServices } from '@/src/core/services/ServiceProvider';
import type { GoldLoanBranch } from '@/src/entities/goldLoan';

function getNext7Days() {
  const days = [];
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() === 0) continue;
    days.push({
      key: d.toISOString().slice(0, 10),
      day: dayNames[d.getDay()],
      date: d.getDate(),
      month: monthNames[d.getMonth()],
    });
  }
  return days;
}

const TIME_SLOTS = [
  { key: 'morning', label: 'Morning', time: '9:30 AM - 11:30 AM', icon: 'sunny' as const },
  { key: 'afternoon', label: 'Afternoon', time: '12:00 PM - 2:00 PM', icon: 'partly-sunny' as const },
  { key: 'evening', label: 'Evening', time: '3:00 PM - 5:30 PM', icon: 'moon' as const },
];

export default function GoldLoanBranchScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { goldLoanService } = useServices();
  const dates = useMemo(() => getNext7Days(), []);

  const [branches, setBranches] = useState<GoldLoanBranch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await goldLoanService.getNearbyBranches();
        if (mounted) setBranches(data);
      } catch {
        if (mounted) Alert.alert('Branches unavailable', 'Please try again.');
      } finally {
        if (mounted) setIsLoadingBranches(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [goldLoanService]);

  const canConfirm = selectedBranch && selectedDate && selectedSlot;
  const branch = branches.find((b) => b.id === selectedBranch);
  const date = dates.find((d) => d.key === selectedDate);
  const slot = TIME_SLOTS.find((s) => s.key === selectedSlot);

  const handleConfirm = async () => {
    if (!selectedBranch || !selectedDate || !selectedSlot) return;
    setIsBooking(true);
    try {
      const appointment = await goldLoanService.bookBranchAppointment({
        branchId: selectedBranch,
        date: selectedDate,
        slot: slot?.time ?? selectedSlot,
      });
      router.replace({
        pathname: '/(main)/apply/gold-loan-confirmed',
        params: {
          ...params,
          applicationId: params.applicationId ?? appointment.appointmentId,
          branchName: appointment.branch.name,
          branchAddress: appointment.branch.address,
          date: date ? `${date.day}, ${date.date} ${date.month}` : appointment.date,
          slot: appointment.slot,
          referenceId: appointment.referenceId,
        },
      });
    } catch {
      Alert.alert('Booking failed', 'Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Book Branch Visit" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Visit a branch for gold assessment</Text>
        <Text style={styles.pageSubtitle}>Select a nearby branch, date, and time slot for your appointment.</Text>

        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={16} color={Colors.goldDark} />
          <Text style={styles.warningText}>
            Please bring your original gold items and a valid photo ID to the branch.
          </Text>
        </View>

        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={40} color={Colors.textDisabled} />
          <Text style={styles.mapText}>Nearby branches on map</Text>
          <Text style={styles.mapSub}>Powered by backend branch locator</Text>
        </View>

        <Text style={styles.sectionTitle}>Select Branch</Text>
        {isLoadingBranches ? (
          <View style={styles.loadingBranches}>
            <LoadingSpinner size={28} color={Colors.primary} />
          </View>
        ) : (
          branches.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={[styles.branchCard, selectedBranch === b.id && styles.branchCardActive, Shadow.small]}
              onPress={() => setSelectedBranch(b.id)}
              activeOpacity={0.7}
            >
              <View style={styles.branchLeft}>
                <View style={[styles.branchIcon, selectedBranch === b.id && styles.branchIconActive]}>
                  <Ionicons name="business" size={18} color={selectedBranch === b.id ? Colors.textWhite : Colors.primary} />
                </View>
                <View style={styles.branchInfo}>
                  <Text style={styles.branchName}>{b.name}</Text>
                  <Text style={styles.branchAddress}>{b.address}</Text>
                  <View style={styles.branchMeta}>
                    <Ionicons name="location" size={11} color={Colors.textDisabled} />
                    <Text style={styles.branchMetaText}>{b.distance}</Text>
                    <Text style={styles.branchMetaText}>.</Text>
                    <Ionicons name="time" size={11} color={Colors.textDisabled} />
                    <Text style={styles.branchMetaText}>{b.hours}</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.radio, selectedBranch === b.id && styles.radioActive]}>
                {selectedBranch === b.id && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesRow}>
          {dates.map((d) => (
            <TouchableOpacity
              key={d.key}
              style={[styles.dateChip, selectedDate === d.key && styles.dateChipActive]}
              onPress={() => setSelectedDate(d.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dateDay, selectedDate === d.key && styles.dateDayActive]}>{d.day}</Text>
              <Text style={[styles.dateNum, selectedDate === d.key && styles.dateNumActive]}>{d.date}</Text>
              <Text style={[styles.dateMon, selectedDate === d.key && styles.dateMonActive]}>{d.month}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Select Time Slot</Text>
        <View style={styles.slotsRow}>
          {TIME_SLOTS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.slotCard, selectedSlot === s.key && styles.slotCardActive]}
              onPress={() => setSelectedSlot(s.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={s.icon} size={20} color={selectedSlot === s.key ? Colors.textWhite : Colors.textSecondary} />
              <Text style={[styles.slotLabel, selectedSlot === s.key && styles.slotLabelActive]}>{s.label}</Text>
              <Text style={[styles.slotTime, selectedSlot === s.key && styles.slotTimeActive]}>{s.time}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {canConfirm && (
          <View style={[styles.confirmCard, Shadow.small]}>
            <View style={styles.confirmHeader}>
              <Ionicons name="calendar" size={16} color={Colors.primary} />
              <Text style={styles.confirmHeaderText}>Appointment Summary</Text>
            </View>
            <View style={styles.confirmDivider} />
            {[
              { label: 'Branch', value: branch?.name ?? '' },
              { label: 'Date', value: date ? `${date.day}, ${date.date} ${date.month}` : '' },
              { label: 'Time', value: slot?.time ?? '' },
            ].map((row) => (
              <View key={row.label} style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{row.label}</Text>
                <Text style={styles.confirmValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      <View style={styles.footer}>
        <Button title={isBooking ? 'Booking...' : 'Confirm Appointment'} onPress={handleConfirm} disabled={!canConfirm || isBooking} loading={isBooking} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.lg },
  pageTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.primary },
  pageSubtitle: { ...Typography.body, color: Colors.textSecondary },
  warningBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.goldLight, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.comingSoonBorder },
  warningText: { flex: 1, fontFamily: FontFamily.regular, fontSize: 13, color: Colors.goldDark, lineHeight: 18 },
  mapPlaceholder: { height: 140, backgroundColor: Colors.backgroundLight, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
  mapText: { fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textSecondary },
  mapSub: { ...Typography.caption, color: Colors.textDisabled },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.textPrimary },
  loadingBranches: { padding: Spacing.xl, alignItems: 'center' },
  branchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border, gap: Spacing.sm },
  branchCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  branchLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  branchIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  branchIconActive: { backgroundColor: Colors.primary },
  branchInfo: { flex: 1 },
  branchName: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.textPrimary, marginBottom: 2 },
  branchAddress: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 16, marginBottom: 4 },
  branchMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' },
  branchMetaText: { ...Typography.caption, color: Colors.textDisabled },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioActive: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  datesRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  dateChip: { width: 60, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  dateChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dateDay: { fontFamily: FontFamily.medium, fontSize: 11, color: Colors.textSecondary },
  dateDayActive: { color: Colors.textWhite },
  dateNum: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textPrimary },
  dateNumActive: { color: Colors.textWhite },
  dateMon: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textDisabled },
  dateMonActive: { color: Colors.textWhite },
  slotsRow: { flexDirection: 'row', gap: Spacing.sm },
  slotCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 4, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background },
  slotCardActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  slotLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary },
  slotLabelActive: { color: Colors.textWhite },
  slotTime: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textDisabled, textAlign: 'center' },
  slotTimeActive: { color: Colors.textWhite },
  confirmCard: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  confirmHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: Spacing.md, backgroundColor: Colors.primaryLight },
  confirmHeaderText: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.primary },
  confirmDivider: { height: 1, backgroundColor: Colors.border },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  confirmLabel: { ...Typography.body, color: Colors.textSecondary },
  confirmValue: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.textPrimary, flex: 1, textAlign: 'right' },
  footer: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
});
