

const signzyClient = require('../vendors/signzyClient');
const enachClient = require('../vendors/enachClient');
const prisma = require('../config/prismaClient');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const { encryptText } = require('../utils/cryptoUtils');
const {
  KYC_STATUS,
  ESIGN_STATUS,
  ENACH_STATUS,
} = require('../utils/constants');

const ensureUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return user;
};

const upsertKycDetail = (userId, data) => {
  return prisma.kycDetail.upsert({
    where: {
      userId,
    },
    update: data,
    create: {
      userId,
      ...data,
    },
  });
};

const refreshKycStatus = async (userId) => {
  const kycDetail = await prisma.kycDetail.findUnique({
    where: {
      userId,
    },
  });

  const status =
    kycDetail &&
    kycDetail.panVerified &&
    kycDetail.aadhaarVerified &&
    kycDetail.selfieVerified
      ? KYC_STATUS.VERIFIED
      : KYC_STATUS.PENDING;

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      kycStatus: status,
      isKycDone: status === KYC_STATUS.VERIFIED,
    },
  });

  return status;
};

const buildKycStatusPayload = async (userId) => {
  const user = await ensureUser(userId);
  const kycDetail = await prisma.kycDetail.findUnique({
    where: {
      userId,
    },
  });

  return {
    userId,
    kycStatus: user.kycStatus,
    panVerified: kycDetail ? kycDetail.panVerified : false,
    aadhaarVerified: kycDetail ? kycDetail.aadhaarVerified : false,
    selfieVerified: kycDetail ? kycDetail.selfieVerified : false,
    eSignStatus: kycDetail ? kycDetail.eSignStatus : ESIGN_STATUS.PENDING,
  };
};

const verifyPan = async () => {
  throw new AppError(
    'PAN verification via user-module is not supported. Use the KYC endpoints on the main API (Perfios-based).',
    410,
  );
};

// Aadhaar/selfie verification via user-module previously called
// hypervergeClient.js, a vendor integration that was never actually the
// confirmed KYC vendor - Perfios is, wired up separately in business-module.
// Confirmed no reference anywhere in the mobile app to these user-module
// routes by any naming pattern - the real Aadhaar/selfie flow goes through
// business-module's Perfios-based routes instead (the same pattern already
// confirmed and fixed for PAN verification / karzaClient.js).
const verifyAadhaar = async () => {
  throw new AppError(
    'Aadhaar verification via user-module is not supported. Use the KYC endpoints on the main API (Perfios-based).',
    410,
  );
};

const verifySelfie = async () => {
  throw new AppError(
    'Selfie verification via user-module is not supported. Use the KYC endpoints on the main API (Perfios-based).',
    410,
  );
};

const getKycStatus = async (userId) => {
  return buildKycStatusPayload(userId);
};

const esignLoanAgreement = async (userId, documentId) => {
  await ensureUser(userId);

  const resolvedDocumentId = documentId || `loan-agreement-${userId}`;
  const providerResponse = await signzyClient.initiateEsign({
    userId,
    documentId: resolvedDocumentId,
  });

  if (!providerResponse.success) {
    throw new AppError('eSign failed.', 400);
  }

  await upsertKycDetail(userId, {
    eSignStatus: ESIGN_STATUS.SIGNED,
  });

  logger.info({
    message: 'eSign completed successfully.',
    userId,
    documentId: resolvedDocumentId,
  });

  return {
    documentId: resolvedDocumentId,
    eSignStatus: ESIGN_STATUS.SIGNED,
    providerResponse,
  };
};

const registerEnach = async (userId, payload) => {
  await ensureUser(userId);

  const providerResponse = await enachClient.registerMandate(payload);

  if (!providerResponse.success) {
    throw new AppError('eNACH registration failed.', 400);
  }

  const mandate = await prisma.eNachMandate.upsert({
    where: {
      userId,
    },
    update: {
      mandateId: providerResponse.mandateId,
      status: providerResponse.status || ENACH_STATUS.PENDING,
    },
    create: {
      userId,
      mandateId: providerResponse.mandateId,
      status: providerResponse.status || ENACH_STATUS.PENDING,
    },
  });

  logger.info({
    message: 'eNACH mandate registered successfully.',
    userId,
    mandateId: mandate.mandateId,
    status: mandate.status,
  });

  return {
    mandateId: mandate.mandateId,
    status: mandate.status,
    providerResponse,
  };
};

const getEnachStatus = async (userId) => {
  await ensureUser(userId);

  const mandate = await prisma.eNachMandate.findUnique({
    where: {
      userId,
    },
  });

  if (!mandate) {
    return {
      mandateId: null,
      status: ENACH_STATUS.PENDING,
    };
  }

  return {
    mandateId: mandate.mandateId,
    status: mandate.status,
  };
};

module.exports = {
  verifyPan,
  verifyAadhaar,
  verifySelfie,
  getKycStatus,
  esignLoanAgreement,
  registerEnach,
  getEnachStatus,
};
