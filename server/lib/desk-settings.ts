import { PAYMENT_METHODS, type PaymentMethod } from "../../shared/schema.js";
import { storage } from "../storage.js";

/**
 * Owner-configurable settings for the desk: virtual queue + cash drawer.
 * Stored as JSON on `business_settings.desk_settings`; every read is normalized
 * so old/partial rows can never crash a page or produce an invalid ETA.
 */
export interface DeskSettings {
  /** Payment methods offered in "Terminar y cobrar" and quick income. */
  paymentMethods: PaymentMethod[];
  allowTips: boolean;
  queueEnabled: boolean;
  queueOpen: boolean;
  /** Fallback duration when a service has none (ETA + walk-ins). */
  defaultDurationMinutes: number;
  /** 0 = unlimited. */
  maxQueueLength: number;
  /** Supports {nombre} and {negocio}. */
  notificationTemplate: string;
  /** A client is "lapsed" after this many days without a completed visit. */
  retentionDays: number;
  /** Supports {nombre}, {negocio} and {dias}. */
  retentionMessage: string;
  /** Promotions (horas muertas) are enabled for this business. */
  promosEnabled: boolean;
  /** Where the central bot notifies the owner. Falls back to business phone. */
  ownerWhatsApp: string | null;
  notifyOwnerOnClaim: boolean;
  /** Supports {titulo}, {negocio}, {precio} and {link}. */
  promoMessageTemplate: string;
  /** Show the live queue CTA on the public microsite. */
  showQueueOnMicrosite: boolean;
  /** Show active promotions on the public microsite. */
  showPromosOnMicrosite: boolean;
  /** WhatsApp appointment reminders + booking confirmations. */
  whatsappRemindersEnabled: boolean;
  reminderHoursBefore: number;
  whatsappReminderTemplate: string;
  whatsappConfirmationsEnabled: boolean;
  whatsappConfirmationTemplate: string;
  /** Automatic WhatsApp updates for the virtual queue. */
  queueWhatsappEnabled: boolean;
  queueJoinedTemplate: string;
  queueCalledTemplate: string;
  /** No-show protection: deposit required for public bookings. */
  depositEnabled: boolean;
  depositType: "percent" | "fixed";
  /** Percent (1–100) or fixed soles, depending on depositType. */
  depositValue: number;
  /** How long an unpaid booking holds its slot. */
  depositHoldMinutes: number;
  /** Supports {nombre}, {negocio}, {fecha}, {hora}, {monto}, {link}. */
  depositMessageTemplate: string;
  /** Shown on the customer's manage page. */
  depositPolicy: string;
  /** Automatic post-service review requests. */
  reviewRequestsEnabled: boolean;
  /** Minutes after completion before asking for a review (0–1440). */
  reviewDelayMinutes: number;
  /** Supports {nombre}, {negocio}, {servicio}, {fecha}, {link}. */
  reviewMessageTemplate: string;
  /** Cancellation waitlist. */
  waitlistEnabled: boolean;
  /** Show the waitlist CTA on the public microsite. */
  showWaitlistOnMicrosite: boolean;
  /** How many matching waiting customers get a freed-slot message. */
  waitlistNotifyLimit: number;
  /** Supports {nombre}, {negocio}, {servicio}, {fecha}, {hora}, {link}. */
  waitlistMessageTemplate: string;
  /** Loyalty stamps / repeat-visit rewards. */
  loyaltyEnabled: boolean;
  showLoyaltyOnMicrosite: boolean;
  loyaltyStampsRequired: number;
  loyaltyReward: string;
  /** Supports {nombre}, {negocio}, {sellos}, {meta}, {link}. */
  loyaltyMessageTemplate: string;
  /** Supports {nombre}, {negocio}, {recompensa}, {link}. */
  loyaltyRewardMessageTemplate: string;
  /** Prepaid service packages ("bonos"). */
  packagesEnabled: boolean;
  showPackagesOnMicrosite: boolean;
  /** Supports {nombre}, {negocio}, {paquete}, {usos}, {link}. */
  packageSaleMessageTemplate: string;
  /** Supports {nombre}, {negocio}, {paquete}, {restantes}, {link}. */
  packageUseMessageTemplate: string;
  /** Supports {nombre}, {negocio}, {paquete}, {link}. */
  packageLowBalanceMessageTemplate: string;
  /** Supports {nombre}, {negocio}, {paquete}, {restantes}, {fecha}, {link}. */
  packageExpiryMessageTemplate: string;
}

