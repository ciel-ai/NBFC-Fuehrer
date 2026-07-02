import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Button } from '@/src/shared/components/common/Button';
import { SUPPORT_EMAIL, PRIVACY_EMAIL, SUPPORT_PHONE } from '@/src/core/utils/constants';

// ---------------------------------------------------------------------------
// Legal content
// ---------------------------------------------------------------------------

const TERMS_CONTENT = `TERMS AND CONDITIONS
Fuehrer NBFC — Effective Year 2026

1. INTRODUCTION
   Fuehrer NBFC ("Company", "we", "us", or "our") is a Non-Banking Finance Company (NBFC) registered with the Reserve Bank of India (RBI). By accessing or using our mobile application ("App"), website, or any of our financial services, you ("User") agree to be bound by these Terms and Conditions ("Terms"). Please read them carefully before proceeding. If you do not agree to these Terms, you are advised not to use or access our App or services in any manner.

2. ELIGIBILITY
   To use Fuehrer NBFC services, you must:
   • Be at least 18 years of age.
   • Be a resident citizen of India.
   • Have valid KYC documents as required under applicable law.
   • Possess a valid bank account in India.

3. SERVICES OFFERED
   Fuehrer NBFC offers the following financial services through its App:
   • Consumer Durable Loans
   • Affordable Housing Loans
   • Gold Loans
   • Digital KYC and eSign Services

4. USER ACCOUNT AND REGISTRATION
   4.1 You must register by providing accurate, complete, and current information. You are responsible for maintaining the confidentiality of your login credentials.
   4.2 You agree to notify us immediately of any unauthorized use of your account.
   4.3 Fuehrer NBFC reserves the right to suspend or terminate your account if any information provided is found to be false, inaccurate, or incomplete.

5. KYC AND DOCUMENTATION
   In compliance with RBI guidelines and PMLA (Prevention of Money Laundering Act), all users must complete KYC verification before availing any financial product. This includes Aadhaar-based eKYC, PAN verification, and other document submissions as may be required.

6. LOAN TERMS
   6.1 Loan disbursals are subject to credit assessment, KYC verification, and internal risk policies.
   6.2 Interest rates, processing fees, and repayment schedules will be disclosed in the loan agreement prior to disbursal.
   6.3 Prepayment charges, if any, will be communicated at the time of loan application.
   6.4 Failure to repay loan EMIs on time will attract penal interest and may adversely affect your credit score reported to CICs (CIBIL, Experian, CRIF).

7. DIGITAL TRANSACTIONS
   All digital transactions conducted through the App are secured using 256-bit SSL encryption. Fuehrer NBFC shall not be liable for any unauthorized transactions resulting from the User's negligence or failure to secure their credentials.

8. INTELLECTUAL PROPERTY
   All content, trademarks, logos, and intellectual property on the App or website are the exclusive property of Fuehrer NBFC. Reproduction, distribution, or use without prior written consent is strictly prohibited.

9. THIRD-PARTY SERVICES
   The App may include links or integrations to third-party services. Fuehrer NBFC is not responsible for the content, privacy practices, or terms of such third-party services.

10. LIMITATION OF LIABILITY
    To the maximum extent permitted by applicable law, Fuehrer NBFC shall not be liable for any indirect, incidental, special, or consequential damages arising from the use or inability to use our services.

11. GRIEVANCE REDRESSAL
    Users may raise grievances through the App under Help & Support > New Request. Our dedicated Grievance Officer will respond within 30 working days in compliance with RBI guidelines.

12. GOVERNING LAW
    These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in India.

13. AMENDMENTS
    Fuehrer NBFC reserves the right to amend these Terms at any time. Continued use of the App after any changes constitutes acceptance of the revised Terms.

14. CONTACT US
    Fuehrer NBFC Customer Support
    Email: ${SUPPORT_EMAIL}
    Helpline: ${SUPPORT_PHONE} (Toll Free)`;

const KYC_CONTENT = `KYC VERIFICATION CONSENT
Fuehrer NBFC — As required by RBI Guidelines

By consenting, you authorize Fuehrer NBFC to:
• Collect and verify your identity documents (Aadhaar, PAN, passport, voter ID).
• Capture your photograph/selfie for identity verification.
• Conduct Aadhaar-based eKYC or offline KYC (OKYC) as applicable.
• Store your KYC records in compliance with PMLA and RBI guidelines.

Your KYC data is encrypted and securely stored. It is shared only with regulatory authorities as required by law.

For queries, contact:
Email: ${SUPPORT_EMAIL}
Helpline: ${SUPPORT_PHONE} (Toll Free)`;

