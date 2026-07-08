import React, { useState } from 'react';
import { FontFamily, FontSize } from '@/src/core/theme/typography';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/core/theme/colors';
import { Spacing, BorderRadius, Shadow } from '@/src/core/theme/spacing';
import { Button } from '@/src/shared/components/common/Button';
import {
  SUPPORT_EMAIL,
  PRIVACY_EMAIL,
  SUPPORT_PHONE,
} from '@/src/core/utils/constants';

// ---------------------------------------------------------------------------
// Content
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

const PRIVACY_CONTENT = `PRIVACY POLICY
Fuehrer NBFC — Effective Year 2026

This Privacy Policy outlines Fuehrer NBFC's approach to processing of your personal data. We understand the significance of your personal information and process the same in a responsible manner.

1. WHO IS COVERED?
   This policy is applicable to all existing customers, prospect customers, and persons ("User") who visit our office/branch and/or any Digital Property belonging to Fuehrer NBFC, which offers financial services such as Secured & Unsecured loans. If you are below 18 years of age, you are expected to use our Digital Property under the guidance of a parent or legal guardian.

2. CONSENT
   By using our App/website, or by availing various products/services from Fuehrer NBFC, the User consents to:
   • The terms of this Privacy Policy.
   • Collection of data in connection with availing loan products.
   • Aadhaar-based authentication (eKYC) or verification (OKYC) for KYC purposes.
   • Communications relating to marketing and business promotions.
   • Storage of data as per the company's policy in addition to regulatory and legal requirements.
   • E-Mandate Registration with eSignature.

3. TYPES OF INFORMATION COLLECTED
   We may collect the following types of information:
   a. Personal/demographic data: Name, age, date of birth, gender, address, mobile number, email ID, PAN number, photograph/image, KYC documents, bank account details, credit scores, GST details, provident fund account details.
   b. Device & usage data: Browser type, IP address, device identifiers, app usage patterns, cookies and similar technologies.
   c. Transaction data: Loan application details, repayment records, EMI schedules, and related financial transactions.

4. SOURCES OF INFORMATION
   Information may be collected from:
   a. The User directly, during product application (online or offline).
   b. User's browser, mobile application, or device.
   c. Third-party service providers, agents, or government databases (e.g., CKYC Registry, Aadhaar/UIDAI, Digilocker).
   d. Credit Information Companies (CICs): CIBIL, Experian, CRIF.

5. PURPOSE OF DATA COLLECTION
   Information collected from Users is used by Fuehrer NBFC for the following purposes:
   a. To provide financial services and products.
   b. To promote and develop new products and services.
   c. To comply with Applicable Laws and RBI regulations, including credit reporting.
   d. To share with CICs for bureau checks and credit assessment.
   e. To advertise exclusive offers, promotions, and customized financial products.
   f. To improve User experience and service quality.
   g. To facilitate KYC verification and prevent fraud.

6. APP PERMISSIONS
   Fuehrer NBFC App may request the following device-level permissions:
   • Camera — To capture identity documents and your selfie during KYC verification.
   • Photos — To upload identity documents and income proof from your device.
   • Biometric (Face ID / Fingerprint) — To authenticate and securely sign in to your account.

   Note: All permissions are optional and can be managed by the User via device settings.

7. COOKIES
   We may use cookies to:
   • Temporarily store session data for enhanced navigation.
   • Store non-personal information (browser type, OS, click patterns).
   • Store User preferences to ease navigation on the App/website.
   Personal information such as name and account number shall NOT be stored in cookies.

8. DATA SHARING
   Fuehrer NBFC may share your information with:
   • Our subsidiaries, group companies, and authorized partners for service delivery.
   • Regulatory/statutory authorities as required by law.
   • Third-party analytics partners for improving app experience.
   • Debt Management Services (DMS) agencies in case of loan delinquency.
   We do NOT sell your personal data to any third party.

9. DATA SECURITY
   Securing your information is of paramount importance to Fuehrer NBFC. We implement:
   • 256-bit SSL encryption for all digital transactions.
   • ISO 27001:2013 Information Security Management Standards.
   • Regular internal and external security audits.
   • Data Loss Prevention (DLP) and Security Operations Centre (SOC) solutions.
   • Strict access controls on a need-to-know basis.

10. DATA RETENTION
    Your data is retained as per applicable RBI/regulatory guidelines and the company's internal data retention policy. Upon successful loan closure or account termination, data will be retained only for the period mandated by law.

11. USER RIGHTS
    You have the right to:
    • Access your personal data held by us.
    • Request correction of inaccurate information.
    • Request deletion of your App account via: Menu > Help & Support > New Request > Others > Delete Account.
    • Withdraw consent (subject to regulatory obligations).

12. GRIEVANCE OFFICER
    For privacy-related concerns, please contact:
    Fuehrer NBFC Privacy Team
    Email: ${PRIVACY_EMAIL}
    Helpline: ${SUPPORT_PHONE} (Toll Free)
    Response Time: Within 30 working days.

13. CHANGES TO PRIVACY POLICY
    Fuehrer NBFC reserves the right to update this Privacy Policy from time to time to reflect changes in law or our practices.`;