export const DEFAULT_NOTIFICATION_TEMPLATE =
  "Hola {nombre}, ya casi es tu turno en {negocio}. Acércate al local, te esperamos. — MiCita";

export const DEFAULT_RETENTION_MESSAGE =
  "Hola {nombre}, hace {dias} días que no vienes a {negocio}. ¿Te guardo un espacio esta semana? — MiCita";

export const DEFAULT_PROMO_MESSAGE =
  "Aprovecha {titulo} en {negocio}: {precio}. Reserva aquí: {link} — MiCita";

export const DEFAULT_REMINDER_MESSAGE =
  "Hola {nombre}, te recuerdo tu cita en {negocio}: {servicio} el {fecha} a las {hora}. Si no puedes, cancela o reprograma aquí: {link} — MiCita";

export const DEFAULT_CONFIRMATION_MESSAGE =
  "¡Listo, {nombre}! Tu cita en {negocio} quedó confirmada para {fecha} a las {hora} ({servicio}). Puedes cancelar o reprogramar aquí: {link} — MiCita";

export const DEFAULT_QUEUE_JOINED_MESSAGE =
  "Hola {nombre}, tu turno en {negocio} quedó registrado. Eres el #{posicion} con ~{minutos} min de espera. Revisa tu turno aquí: {link} — MiCita";

export const DEFAULT_QUEUE_CALLED_MESSAGE =
  "Hola {nombre}, ya casi es tu turno en {negocio}. Acércate al local. {link} — MiCita";

export const DEFAULT_DEPOSIT_MESSAGE =
  "Hola {nombre}, para confirmar tu cita en {negocio} del {fecha} a las {hora}, deja un depósito de S/ {monto}. Se descuenta del servicio. Págalo aquí: {link} — MiCita";

export const DEFAULT_DEPOSIT_POLICY =
  "El depósito se descuenta del precio del servicio. Si no asistes o cancelas con menos de 2 horas, no se devuelve.";

export const DEFAULT_REVIEW_MESSAGE =
  "Hola {nombre}, gracias por visitar {negocio}. ¿Cómo estuvo tu {servicio}? Déjanos tu reseña aquí: {link} — MiCita";

export const DEFAULT_WAITLIST_MESSAGE =
  "Hola {nombre}, se liberó un cupo en {negocio} para {servicio} el {fecha} a las {hora}. Resérvalo aquí antes que otro: {link} — MiCita";

export const DEFAULT_LOYALTY_MESSAGE =
  "Hola {nombre}, sumaste un sello en {negocio}. Llevas {sellos}/{meta}. Mira tu tarjeta: {link} — MiCita";

export const DEFAULT_LOYALTY_REWARD_MESSAGE =
  "¡Felicidades {nombre}! Completaste tu tarjeta en {negocio}: {recompensa}. Muéstrala aquí: {link} — MiCita";

export const DEFAULT_PACKAGE_SALE_MESSAGE =
  "Hola {nombre}, tu bono {paquete} en {negocio} está listo: {usos} usos. Míralo aquí: {link} — MiCita";

export const DEFAULT_PACKAGE_USE_MESSAGE =
  "Hola {nombre}, usaste 1 uso de {paquete} en {negocio}. Te quedan {restantes}. {link} — MiCita";

export const DEFAULT_PACKAGE_LOW_BALANCE_MESSAGE =
  "Hola {nombre}, te queda 1 uso de {paquete} en {negocio}. Renueva aquí: {link} — MiCita";

export const DEFAULT_PACKAGE_EXPIRY_MESSAGE =
  "Hola {nombre}, tu bono {paquete} vence el {fecha}. Te quedan {restantes} usos. {link} — MiCita";

