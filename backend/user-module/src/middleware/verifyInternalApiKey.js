const AppError = require('../utils/appError');

// Verifies a shared secret for server-to-server calls (business-module ->
// user-module), as distinct from customer-facing JWT auth. Used for actions
// that only a staff member (authenticated on business-module's side, which
// owns staff auth) should be able to trigger against user-module's own
// customer data — e.g. deactivating a customer account.
const verifyInternalApiKey = (req, res, next) => {
    const providedKey = req.headers['x-internal-api-key'];
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey) {
        return next(new AppError('INTERNAL_API_KEY not configured on this server.', 500));
    }
    if (!providedKey || providedKey !== expectedKey) {
        return next(new AppError('Invalid or missing internal API key.', 401));
    }
    next();
};

module.exports = verifyInternalApiKey;