// ---------------------------------------------------------------------------
// ScrollModal — bottom sheet with scroll-to-accept
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
          {/* Header */}
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

          {/* Scroll hint */}
          {!scrolledToBottom && (
            <View style={modal.hint}>
              <Text style={modal.hintText}>
                Scroll to the bottom to enable the Accept button ↓
              </Text>
            </View>
          )}

          {/* Scrollable content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={modal.contentPad}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator
          >
            <Text style={modal.bodyText}>{content}</Text>
          </ScrollView>

          {/* Accept button */}
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
// Screen
// ---------------------------------------------------------------------------

type ModalType = 'terms' | 'privacy' | null;

export default function TermsScreen() {
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const agreementChecked = termsAccepted && privacyAccepted;

  return (
    <SafeAreaView style={styles.container}>
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
          <Text style={styles.brandTagline}>N B F C</Text>
        </View>

        {/* Headline */}
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>
          Before you get started, please review and accept our terms and conditions.
        </Text>

        {/* Documents card */}
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.docRow, termsAccepted && styles.docRowAccepted]}
            onPress={() => setOpenModal('terms')}
            activeOpacity={0.7}
          >
            <View style={styles.docIcon}>
              <Ionicons name="document-text" size={20} color={Colors.primary} />
            </View>
            <View style={styles.docContent}>
              <Text style={styles.docTitle}>Terms of Service</Text>
              <Text style={styles.docSubtitle}>Read our terms and conditions</Text>
            </View>
            {termsAccepted
              ? <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              : <Ionicons name="open-outline" size={18} color={Colors.textDisabled} />
            }
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.docRow, privacyAccepted && styles.docRowAccepted]}
            onPress={() => setOpenModal('privacy')}
            activeOpacity={0.7}
          >
            <View style={styles.docIcon}>
              <Ionicons name="lock-closed" size={20} color={Colors.primary} />
            </View>
            <View style={styles.docContent}>
              <Text style={styles.docTitle}>Privacy Policy</Text>
              <Text style={styles.docSubtitle}>How we handle your data</Text>
            </View>
            {privacyAccepted
              ? <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              : <Ionicons name="open-outline" size={18} color={Colors.textDisabled} />
            }
          </TouchableOpacity>
        </View>

        {/* Checkbox */}
        <View style={styles.checkboxRow}>
          <View style={styles.checkboxFilled}>
            <Ionicons name="checkmark" size={14} color={Colors.textWhite} />
          </View>
          <Text style={styles.checkboxLabel}>
            {'I have read and agree to the '}
            <Text style={styles.checkboxLink} onPress={() => setOpenModal('terms')}>
              Terms of Service
            </Text>
            {' and '}
            <Text style={styles.checkboxLink} onPress={() => setOpenModal('privacy')}>
              Privacy Policy
            </Text>
          </Text>
        </View>

        {/* Security badges */}
        <View style={styles.badges}>
          {['RBI Compliant', 'Secure & Encrypted', '256-bit SSL'].map((badge) => (
            <View key={badge} style={styles.pill}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.pillText}>{badge}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.protectionText}>Your data is protected with encrypted access.</Text>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Accept & Continue"
          onPress={() => router.push('/(auth)/permissions')}
          disabled={!agreementChecked}
        />
      </View>

      {/* Modals */}
      {openModal === 'terms' && (
        <ScrollModal
          title="Terms of Service"
          subtitle="Read our terms and conditions"
          iconName="document-text"
          content={TERMS_CONTENT}
          accepted={termsAccepted}
          onAccept={() => setTermsAccepted(true)}
          onClose={() => setOpenModal(null)}
        />
      )}
      {openModal === 'privacy' && (
        <ScrollModal
          title="Privacy Policy"
          subtitle="How we handle your data"
          iconName="lock-closed"
          content={PRIVACY_CONTENT}
          accepted={privacyAccepted}
          onAccept={() => setPrivacyAccepted(true)}
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

  logoSection: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(37,99,235,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  brandName: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 2.5,
    marginTop: 2,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },

  card: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadow.small,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
  },
  docRowAccepted: {
    backgroundColor: Colors.successEmphasis,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  docContent: { flex: 1 },
  docTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  docSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  checkboxFilled: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  checkboxLink: {
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
  },

  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pillText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  protectionText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textDisabled,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },

  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});

// ---------------------------------------------------------------------------
// Styles — modal
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
