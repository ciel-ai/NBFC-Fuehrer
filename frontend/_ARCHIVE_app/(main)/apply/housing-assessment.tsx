import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { FontFamily, FontSize, Typography } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Header } from '@/src/shared/components/common/Header';
import { Button } from '@/src/shared/components/common/Button';
import { LoadingSpinner } from '@/src/shared/components/common/LoadingSpinner';
import { formatCurrency, calculateEMI } from '@/src/core/utils/formatters';
import { useServices } from '@/src/core/services/ServiceProvider';
import { HOUSING_INTEREST_RATE } from '@/src/entities/housingLoan';
import type {
  HousingCreditAssessment,
  HousingIncomeAssessment,
  HousingPropertyAssessment,
} from '@/src/entities/housingLoan';

export default function HousingAssessmentScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { housingLoanService } = useServices();

  const amount = Number(params.amount) || 3600000;
  const tenure = Number(params.tenure) || 20;
  const agreementValue = Number(params.agreementValue) || 4500000;
  const emi = calculateEMI(amount, HOUSING_INTEREST_RATE, tenure * 12);
  const primaryIncome = Number(params.monthlyIncome) || 0;
  const coAppIncome = Number(params.coAppIncome) || 0;
  const combinedIncome = Number(params.combinedIncome) || primaryIncome + coAppIncome;
  const hasCoApplicant = params.hasCoApplicant === '1';

  const [income, setIncome] = useState<HousingIncomeAssessment | null>(null);
  const [credit, setCredit] = useState<HousingCreditAssessment | null>(null);
  const [property, setProperty] = useState<HousingPropertyAssessment | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const appId = params.applicationId ?? 'hl_mock';
        const inc = await housingLoanService.runIncomeAssessment(appId, {
          primaryMonthlyIncome: primaryIncome,
          coApplicantMonthlyIncome: coAppIncome,
          gstin: params.gstin,
        });
        if (!mounted) return;
        setIncome(inc);

        const cr = await housingLoanService.runCreditAssessment(appId, {
          combinedMonthlyIncome: inc.combinedMonthlyIncome || combinedIncome,
          emiEstimate: emi,
          hasCoApplicant,
        });
        if (!mounted) return;
        setCredit(cr);

        const prop = await housingLoanService.runPropertyAssessment(appId, {
          loanAmount: amount,
          agreementValue,
          pincode: params.pincode,
        });
        if (!mounted) return;
        setProperty(prop);
        setDone(true);
      } catch {
        if (mounted) Alert.alert('Assessment failed', 'Please try again.');
      }
    };
    void run();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [housingLoanService]);

  const rejected = property?.outcome === 'reject';

  const handleContinue = () => {
    if (!property || !credit) return;
    if (property.outcome === 'reject') {
      router.replace({
        pathname: '/(main)/apply/loan-rejected',
        params: { reason: property.rejectionReason ?? 'Application does not meet housing policy.' },
      });
      return;
    }
    router.replace({
      pathname: '/(main)/apply/housing-review-pending',
      params: {
        ...params,
        emi: String(emi),
        ltv: String(property.ltv),
        pmaySubsidy: String(property.pmaySubsidy),
        foir: String(credit.foir),
        cersaiReview: property.outcome === 'review' ? '1' : '0',
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Property & Credit Assessment" showBack={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={[styles.heroCircle, rejected && { backgroundColor: Colors.error }]}>
            {done ? (
              <Ionicons name={rejected ? 'close' : 'checkmark-done'} size={36} color={Colors.textWhite} />
            ) : (
              <LoadingSpinner size={36} color={Colors.textWhite} />
            )}
          </View>
          <Text style={styles.heroTitle}>
            {!done ? 'Verifying your application…' : rejected ? 'Policy check failed' : 'Assessment complete'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {!done
              ? 'Running income (ITR/GST), credit (CIBIL), and property (CERSAI/legal/technical) checks.'
              : rejected
                ? property?.rejectionReason
                : 'All checks complete. Housing loans still require a mandatory credit-committee review.'}
          </Text>
        </View>

        {/* Income */}
        <SectionCard title="Income Assessment" provider="Perfios ITR + GSTIN" result={income}>
          {income && (
            <>
              <Row k="ITR parsed" v={`${income.itrYearsParsed} years`} />
              <Row k="Avg annual profit" v={formatCurrency(income.avgAnnualProfit)} />
              <Row k="GST filing history" v={`${income.gstFilingMonths} months`} />
              <Row k="Business vintage" v={`${income.businessVintageYears} years`} />
              <Row k="Combined monthly income" v={formatCurrency(income.combinedMonthlyIncome)} last />
            </>
          )}
        </SectionCard>

        {/* Credit */}
        <SectionCard title="Credit Assessment" provider="TransUnion CIBIL" result={credit}>
          {credit && (
            <>
              <Row k="Primary CIBIL" v={String(credit.primaryCibil)} />
              {credit.coApplicantCibil != null && <Row k="Co-applicant CIBIL" v={String(credit.coApplicantCibil)} />}
              <Row k="Housing EMI estimate" v={formatCurrency(credit.emiEstimate)} />
              <Row
                k="FOIR"
                v={`${credit.foir}% (${credit.foirStatus})`}
                last
              />
            </>
          )}
        </SectionCard>

        {/* Property */}
        <SectionCard title="Property Assessment" provider="CERSAI · Legal · Technical · NHB" result={property}>
          {property && (
            <>
              <Row k="CERSAI encumbrance" v={property.encumbranceFound ? 'Charge found' : 'None found'} />
              <Row k="Legal title" v={property.legalStatus === 'review' ? 'Counsel review' : 'Cleared'} />
              <Row k="Technical valuation" v={formatCurrency(property.technicalValuation)} />
              <Row k="LTV" v={`${property.ltv}% ${property.ltvWithinPolicy ? '(within policy)' : '(exceeds 80%)'}`} />
              <Row k="PMAY subsidy" v={property.pmayEligible ? formatCurrency(property.pmaySubsidy) : 'Not eligible'} last />
            </>
          )}
        </SectionCard>

        {done && !rejected && (
          <View style={styles.reviewNote}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
            <Text style={styles.reviewNoteText}>
              Housing loans always require manual credit-committee review — even when all automated checks pass.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={!done ? 'Verifying…' : rejected ? 'View Decision' : 'Submit for Committee Review'}
          onPress={handleContinue}
          disabled={!done}
          loading={!done}
        />
      </View>
    </SafeAreaView>
  );
}

function Row({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.rowKey}>{k}</Text>
        <Text style={styles.rowVal}>{v}</Text>
      </View>
      {!last && <View style={styles.divider} />}
    </View>
  );
}

function SectionCard({
  title,
  provider,
  result,
  children,
}: {
  title: string;
  provider: string;
  result: unknown;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {result ? (
          <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
        ) : (
          <LoadingSpinner size={16} color={Colors.primary} />
        )}
      </View>
      <Text style={styles.cardProvider}>{provider}</Text>
      {result ? <View style={styles.cardBody}>{children}</View> : null}
    </View>
  );
}

const CIRCLE = 92;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundLight },
  content: { padding: Spacing.md, gap: Spacing.md },
  heroSection: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  heroCircle: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.primary, textAlign: 'center' },
  heroSubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  card: { backgroundColor: Colors.background, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.small },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary },
  cardProvider: { ...Typography.tiny, color: Colors.textSecondary, marginTop: 2 },
  cardBody: { marginTop: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.sm },
  rowKey: { ...Typography.caption, color: Colors.textSecondary },
  rowVal: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1, textTransform: 'capitalize' },
  divider: { height: 1, backgroundColor: Colors.border },
  reviewNote: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'flex-start' },
  reviewNoteText: { ...Typography.caption, color: Colors.primary, flex: 1, lineHeight: 18 },
  footer: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
});
