import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Typography, FontFamily, FontSize } from '@/src/core/theme/typography';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { appStorage } from '@/src/core/storage/storage';
import { SUPPORT_EMAIL, PRIVACY_EMAIL, SUPPORT_PHONE } from '@/src/core/utils/constants';

// ---------------------------------------------------------------------------
// Loan-application consent gate (T&C + KYC + credit bureau).
//
// Shown once, at the point of APPLYING for a loan — not at login. Browsing
// products, calculators and the logged-in app need no consent; pulling KYC
// and bureau data does. Acceptance is persisted per install, so returning
// applicants go straight through.
//
// Usage:
//   const { ensureConsent, consentGate } = useLoanConsent();
//   <Button onPress={() => ensureConsent(() => router.push(...))} />
//   ... {consentGate}   // render once, at screen root
// ---------------------------------------------------------------------------

const CONSENT_STORAGE_KEY = 'loan_consent_accepted_v1';

// ─── Legal content ────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

type ConsentKey = 'terms' | 'kyc' | 'credit';

interface ConsentItemMeta {
  key: ConsentKey;
  title: string;
  sublabel: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  content: string;
}

const CONSENT_ITEMS: ConsentItemMeta[] = [
  {
    key: 'terms',
    title: 'I agree to the Terms & Conditions',
    sublabel: 'Read our terms and conditions',
    icon: 'document-text-outline',
    content: TERMS_CONTENT,
  },
  {
    key: 'kyc',
    title: 'I consent to KYC verification',
    sublabel: 'For identity verification and compliance',
    icon: 'person-outline',
    content: KYC_CONTENT,
  },
  {
    key: 'credit',
    title: 'I agree to credit bureau checks',
    sublabel: 'To assess your credit eligibility',
    icon: 'stats-chart-outline',
    content: CREDIT_CONTENT,
  },
];

// ─── ScrollModal — read-to-accept detail sheet ────────────────────────────────

function ScrollModal({
  item,
  accepted,
  onAccept,
  onClose,
}: {
  item: ConsentItemMeta;
  accepted: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
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
              <Ionicons name={item.icon} size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modal.headerTitle}>{item.title.replace(/^I (agree to the |agree to |consent to )/, '')}</Text>
              <Text style={modal.headerSubtitle}>{item.sublabel}</Text>
            </View>
            <TouchableOpacity style={modal.closeBtn} onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {!scrolledToBottom && (
            <View style={modal.hint}>
              <Text style={modal.hintText}>Scroll to the bottom to enable the Accept button ↓</Text>
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={modal.contentPad}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator
          >
            <Text style={modal.bodyText}>{item.content}</Text>
          </ScrollView>

          <View style={modal.footer}>
            <TouchableOpacity
              disabled={!scrolledToBottom}
              onPress={() => { onAccept(); onClose(); }}
              style={[modal.acceptBtn, { backgroundColor: btnBg }]}
              activeOpacity={0.85}
            >
              <Text style={modal.acceptBtnText}>{accepted ? '✓ Accepted' : 'Accept'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

function ConsentSheet({
  onAccepted,
  onDismiss,
}: {
  onAccepted: () => void;
  onDismiss: () => void;
}) {
  const [checked, setChecked] = useState<Record<ConsentKey, boolean>>({
    terms: false,
    kyc: false,
    credit: false,
  });
  const [openModal, setOpenModal] = useState<ConsentKey | null>(null);

  const toggle = (key: ConsentKey) => setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  const allChecked = checked.terms && checked.kyc && checked.credit;
  const activeItem = openModal ? CONSENT_ITEMS.find((i) => i.key === openModal) : null;

  return (
    <Modal visible transparent statusBarTranslucent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDismiss} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Before you apply</Text>
          <Text style={styles.sheetSubtitle}>
            Applying for a loan needs your consent for KYC and credit checks.
          </Text>

          {CONSENT_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.consentRow}
              onPress={() => toggle(item.key)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: checked[item.key] }}
              accessibilityLabel={item.title}
            >
              <View style={[styles.checkbox, checked[item.key] && styles.checkboxActive]}>
                {checked[item.key] && (
                  <Ionicons name="checkmark" size={14} color={Colors.textWhite} />
                )}
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowSublabel}>{item.sublabel}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setOpenModal(item.key)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={`Read ${item.sublabel}`}
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
            onPress={onAccepted}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ disabled: !allChecked }}
          >
            <Text style={styles.continueBtnText}>Agree & Continue</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeItem && (
        <ScrollModal
          item={activeItem}
          accepted={checked[activeItem.key]}
          onAccept={() => setChecked((prev) => ({ ...prev, [activeItem.key]: true }))}
          onClose={() => setOpenModal(null)}
        />
      )}
    </Modal>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLoanConsent() {
  const [visible, setVisible] = useState(false);
  const [accepted, setAccepted] = useState<boolean | null>(null);
  const pendingAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    void appStorage.get(CONSENT_STORAGE_KEY).then((v) => {
      if (mounted) setAccepted(Boolean(v));
    });
    return () => {
      mounted = false;
    };
  }, []);

  /** Runs `proceed` immediately if consent is on record; otherwise shows the sheet first. */
  const ensureConsent = useCallback(
    (proceed: () => void) => {
      if (accepted) {
        proceed();
        return;
      }
      pendingAction.current = proceed;
      setVisible(true);
    },
    [accepted],
  );

  const handleAccepted = useCallback(() => {
    setVisible(false);
    setAccepted(true);
    void appStorage.set(CONSENT_STORAGE_KEY, new Date().toISOString());
    const proceed = pendingAction.current;
    pendingAction.current = null;
    proceed?.();
  }, []);

  const consentGate = visible ? (
    <ConsentSheet onAccepted={handleAccepted} onDismiss={() => setVisible(false)} />
  ) : null;

  return { ensureConsent, consentGate };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
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
  rowContent: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
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
  continueBtnDisabled: { backgroundColor: Colors.disabled },
  continueBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textWhite,
  },
});

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
