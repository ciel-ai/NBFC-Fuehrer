const AppError = require('./appError');

const sanitizePhoneInput = (value) => String(value || '').replace(/\D/g, '');

const normalizePhone = (value) => {
  let phone = sanitizePhoneInput(value);

  // Strip Indian country code / trunk prefix so we settle on the 10-digit
  // subscriber number: "+91 98765 43210" / "9198..." / "098..." -> "98...".
  if (phone.length === 12 && phone.startsWith('91')) {
    phone = phone.slice(2);
  } else if (phone.length === 11 && phone.startsWith('0')) {
    phone = phone.slice(1);
  }

  if (phone.length < 10 || phone.length > 15) {
    throw new AppError('Phone number must be between 10 and 15 digits.', 400);
  }

  return phone;
};

module.exports = {
  sanitizePhoneInput,
  normalizePhone,
};
