export const BRAND = {
  name: process.env.BRAND_NAME || 'Kerb',
  legalName: 'Kerb Mobility Pvt. Ltd.',
  tagline: 'Self-drive rentals without counter surprises.',
  supportEmail: 'desk@kerb.local',
  supportPhone: '+91 80 4120 7800',
  whatsappHref: 'https://wa.me/918041207800',
  defaultCity: 'Bengaluru',
  defaultCurrency: 'INR',
  defaultLocale: 'en-IN',
  defaultTimezone: 'Asia/Kolkata',
  invoiceSeries: 'KB',
} as const;
