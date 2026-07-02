// Role helpers — the DB stores upper-snake roles ("CUSTOMER", "SALES_CDL")
// while the mobile app expects lower-snake ("customer", "sales_cdl").

const SALES_ROLES = ['SALES_CDL', 'SALES_GOLD', 'SALES_HOUSING'];

// DB "SALES_CDL" -> client "sales_cdl"; DB "CUSTOMER" -> client "customer"
const toClientRole = (dbRole) => String(dbRole || 'CUSTOMER').toLowerCase();

const isSalesRole = (dbRole) => SALES_ROLES.includes(dbRole);

const roleToProduct = (dbRole) => {
  const map = { SALES_CDL: 'cdl', SALES_GOLD: 'gold', SALES_HOUSING: 'housing' };
  return map[dbRole] ?? null;
};

module.exports = { toClientRole, isSalesRole, roleToProduct, SALES_ROLES };