export const DEFAULT_DESK_SETTINGS: DeskSettings = {
  paymentMethods: [...PAYMENT_METHODS],
  allowTips: true,
  queueEnabled: true,
  queueOpen: true,
  defaultDurationMinutes: 30,
  maxQueueLength: 0,
  notificationTemplate: DEFAULT_NOTIFICATION_TEMPLATE,
  retentionDays: 21,
  retentionMessage: DEFAULT_RETENTION_MESSAGE,
  promosEnabled: true,
  ownerWhatsApp: null,
  notifyOwnerOnClaim: true,
  promoMessageTemplate: DEFAULT_PROMO_MESSAGE,
  showQueueOnMicrosite: true,
  showPromosOnMicrosite: true,
  whatsappRemindersEnabled: true,
  reminderHoursBefore: 24,
  whatsappReminderTemplate: DEFAULT_REMINDER_MESSAGE,
  whatsappConfirmationsEnabled: true,
  whatsappConfirmationTemplate: DEFAULT_CONFIRMATION_MESSAGE,
  queueWhatsappEnabled: true,
  queueJoinedTemplate: DEFAULT_QUEUE_JOINED_MESSAGE,
  queueCalledTemplate: DEFAULT_QUEUE_CALLED_MESSAGE,
  depositEnabled: false,
  depositType: "percent",
  depositValue: 20,
  depositHoldMinutes: 30,
  depositMessageTemplate: DEFAULT_DEPOSIT_MESSAGE,
  depositPolicy: DEFAULT_DEPOSIT_POLICY,
  reviewRequestsEnabled: true,
  reviewDelayMinutes: 120,
  reviewMessageTemplate: DEFAULT_REVIEW_MESSAGE,
  waitlistEnabled: true,
  showWaitlistOnMicrosite: true,
  waitlistNotifyLimit: 3,
  waitlistMessageTemplate: DEFAULT_WAITLIST_MESSAGE,
  loyaltyEnabled: true,
  showLoyaltyOnMicrosite: true,
  loyaltyStampsRequired: 5,
  loyaltyReward: "Un corte gratis",
  loyaltyMessageTemplate: DEFAULT_LOYALTY_MESSAGE,
  loyaltyRewardMessageTemplate: DEFAULT_LOYALTY_REWARD_MESSAGE,
  packagesEnabled: true,
  showPackagesOnMicrosite: true,
  packageSaleMessageTemplate: DEFAULT_PACKAGE_SALE_MESSAGE,
  packageUseMessageTemplate: DEFAULT_PACKAGE_USE_MESSAGE,
  packageLowBalanceMessageTemplate: DEFAULT_PACKAGE_LOW_BALANCE_MESSAGE,
  packageExpiryMessageTemplate: DEFAULT_PACKAGE_EXPIRY_MESSAGE,
};

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

