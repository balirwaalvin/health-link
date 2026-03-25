export function normalizePhoneInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function isTenDigitPhone(value: string): boolean {
  return /^\d{10}$/.test(value);
}

export function isEmptyOrTenDigitPhone(value: string): boolean {
  return value === '' || isTenDigitPhone(value);
}