export function requireServerEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function hasServerEnv(key: string): boolean {
  const value = process.env[key];
  return Boolean(value && value.trim().length > 0);
}
