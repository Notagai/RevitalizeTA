/** Shared credential contract without importing the network adapter. */
export type Credentials = { username: string; password: string };
/** School account IDs are nine digits; passwords may contain punctuation. */
export function validSchoolCredentials(value: unknown): value is Credentials {
  if (!value || typeof value !== 'object') return false;
  const { username, password } = value as Record<string, unknown>;
  return typeof username === 'string' && /^\d{9}$/.test(username)
    && typeof password === 'string' && password.length > 0 && password.length <= 256
    && !/[\u0000-\u001F\u007F]/.test(password);
}