export function normalizeDeskSettings(raw: unknown): DeskSettings {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const methods = Array.isArray(data.paymentMethods)
    ? (data.paymentMethods.filter(
        (method): method is PaymentMethod =>
          typeof method === "string" && (PAYMENT_METHODS as readonly string[]).includes(method),
      ) as PaymentMethod[])
    : [];
  const uniqueMethods = Array.from(new Set(methods));

  const template =
    typeof data.notificationTemplate === "string" && data.notificationTemplate.trim().length >= 10
      ? data.notificationTemplate.trim().slice(0, 300)
      : DEFAULT_NOTIFICATION_TEMPLATE;

  const retentionMessage =
    typeof data.retentionMessage === "string" && data.retentionMessage.trim().length >= 10
      ? data.retentionMessage.trim().slice(0, 300)
      : DEFAULT_RETENTION_MESSAGE;

  const promoMessageTemplate =
    typeof data.promoMessageTemplate === "string" && data.promoMessageTemplate.trim().length >= 10
      ? data.promoMessageTemplate.trim().slice(0, 300)
      : DEFAULT_PROMO_MESSAGE;

  const ownerWhatsApp =
    typeof data.ownerWhatsApp === "string" && data.ownerWhatsApp.trim().length >= 6
      ? data.ownerWhatsApp.trim().slice(0, 30)
      : null;

  const reminderTemplate =
    typeof data.whatsappReminderTemplate === "string" &&
    data.whatsappReminderTemplate.trim().length >= 10
      ? data.whatsappReminderTemplate.trim().slice(0, 400)
      : DEFAULT_REMINDER_MESSAGE;

  const confirmationTemplate =
    typeof data.whatsappConfirmationTemplate === "string" &&
    data.whatsappConfirmationTemplate.trim().length >= 10
      ? data.whatsappConfirmationTemplate.trim().slice(0, 400)
      : DEFAULT_CONFIRMATION_MESSAGE;

  const queueJoinedTemplate =
    typeof data.queueJoinedTemplate === "string" && data.queueJoinedTemplate.trim().length >= 10
      ? data.queueJoinedTemplate.trim().slice(0, 400)
      : DEFAULT_QUEUE_JOINED_MESSAGE;

  const queueCalledTemplate =
    typeof data.queueCalledTemplate === "string" && data.queueCalledTemplate.trim().length >= 10
      ? data.queueCalledTemplate.trim().slice(0, 400)
      : DEFAULT_QUEUE_CALLED_MESSAGE;

  const depositType: "percent" | "fixed" = data.depositType === "fixed" ? "fixed" : "percent";
  const depositMessageTemplate =
    typeof data.depositMessageTemplate === "string" && data.depositMessageTemplate.trim().length >= 10
      ? data.depositMessageTemplate.trim().slice(0, 400)
      : DEFAULT_DEPOSIT_MESSAGE;
  const depositPolicy =
    typeof data.depositPolicy === "string" && data.depositPolicy.trim().length >= 10
      ? data.depositPolicy.trim().slice(0, 500)
      : DEFAULT_DEPOSIT_POLICY;

  const reviewMessageTemplate =
    typeof data.reviewMessageTemplate === "string" &&
    data.reviewMessageTemplate.trim().length >= 10
      ? data.reviewMessageTemplate.trim().slice(0, 400)
      : DEFAULT_REVIEW_MESSAGE;

  const waitlistMessageTemplate =
    typeof data.waitlistMessageTemplate === "string" &&
    data.waitlistMessageTemplate.trim().length >= 10
      ? data.waitlistMessageTemplate.trim().slice(0, 400)
      : DEFAULT_WAITLIST_MESSAGE;

  const loyaltyMessageTemplate =
    typeof data.loyaltyMessageTemplate === "string" &&
    data.loyaltyMessageTemplate.trim().length >= 10
      ? data.loyaltyMessageTemplate.trim().slice(0, 400)
      : DEFAULT_LOYALTY_MESSAGE;

  const loyaltyRewardMessageTemplate =
    typeof data.loyaltyRewardMessageTemplate === "string" &&
    data.loyaltyRewardMessageTemplate.trim().length >= 10
      ? data.loyaltyRewardMessageTemplate.trim().slice(0, 400)
      : DEFAULT_LOYALTY_REWARD_MESSAGE;

  const loyaltyReward =
    typeof data.loyaltyReward === "string" && data.loyaltyReward.trim().length >= 3
      ? data.loyaltyReward.trim().slice(0, 80)
      : DEFAULT_DESK_SETTINGS.loyaltyReward;

  const packageSaleMessageTemplate =
    typeof data.packageSaleMessageTemplate === "string" &&
    data.packageSaleMessageTemplate.trim().length >= 10
      ? data.packageSaleMessageTemplate.trim().slice(0, 400)
      : DEFAULT_PACKAGE_SALE_MESSAGE;

  const packageUseMessageTemplate =
    typeof data.packageUseMessageTemplate === "string" &&
    data.packageUseMessageTemplate.trim().length >= 10
      ? data.packageUseMessageTemplate.trim().slice(0, 400)
      : DEFAULT_PACKAGE_USE_MESSAGE;

  const packageLowBalanceMessageTemplate =
    typeof data.packageLowBalanceMessageTemplate === "string" &&
    data.packageLowBalanceMessageTemplate.trim().length >= 10
      ? data.packageLowBalanceMessageTemplate.trim().slice(0, 400)
      : DEFAULT_PACKAGE_LOW_BALANCE_MESSAGE;

  const packageExpiryMessageTemplate =
    typeof data.packageExpiryMessageTemplate === "string" &&
    data.packageExpiryMessageTemplate.trim().length >= 10
      ? data.packageExpiryMessageTemplate.trim().slice(0, 400)
      : DEFAULT_PACKAGE_EXPIRY_MESSAGE;

  return {
    paymentMethods: uniqueMethods.length > 0 ? uniqueMethods : [...PAYMENT_METHODS],
    allowTips: typeof data.allowTips === "boolean" ? data.allowTips : DEFAULT_DESK_SETTINGS.allowTips,
    queueEnabled:
      typeof data.queueEnabled === "boolean" ? data.queueEnabled : DEFAULT_DESK_SETTINGS.queueEnabled,
    queueOpen: typeof data.queueOpen === "boolean" ? data.queueOpen : DEFAULT_DESK_SETTINGS.queueOpen,
    defaultDurationMinutes: clampInt(
      data.defaultDurationMinutes,
      5,
      240,
      DEFAULT_DESK_SETTINGS.defaultDurationMinutes,
    ),
    maxQueueLength: clampInt(data.maxQueueLength, 0, 200, DEFAULT_DESK_SETTINGS.maxQueueLength),
    notificationTemplate: template,
    retentionDays: clampInt(data.retentionDays, 7, 180, DEFAULT_DESK_SETTINGS.retentionDays),
    retentionMessage,
    promosEnabled:
      typeof data.promosEnabled === "boolean" ? data.promosEnabled : DEFAULT_DESK_SETTINGS.promosEnabled,
    ownerWhatsApp,
    notifyOwnerOnClaim:
      typeof data.notifyOwnerOnClaim === "boolean"
        ? data.notifyOwnerOnClaim
        : DEFAULT_DESK_SETTINGS.notifyOwnerOnClaim,
    promoMessageTemplate,
    showQueueOnMicrosite:
      typeof data.showQueueOnMicrosite === "boolean"
        ? data.showQueueOnMicrosite
        : DEFAULT_DESK_SETTINGS.showQueueOnMicrosite,
    showPromosOnMicrosite:
      typeof data.showPromosOnMicrosite === "boolean"
        ? data.showPromosOnMicrosite
        : DEFAULT_DESK_SETTINGS.showPromosOnMicrosite,
    whatsappRemindersEnabled:
      typeof data.whatsappRemindersEnabled === "boolean"
        ? data.whatsappRemindersEnabled
        : DEFAULT_DESK_SETTINGS.whatsappRemindersEnabled,
    reminderHoursBefore: clampInt(
      data.reminderHoursBefore,
      1,
      72,
      DEFAULT_DESK_SETTINGS.reminderHoursBefore,
    ),
    whatsappReminderTemplate: reminderTemplate,
    whatsappConfirmationsEnabled:
      typeof data.whatsappConfirmationsEnabled === "boolean"
        ? data.whatsappConfirmationsEnabled
        : DEFAULT_DESK_SETTINGS.whatsappConfirmationsEnabled,
    whatsappConfirmationTemplate: confirmationTemplate,
    queueWhatsappEnabled:
      typeof data.queueWhatsappEnabled === "boolean"
        ? data.queueWhatsappEnabled
        : DEFAULT_DESK_SETTINGS.queueWhatsappEnabled,
    queueJoinedTemplate,
    queueCalledTemplate,
    depositEnabled:
      typeof data.depositEnabled === "boolean"
        ? data.depositEnabled
        : DEFAULT_DESK_SETTINGS.depositEnabled,
    depositType,
    depositValue: clampInt(
      data.depositValue,
      1,
      depositType === "percent" ? 100 : 500,
      DEFAULT_DESK_SETTINGS.depositValue,
    ),
    depositHoldMinutes: clampInt(
      data.depositHoldMinutes,
      5,
      120,
      DEFAULT_DESK_SETTINGS.depositHoldMinutes,
    ),
    depositMessageTemplate,
    depositPolicy,
    reviewRequestsEnabled:
      typeof data.reviewRequestsEnabled === "boolean"
        ? data.reviewRequestsEnabled
        : DEFAULT_DESK_SETTINGS.reviewRequestsEnabled,
    reviewDelayMinutes: clampInt(
      data.reviewDelayMinutes,
      0,
      1440,
      DEFAULT_DESK_SETTINGS.reviewDelayMinutes,
    ),
    reviewMessageTemplate,
    waitlistEnabled:
      typeof data.waitlistEnabled === "boolean"
        ? data.waitlistEnabled
        : DEFAULT_DESK_SETTINGS.waitlistEnabled,
    showWaitlistOnMicrosite:
      typeof data.showWaitlistOnMicrosite === "boolean"
        ? data.showWaitlistOnMicrosite
        : DEFAULT_DESK_SETTINGS.showWaitlistOnMicrosite,
    waitlistNotifyLimit: clampInt(
      data.waitlistNotifyLimit,
      1,
      10,
      DEFAULT_DESK_SETTINGS.waitlistNotifyLimit,
    ),
    waitlistMessageTemplate,
    loyaltyEnabled:
      typeof data.loyaltyEnabled === "boolean"
        ? data.loyaltyEnabled
        : DEFAULT_DESK_SETTINGS.loyaltyEnabled,
    showLoyaltyOnMicrosite:
      typeof data.showLoyaltyOnMicrosite === "boolean"
        ? data.showLoyaltyOnMicrosite
        : DEFAULT_DESK_SETTINGS.showLoyaltyOnMicrosite,
    loyaltyStampsRequired: clampInt(
      data.loyaltyStampsRequired,
      2,
      20,
      DEFAULT_DESK_SETTINGS.loyaltyStampsRequired,
    ),
    loyaltyReward,
    loyaltyMessageTemplate,
    loyaltyRewardMessageTemplate,
    packagesEnabled:
      typeof data.packagesEnabled === "boolean"
        ? data.packagesEnabled
        : DEFAULT_DESK_SETTINGS.packagesEnabled,
    showPackagesOnMicrosite:
      typeof data.showPackagesOnMicrosite === "boolean"
        ? data.showPackagesOnMicrosite
        : DEFAULT_DESK_SETTINGS.showPackagesOnMicrosite,
    packageSaleMessageTemplate,
    packageUseMessageTemplate,
    packageLowBalanceMessageTemplate,
    packageExpiryMessageTemplate,
  };
}

