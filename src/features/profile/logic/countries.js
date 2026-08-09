export const COUNTRIES = [
  { iso: 'PH', name: 'Philippines', dial: '63' },
  { iso: 'SG', name: 'Singapore', dial: '65' },
  { iso: 'MY', name: 'Malaysia', dial: '60' },
  { iso: 'ID', name: 'Indonesia', dial: '62' },
  { iso: 'TH', name: 'Thailand', dial: '66' },
  { iso: 'VN', name: 'Vietnam', dial: '84' },
  { iso: 'MM', name: 'Myanmar', dial: '95' },
  { iso: 'KH', name: 'Cambodia', dial: '855' },
  { iso: 'LA', name: 'Laos', dial: '856' },
  { iso: 'BN', name: 'Brunei', dial: '673' },
  { iso: 'HK', name: 'Hong Kong', dial: '852' },
  { iso: 'TW', name: 'Taiwan', dial: '886' },
  { iso: 'MO', name: 'Macau', dial: '853' },
  { iso: 'CN', name: 'China', dial: '86' },
  { iso: 'JP', name: 'Japan', dial: '81' },
  { iso: 'KR', name: 'South Korea', dial: '82' },
  { iso: 'IN', name: 'India', dial: '91' },
  { iso: 'PK', name: 'Pakistan', dial: '92' },
  { iso: 'BD', name: 'Bangladesh', dial: '880' },
  { iso: 'LK', name: 'Sri Lanka', dial: '94' },
  { iso: 'NP', name: 'Nepal', dial: '977' },
  { iso: 'AU', name: 'Australia', dial: '61' },
  { iso: 'NZ', name: 'New Zealand', dial: '64' },
  { iso: 'US', name: 'United States', dial: '1' },
  { iso: 'CA', name: 'Canada', dial: '1' },
  { iso: 'GB', name: 'United Kingdom', dial: '44' },
  { iso: 'DE', name: 'Germany', dial: '49' },
  { iso: 'FR', name: 'France', dial: '33' },
  { iso: 'ES', name: 'Spain', dial: '34' },
  { iso: 'IT', name: 'Italy', dial: '39' },
  { iso: 'NL', name: 'Netherlands', dial: '31' },
  { iso: 'AE', name: 'UAE', dial: '971' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966' },
  { iso: 'QA', name: 'Qatar', dial: '974' },
  { iso: 'KW', name: 'Kuwait', dial: '965' },
];

const SORTED_BY_DIAL_LENGTH = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

export function flagEmoji(iso) {
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

export function parseE164(phone) {
  const value = String(phone ?? '').trim();
  if (!value) return { country: COUNTRIES[0], national: '' };
  const digits = value.replace(/[^\d+]/g, '');
  const withPrefix = digits.startsWith('+') ? digits.slice(1) : digits;
  const match = SORTED_BY_DIAL_LENGTH.find((c) => withPrefix.startsWith(c.dial));
  const country = match ?? COUNTRIES[0];
  return { country, national: withPrefix.slice(country.dial.length) };
}

export function composeE164(dial, national) {
  const digits = String(national ?? '')
    .replace(/\D/g, '')
    .replace(/^0/, '');
  return `+${dial}${digits}`;
}

export function isValidMobile(phone) {
  return /^\+[1-9][0-9]{7,14}$/.test(String(phone ?? '').trim());
}
