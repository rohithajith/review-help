export const BUSINESS_ADMIN_UPDATED_EVENT = 'business-admin-updated';
export const BUSINESS_ADMIN_STORAGE_KEY = 'business-admin-updated';
export const BUSINESS_LOCAL_LOGO_KEY_PREFIX = 'business-logo:';

export function parseBusinessId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getBusinessIdFromUpdatePayload(payload) {
  if (payload == null) return null;

  if (typeof payload === 'number' || typeof payload === 'string') {
    return parseBusinessId(payload);
  }

  if (typeof payload !== 'object') return null;

  return parseBusinessId(
    payload.businessId
    ?? payload.business_id
    ?? payload.id
    ?? payload?.business?.id
    ?? payload?.payload?.businessId
  );
}

export function isBusinessAdminUpdateForBusiness(payload, targetBusinessId) {
  const normalizedTargetBusinessId = parseBusinessId(targetBusinessId);
  const incomingBusinessId = getBusinessIdFromUpdatePayload(payload);
  return Boolean(normalizedTargetBusinessId && incomingBusinessId && normalizedTargetBusinessId === incomingBusinessId);
}

export function parseBusinessAdminStorageSignal(event) {
  if (!event || typeof event !== 'object') return null;

  if (event.key === BUSINESS_ADMIN_STORAGE_KEY) {
    if (!event.newValue) return null;

    try {
      const parsed = JSON.parse(event.newValue);
      return { businessId: getBusinessIdFromUpdatePayload(parsed) };
    } catch {
      return { businessId: getBusinessIdFromUpdatePayload(event.newValue) };
    }
  }

  if (typeof event.key === 'string' && event.key.startsWith(`${BUSINESS_ADMIN_STORAGE_KEY}:`)) {
    const keyBusinessId = parseBusinessId(event.key.split(':')[1]);
    if (!keyBusinessId) return null;
    return { businessId: keyBusinessId };
  }

  return null;
}

export function getBusinessLocalLogoKey(businessId) {
  const normalized = parseBusinessId(businessId);
  return normalized ? `${BUSINESS_LOCAL_LOGO_KEY_PREFIX}${normalized}` : null;
}

export function readBusinessLocalLogo(businessId) {
  const key = getBusinessLocalLogoKey(businessId);
  if (!key || typeof window === 'undefined') return '';
  try {
    return String(window.localStorage.getItem(key) || '');
  } catch {
    return '';
  }
}

export function writeBusinessLocalLogo(businessId, logoDataUrl) {
  const key = getBusinessLocalLogoKey(businessId);
  if (!key || typeof window === 'undefined') return;
  try {
    if (logoDataUrl) {
      window.localStorage.setItem(key, String(logoDataUrl));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore localStorage quota/private mode failures
  }
}
