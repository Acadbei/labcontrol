const CONSENT_PREFIX = 'labcontrol_openrouter_chat_consent_v1:';

export function confirmOpenRouterChatConsent(userId: string | undefined): boolean {
  const storageKey = `${CONSENT_PREFIX}${userId || 'current-user'}`;
  try {
    if (localStorage.getItem(storageKey) === 'true') return true;
  } catch {}

  const accepted = window.confirm(
    'Savolingiz, unga mos hujjat va bilim parchalari hamda ruxsatli loyiha/vazifa ma’lumotlari javob tayyorlash uchun ilova backend’i orqali OpenRouter bepul model routeriga yuboriladi. Internet qidiruvi ishlatilmaydi. Davom etasizmi?'
  );
  if (!accepted) return false;
  try { localStorage.setItem(storageKey, 'true'); } catch {}
  return true;
}
