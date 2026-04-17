function parseBypassEmails(raw) {
  return String(raw || '')
    .split(',')
    .map((v) => String(v || '').trim().toLowerCase())
    .filter(Boolean);
}

function isBillingBypassUser(user) {
  const email = String((user && user.email) || '').trim().toLowerCase();
  if (!email) return false;
  const allowList = parseBypassEmails(process.env.TEST_BILLING_BYPASS_EMAILS);
  return allowList.includes(email);
}

function applyBillingBypassShape(row, bypassEnabled) {
  if (!bypassEnabled || !row) return row;
  return {
    ...row,
    billing_required: false,
    billing_status: 'active',
    pending_plan: null,
  };
}

module.exports = {
  isBillingBypassUser,
  applyBillingBypassShape,
};
