const COUNTRY_CURRENCY: Record<string, string> = {
  AD: 'EUR', AL: 'ALL', AO: 'AOA', AG: 'XCD', AM: 'AMD', AZ: 'AZN', AF: 'AFN',
  BS: 'BSD', BH: 'BHD', BB: 'BBD', BY: 'BYN', BZ: 'BZD', BM: 'BMD', BT: 'BTN',
  BO: 'BOB', BA: 'BAM', BW: 'BWP', BN: 'BND', BI: 'BIF', KH: 'KHR', CV: 'CVE',
  KY: 'KYD', CR: 'CRC', CU: 'CUP', DM: 'XCD', DO: 'DOP', TL: 'USD', FJ: 'FJD',
  GE: 'GEL', GM: 'GMD', GN: 'GNF', GY: 'GYD', HT: 'HTG', HN: 'HNL', IR: 'IRR',
  IQ: 'IQD', JM: 'JMD', JO: 'JOD', KZ: 'KZT', LA: 'LAK', LB: 'LBP', LS: 'LSL',
  LR: 'LRD', LY: 'LYD', MK: 'MKD', MW: 'MWK', MV: 'MVR', MR: 'MRU', MD: 'MDL',
  MN: 'MNT', ME: 'EUR', MZ: 'MZN', MM: 'MMK', NA: 'NAD', NI: 'NIO', OM: 'OMR',
  PA: 'USD', PY: 'PYG', WS: 'WST', RS: 'RSD', SL: 'SLE', SB: 'SBD', LK: 'LKR',
  SD: 'SDG', SR: 'SRD', SZ: 'SZL', SY: 'SYP', TJ: 'TJS', TT: 'TTD', TM: 'TMT',
  UZ: 'UZS', VE: 'VES', YE: 'YER', ZM: 'ZMW', ZW: 'ZWG',
  MG: 'MGA', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR', BE: 'EUR', NL: 'EUR',
  LU: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR', CY: 'EUR', MT: 'EUR', SK: 'EUR',
  SI: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', HR: 'EUR', US: 'USD', EC: 'USD', SV: 'USD',
  GB: 'GBP', UK: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD', CH: 'CHF', JP: 'JPY', CN: 'CNY',
  IN: 'INR', ZA: 'ZAR', MU: 'MUR', SC: 'SCR', RE: 'EUR', YT: 'EUR', KM: 'KMF',
  BR: 'BRL', MX: 'MXN', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN', UY: 'UYU',
  MA: 'MAD', DZ: 'DZD', TN: 'TND', EG: 'EGP', NG: 'NGN', GH: 'GHS', KE: 'KES',
  TZ: 'TZS', UG: 'UGX', RW: 'RWF', ET: 'ETB', SN: 'XOF', CI: 'XOF', ML: 'XOF',
  BF: 'XOF', NE: 'XOF', TG: 'XOF', BJ: 'XOF', CM: 'XAF', GA: 'XAF', CG: 'XAF',
  TD: 'XAF', CF: 'XAF', GQ: 'XAF', SA: 'SAR', AE: 'AED', QA: 'QAR', KW: 'KWD',
  TR: 'TRY', RU: 'RUB', UA: 'UAH', KR: 'KRW', SG: 'SGD', HK: 'HKD', TH: 'THB',
  MY: 'MYR', ID: 'IDR', PH: 'PHP', VN: 'VND', PK: 'PKR', BD: 'BDT', NP: 'NPR',
  IL: 'ILS', NO: 'NOK', SE: 'SEK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  RO: 'RON', BG: 'BGN', IS: 'ISK',
};

export function currencyForCountry(countryCode: string): string {
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? 'EUR';
}

export async function getEuroExchangeRate(currency: string): Promise<number | null> {
  if (currency === 'EUR') return 1;
  const key = `noir_gps_fx_EUR_${currency}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached) as { rate: number; expires: number };
      if (parsed.expires > Date.now() && Number.isFinite(parsed.rate)) return parsed.rate;
    }
  } catch { /* Ignore stale or unavailable browser storage. */ }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/EUR');
    if (!response.ok) return null;
    const data = await response.json() as { result?: string; rates?: Record<string, number>; time_next_update_unix?: number };
    const rate = data.rates?.[currency];
    if (data.result !== 'success' || !rate || !Number.isFinite(rate)) return null;
    const expires = (data.time_next_update_unix ?? Math.floor(Date.now() / 1000) + 86400) * 1000;
    try { localStorage.setItem(key, JSON.stringify({ rate, expires })); } catch { /* Ignore storage quota. */ }
    return rate;
  } catch {
    return null;
  }
}

export function formatMoney(amount: number, currency: string, rate: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: currency === 'MGA' ? 0 : 2 }).format(amount * rate);
}