const CREDIT_CONTENT = `CREDIT BUREAU CHECK CONSENT
Fuehrer NBFC — Credit Assessment

By consenting, you authorize Fuehrer NBFC and its authorized representatives to:
• Access your credit information from Credit Information Companies (CICs) including CIBIL, Experian, CRIF High Mark, and Equifax.
• Use the credit report to assess your creditworthiness and determine loan eligibility.
• Share your repayment performance with CICs as required by RBI regulations.

Note: This authorization remains valid for the duration of your loan relationship with Fuehrer NBFC.

For queries, contact:
Email: ${PRIVACY_EMAIL}
Helpline: ${SUPPORT_PHONE} (Toll Free)`;

// ---------------------------------------------------------------------------
// ScrollModal — reusable bottom sheet with scroll-to-accept
// ---------------------------------------------------------------------------

interface ScrollModalProps {
  title: string;
  subtitle: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  content: string;
  accepted: boolean;
  onAccept: () => void;
  onClose: () => void;
}

function ScrollModal({
  title,
  subtitle,
  iconName,
  content,
  accepted,
  onAccept,
  onClose,
}: ScrollModalProps) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (event: {
    nativeEvent: {
      contentOffset: { y: number };
      layoutMeasurement: { height: number };
      contentSize: { height: number };
    };
  }) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 24) {
      setScrolledToBottom(true);
    }
  };

  const btnBg = scrolledToBottom
    ? accepted ? Colors.success : Colors.primary
    : Colors.disabled;

  return (
    <Modal visible transparent statusBarTranslucent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <View style={modal.iconBox}>
              <Ionicons name={iconName} size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modal.headerTitle}>{title}</Text>
              <Text style={modal.headerSubtitle}>{subtitle}</Text>
            </View>
            <TouchableOpacity style={modal.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {!scrolledToBottom && (
            <View style={modal.hint}>
              <Text style={modal.hintText}>
                Scroll to the bottom to enable the Accept button ↓
              </Text>
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={modal.contentPad}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator
          >
            <Text style={modal.bodyText}>{content}</Text>
          </ScrollView>

          <View style={modal.footer}>
            <TouchableOpacity
              disabled={!scrolledToBottom}
              onPress={() => { onAccept(); onClose(); }}
              style={[modal.acceptBtn, { backgroundColor: btnBg }]}
              activeOpacity={0.85}
            >
              <Text style={modal.acceptBtnText}>
                {accepted ? `✓ ${title} Accepted` : `Accept ${title}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Consent items
// ---------------------------------------------------------------------------

type ConsentKey = 'terms' | 'kyc' | 'credit';

interface ConsentItem {
  key: ConsentKey;
  label: React.ReactNode;
  sublabel: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  modalTitle: string;
  modalSubtitle: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function LandingScreen() {
  const [showConsent, setShowConsent] = useState(false);
  const [checked, setChecked] = useState({ terms: false, kyc: false, credit: false });
  const [openModal, setOpenModal] = useState<ConsentKey | null>(null);

  const toggle = (key: ConsentKey) =>
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  const allChecked = checked.terms && checked.kyc && checked.credit;

  const CONSENT_ITEMS: ConsentItem[] = [
    {
      key: 'terms',
      label: (
        <Text style={styles.rowTitle}>
          {'I agree to the '}
          <Text style={styles.rowTitleLink} onPress={() => setOpenModal('terms')}>
            Terms & Conditions
          </Text>
        </Text>
      ),
      sublabel: 'Read our terms and conditions',
      icon: 'document-text-outline',
      modalTitle: 'Terms & Conditions',
      modalSubtitle: 'Read our terms and conditions',
      content: TERMS_CONTENT,
    },
    {
      key: 'kyc',
      label: <Text style={styles.rowTitle}>I consent to KYC verification</Text>,
      sublabel: 'For identity verification and compliance',
      icon: 'person-outline',
      modalTitle: 'KYC Verification',
      modalSubtitle: 'For identity verification and compliance',
      content: KYC_CONTENT,
    },
    {
      key: 'credit',
      label: <Text style={styles.rowTitle}>I agree to credit bureau checks</Text>,
      sublabel: 'To assess your credit eligibility',
      icon: 'stats-chart-outline',
      modalTitle: 'Credit Bureau Check',
      modalSubtitle: 'To assess your credit eligibility',
      content: CREDIT_CONTENT,
    },
  ];

  const activeItem = openModal ? CONSENT_ITEMS.find((i) => i.key === openModal) : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.brandName}>Fuehrer</Text>
          <Text style={styles.brandTagline}>NBFC</Text>
        </View>

        {/* Headline */}
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Login to access your loans, track applications, and manage your EMIs — all in one place.
        </Text>

        {/* Trust badges */}
        <View style={styles.badgesRow}>
          {[
            { icon: 'shield-checkmark' as const, label: 'RBI Registered' },
            { icon: 'lock-closed' as const, label: '256-bit SSL' },
            { icon: 'flash' as const, label: 'Instant Approval' },
          ].map((badge) => (
            <View key={badge.label} style={styles.badge}>
              <Ionicons name={badge.icon} size={13} color={Colors.success} />
              <Text style={styles.badgeText}>{badge.label}</Text>
            </View>
          ))}
        </View>

        {/* Info card */}
        <View style={styles.card}>
          {[
            { icon: 'phone-portrait' as const, text: 'Consumer Durable Loans up to ₹5 Lakhs' },
            { icon: 'home' as const, text: 'Affordable Housing Finance' },
            { icon: 'diamond' as const, text: 'Gold Loans @ 0.88% per month' },
          ].map((item) => (
            <View key={item.text} style={styles.cardRow}>
              <View style={styles.cardIcon}>
                <Ionicons name={item.icon} size={18} color={Colors.primary} />
              </View>
              <Text style={styles.cardText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Get Started"
          onPress={() => setShowConsent(true)}
        />
      </View>

      {/* Consent popup — rendered in-tree (not a native Modal) so navigating
          from "Continue" dispatches cleanly to the root navigator. */}
      {showConsent && (
        <View style={[StyleSheet.absoluteFill, styles.consentOverlay]}>
          <TouchableOpacity
            style={styles.consentBackdrop}
            activeOpacity={1}
            onPress={() => setShowConsent(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>Before you continue</Text>
            <Text style={styles.sheetSubtitle}>
              Please review and accept the following to proceed.
            </Text>

            {CONSENT_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.consentRow}
                onPress={() => toggle(item.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, checked[item.key] && styles.checkboxActive]}>
                  {checked[item.key] && (
                    <Ionicons name="checkmark" size={14} color={Colors.textWhite} />
                  )}
                </View>
                <View style={styles.rowContent}>
                  {item.label}
                  <Text style={styles.rowSublabel}>{item.sublabel}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setOpenModal(item.key)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            <View style={styles.safetyRow}>
              <Ionicons name="lock-closed" size={13} color={Colors.success} />
              <Text style={styles.safetyText}>Your data is safe and encrypted</Text>
            </View>

            <TouchableOpacity
              style={[styles.continueBtn, !allChecked && styles.continueBtnDisabled]}
              disabled={!allChecked}
              onPress={() => {
                setShowConsent(false);
                router.push('/(auth)/permissions');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Detail modals */}
      {activeItem && (
        <ScrollModal
          title={activeItem.modalTitle}
          subtitle={activeItem.modalSubtitle}
          iconName={activeItem.icon}
          content={activeItem.content}
          accepted={checked[activeItem.key]}
          onAccept={() => setChecked((prev) => ({ ...prev, [activeItem.key]: true }))}
          onClose={() => setOpenModal(null)}
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles — screen
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.md,
    flexGrow: 1,
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  brandName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.primary,
    letterSpacing: 1,
  },
  brandTagline: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 3,
    marginTop: 2,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },

  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textSecondary,
  },

  card: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    ...Typography.body,
    color: Colors.textSecondary,
    flex: 1,
  },

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },

  // ---- Consent popup ----
  consentOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  consentBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    ...Shadow.large,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  rowTitleLink: {
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
  },
  rowSublabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  safetyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  continueBtn: {
    height: 54,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: Colors.disabled,
  },
  continueBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textWhite,
  },
});

// ---------------------------------------------------------------------------
// Styles — detail modal
// ---------------------------------------------------------------------------

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '88%',
    ...Shadow.large,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    backgroundColor: '#fffbea',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  hintText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: '#92400e',
  },
  contentPad: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  bodyText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  acceptBtn: {
    borderRadius: BorderRadius.xl,
    paddingVertical: 15,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.textWhite,
  },
});