export async function getDeskSettings(businessId: number): Promise<DeskSettings> {
  const settings = await storage.getBusinessSettings(businessId);
  return normalizeDeskSettings(settings?.deskSettings);
}

export function renderNotificationTemplate(
  template: string,
  vars: { name: string; businessName: string },
): string {
  return template
    .replace(/\{nombre\}/g, vars.name)
    .replace(/\{negocio\}/g, vars.businessName);
}

export function renderRetentionMessage(
  template: string,
  vars: { name: string; businessName: string; days: number },
): string {
  return template
    .replace(/\{nombre\}/g, vars.name)
    .replace(/\{negocio\}/g, vars.businessName)
    .replace(/\{dias\}/g, String(vars.days));
}

export function renderPromoMessage(
  template: string,
  vars: { title: string; businessName: string; price: string; link: string },
): string {
  return template
    .replace(/\{titulo\}/g, vars.title)
    .replace(/\{negocio\}/g, vars.businessName)
    .replace(/\{precio\}/g, vars.price)
    .replace(/\{link\}/g, vars.link);
}

export function renderAppointmentMessage(
  template: string,
  vars: {
    name: string;
    businessName: string;
    serviceName: string;
    date: string;
    time: string;
    link: string;
    amount?: string;
  },
): string {
  return template
    .replace(/\{nombre\}/g, vars.name)
    .replace(/\{negocio\}/g, vars.businessName)
    .replace(/\{servicio\}/g, vars.serviceName)
    .replace(/\{fecha\}/g, vars.date)
    .replace(/\{hora\}/g, vars.time)
    .replace(/\{monto\}/g, vars.amount ?? "")
    .replace(/\{link\}/g, vars.link);
}

