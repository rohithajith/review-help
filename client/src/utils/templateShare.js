const PROD_SHARE_ORIGIN = 'https://app.reviewhelp.uk';
const SHARE_QR_SEEN_PREFIX = 'shareQrSeen:';

function getRuntimeIsProd() {
  try {
    if (typeof import.meta !== 'undefined' && import.meta?.env && typeof import.meta.env.PROD === 'boolean') {
      return import.meta.env.PROD;
    }
  } catch (e) {
    // ignore import.meta access failures
  }
  try {
    if (typeof process !== 'undefined' && process?.env?.NODE_ENV) {
      return String(process.env.NODE_ENV).toLowerCase() === 'production';
    }
  } catch (e) {
    // ignore process env access failures
  }
  return false;
}

function normalizeBusinessId(rawBusinessId) {
  const businessId = Number(rawBusinessId);
  return Number.isInteger(businessId) && businessId > 0 ? businessId : null;
}

function normalizeOrigin(origin) {
  const raw = String(origin || '').trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
}

export function encodeBusinessShortCode(rawBusinessId) {
  const businessId = normalizeBusinessId(rawBusinessId);
  if (!businessId) return null;
  return businessId.toString(36);
}

export function decodeBusinessShortCode(rawShortCode) {
  const shortCode = String(rawShortCode || '').trim().toLowerCase();
  if (!/^[0-9a-z]+$/.test(shortCode)) return null;
  const businessId = Number.parseInt(shortCode, 36);
  if (!Number.isInteger(businessId) || businessId <= 0) return null;
  if (encodeBusinessShortCode(businessId) !== shortCode) return null;
  return businessId;
}

export function resolveBusinessIdFromShortCode(shortCode) {
  return decodeBusinessShortCode(shortCode);
}

export function resolveShareOrigin(options = {}) {
  const isProd = typeof options.isProd === 'boolean' ? options.isProd : getRuntimeIsProd();
  if (isProd) return PROD_SHARE_ORIGIN;

  const explicitOrigin = normalizeOrigin(options.origin);
  if (explicitOrigin) return explicitOrigin;

  const windowOrigin = (
    typeof window !== 'undefined'
    && window?.location
    && normalizeOrigin(window.location.origin)
  ) || null;

  return windowOrigin || PROD_SHARE_ORIGIN;
}

export function buildTemplatePageUrl(rawBusinessId, options = {}) {
  const businessId = normalizeBusinessId(rawBusinessId);
  if (!businessId) return null;
  const origin = resolveShareOrigin(options);
  return `${origin}/#/business/${businessId}`;
}

export function buildShortTemplatePageUrl(rawBusinessId, options = {}) {
  const shortCode = encodeBusinessShortCode(rawBusinessId);
  if (!shortCode) return null;
  const origin = resolveShareOrigin(options);
  return `${origin}/#/b/${shortCode}`;
}

export function getTemplateShareData(rawBusinessId, options = {}) {
  const businessId = normalizeBusinessId(rawBusinessId);
  if (!businessId) return null;
  const shortCode = encodeBusinessShortCode(businessId);
  if (!shortCode) return null;
  return {
    businessId,
    shortCode,
    fullUrl: buildTemplatePageUrl(businessId, options),
    shortUrl: buildShortTemplatePageUrl(businessId, options),
  };
}

export function getShareQrSeenKey(rawBusinessId) {
  const businessId = normalizeBusinessId(rawBusinessId);
  return businessId ? `${SHARE_QR_SEEN_PREFIX}${businessId}` : null;
}

export function hasSeenShareQr(rawBusinessId, storage = null) {
  const key = getShareQrSeenKey(rawBusinessId);
  if (!key) return false;
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store || typeof store.getItem !== 'function') return false;
  try {
    return store.getItem(key) === '1';
  } catch (e) {
    return false;
  }
}

export function markShareQrSeen(rawBusinessId, storage = null) {
  const key = getShareQrSeenKey(rawBusinessId);
  if (!key) return false;
  const store = storage || (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store || typeof store.setItem !== 'function') return false;
  try {
    store.setItem(key, '1');
    return true;
  } catch (e) {
    return false;
  }
}
