export function membershipTier(cuts) {
  const n = Number(cuts) || 0;
  if (n >= 91) return 'VIP';
  if (n >= 41) return 'Premium';
  return 'Membership';
}
