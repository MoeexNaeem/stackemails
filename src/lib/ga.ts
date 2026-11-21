/**
 * Google Analytics 4 for the public website only (never the dashboard), with
 * Google Consent Mode v2:
 *  - ad storage / personalisation: always denied (we run no ads)
 *  - analytics cookies: denied by default in the EEA, UK and Switzerland until
 *    the visitor accepts; allowed elsewhere unless they decline
 *  - the visitor's choice is remembered in localStorage ("se-consent")
 * Off in development so local browsing never pollutes the numbers.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-VSB4W2479T";
export const CONSENT_KEY = "se-consent";

export function analyticsEnabled(): boolean {
  return process.env.NODE_ENV === "production" && /^G-[A-Z0-9]+$/.test(GA_ID);
}

// EU/EEA member states plus the UK and Switzerland (ISO 3166-1 alpha-2).
const CONSENT_REQUIRED_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU",
  "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
];

/**
 * Inline boot script: consent defaults first, then the visitor's saved choice,
 * then config, then load gtag.js, so Google never runs before consent is set.
 */
export function gaBootScript(): string {
  const id = JSON.stringify(GA_ID);
  const regions = JSON.stringify(CONSENT_REQUIRED_REGIONS);
  const key = JSON.stringify(CONSENT_KEY);
  return `(function(){
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
var ads={ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
gtag('consent','default',Object.assign({analytics_storage:'granted'},ads));
gtag('consent','default',Object.assign({analytics_storage:'denied',region:${regions}},ads));
try{var c=localStorage.getItem(${key});if(c==='granted'||c==='denied'){gtag('consent','update',{analytics_storage:c});}}catch(e){}
gtag('js',new Date());gtag('config',${id});
var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(${id});document.head.appendChild(s);
})();`;
}
