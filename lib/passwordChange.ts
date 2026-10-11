export function validatePasswordChange(input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('Enter your current and new passwords.');
  const p = input as Record<string, unknown>;
  if (typeof p.currentPassword !== 'string' || !p.currentPassword || p.currentPassword.length > 1024) throw new Error('Enter your current password.');
  if (typeof p.newPassword !== 'string' || p.newPassword.length < 12 || p.newPassword.length > 128) throw new Error('Use a new password with 12–128 characters.');
  if (p.confirmPassword !== p.newPassword) throw new Error('New passwords do not match.');
  if (p.currentPassword === p.newPassword) throw new Error('Choose a different password from your current password.');
  return { currentPassword: p.currentPassword, newPassword: p.newPassword };
}