export function renderLoyaltyMessage(
  template: string,
  vars: {
    name: string;
    businessName: string;
    stamps: number | string;
    required: number | string;
    reward: string;
    link: string;
  },
): string {
  return template
    .replace(/\{nombre\}/g, vars.name)
    .replace(/\{negocio\}/g, vars.businessName)
    .replace(/\{sellos\}/g, String(vars.stamps))
    .replace(/\{meta\}/g, String(vars.required))
    .replace(/\{recompensa\}/g, vars.reward)
    .replace(/\{link\}/g, vars.link);
}

export function renderPackageMessage(
  template: string,
  vars: {
    name: string;
    businessName: string;
    packageName: string;
    uses: number | string;
    remaining: number | string;
    /** Preformatted expiry date (es-PE) for expiry reminders. */
    date?: string;
    link: string;
  },
): string {
  return template
    .replace(/\{nombre\}/g, vars.name)
    .replace(/\{negocio\}/g, vars.businessName)
    .replace(/\{paquete\}/g, vars.packageName)
    .replace(/\{usos\}/g, String(vars.uses))
    .replace(/\{restantes\}/g, String(vars.remaining))
    .replace(/\{fecha\}/g, vars.date ?? "")
    .replace(/\{link\}/g, vars.link);
}

export function renderQueueMessage(
  template: string,
  vars: {
    name: string;
    businessName: string;
    position?: number | string | null;
    minutes?: number | string | null;
    link: string;
  },
): string {
  return template
    .replace(/\{nombre\}/g, vars.name)
    .replace(/\{negocio\}/g, vars.businessName)
    .replace(/\{posicion\}/g, vars.position != null ? String(vars.position) : "")
    .replace(/\{minutos\}/g, vars.minutes != null ? String(vars.minutes) : "")
    .replace(/\{link\}/g, vars.link);
}
