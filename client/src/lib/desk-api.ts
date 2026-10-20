import { apiFetch } from "./auth-api";

/** Shared types + helpers for the owner's "Hoy" desk (Chair Mode + cash drawer). */

export interface DeskService {
  id: number;
  name: string;
  description?: string | null;
  price: string | null;
  duration: number | null;
  isActive?: boolean | null;
}

export interface DeskTransaction {
  id: number;
  appointmentId: number | null;
  clientId: number | null;
  serviceId: number | null;
  serviceName: string | null;
  amount: string;
  tipAmount: string;
  method: string;
  note: string | null;
  occurredAt: string;
}

export interface DeskAppointment {
  id: number;
  clientId: number;
  serviceId: number;
  date: string;
  time: string;
  endTime: string;
  duration: number;
  status: string;
  source: string;
  price: string | null;
  notes: string | null;
  clientName: string;
  serviceName: string;
  depositAmount: string | null;
  depositStatus: string | null;
  depositPaidAt: string | null;
  depositExpiresAt: string | null;
  /** Total remaining uses across the client's active bonos (Hoy badge). */
  packageUsesRemaining?: number | null;
}

export interface DeskChairState {
  busy: boolean;
  until: string | null;
  appointmentId: number | null;
  clientName?: string | null;
  serviceName?: string | null;
}

export interface DeskCashSummary {
  total: number;
  tips: number;
  count: number;
  byMethod: Array<{ method: string; label: string; total: number; count: number }>;
  byService: Array<{ name: string; total: number; count: number }>;
  transactions: DeskTransaction[];
}

export interface DeskTodayResponse {
  date: string;
  now: string;
  appointments: DeskAppointment[];
  chair: DeskChairState;
  cash: DeskCashSummary;
  previousDayTotal: number;
  stats: { walkIns: number; completed: number; waiting: number };
  services: DeskService[];
  deskSettings: DeskSettings;
}

export const DESK_PAYMENT_METHODS = ["yape", "plin", "cash", "card", "transfer"] as const;
export type DeskPaymentMethod = (typeof DESK_PAYMENT_METHODS)[number];

export const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  yape: "Yape",
  plin: "Plin",
  card: "Tarjeta",
  transfer: "Transferencia",
};

export interface DeskPromo {
  id: number;
  code: string;
  title: string;
  description: string | null;
  price: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  claimed: number;
  remaining: number;
  status: string;
  state: string;
  service: DeskService | null;
  publicUrl: string;
  shareText: string;
  whatsappShareUrl: string;
  botUrl: string | null;
  qrPath: string;
  message: string | null;
  createdAt: string | null;
}

export interface DeskPromoListResponse {
  promosEnabled: boolean;
  promos: DeskPromo[];
  todayAppointments: number;
}

export interface PromoClaimRecord {
  id: number;
  name: string;
  phone: string | null;
  date: string;
  time: string;
  status: string;
  appointmentStatus: string | null;
  createdAt: string | null;
}

export const PROMO_STATE_LABELS: Record<string, string> = {
  open: "Activa",
  paused: "En pausa",
  ended: "Terminada",
  expired: "Pasó",
  full: "Completa",
  disabled: "Desactivada",
};

export const PROMO_STATE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "default",
  paused: "secondary",
  ended: "outline",
  expired: "outline",
  full: "secondary",
  disabled: "destructive",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En atención",
  completed: "Atendido",
  cancelled: "Cancelada",
  no_show: "No vino",
  rescheduled: "Reprogramada",
};

export interface DeskQueueTicket {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  status: string;
  serviceId: number | null;
  serviceName: string;
  joinedAt: string;
  notifiedAt: string | null;
  seatedAt: string | null;
  position: number | null;
  etaMinutes: number | null;
  durationMinutes: number;
}

export interface DeskSettings {
  paymentMethods: DeskPaymentMethod[];
  allowTips: boolean;
  queueEnabled: boolean;
  queueOpen: boolean;
  defaultDurationMinutes: number;
  maxQueueLength: number;
  notificationTemplate: string;
  retentionDays: number;
  retentionMessage: string;
  promosEnabled: boolean;
  ownerWhatsApp: string | null;
  notifyOwnerOnClaim: boolean;
  promoMessageTemplate: string;
  showQueueOnMicrosite: boolean;
  showPromosOnMicrosite: boolean;
  whatsappRemindersEnabled: boolean;
  reminderHoursBefore: number;
  whatsappReminderTemplate: string;
  whatsappConfirmationsEnabled: boolean;
  whatsappConfirmationTemplate: string;
  queueWhatsappEnabled: boolean;
  queueJoinedTemplate: string;
  queueCalledTemplate: string;
  depositEnabled: boolean;
  depositType: "percent" | "fixed";
  depositValue: number;
  depositHoldMinutes: number;
  depositMessageTemplate: string;
  depositPolicy: string;
  reviewRequestsEnabled: boolean;
  reviewDelayMinutes: number;
  reviewMessageTemplate: string;
  waitlistEnabled: boolean;
  showWaitlistOnMicrosite: boolean;
  waitlistNotifyLimit: number;
  waitlistMessageTemplate: string;
  loyaltyEnabled: boolean;
  showLoyaltyOnMicrosite: boolean;
  loyaltyStampsRequired: number;
  loyaltyReward: string;
  loyaltyMessageTemplate: string;
  loyaltyRewardMessageTemplate: string;
  packagesEnabled: boolean;
  showPackagesOnMicrosite: boolean;
  packageSaleMessageTemplate: string;
  packageUseMessageTemplate: string;
  packageLowBalanceMessageTemplate: string;
  packageExpiryMessageTemplate: string;
}

export interface LapsedClient {
  id: number;
  name: string;
  phone: string | null;
  lastVisitDate: string;
  daysSince: number;
  visits: number;
  totalSpent: number;
  whatsappUrl: string | null;
}

export interface RetentionResponse {
  days: number;
  count: number;
  messageTemplate: string;
  clients: LapsedClient[];
}

export interface DeskServicePackage {
  id: number;
  serviceId: number | null;
  name: string;
  description: string | null;
  uses: number;
  price: string;
  validityDays: number;
  status: string;
  createdAt: string | null;
}

export interface DeskPackagePurchase {
  id: number;
  packageId: number;
  packageName: string;
  clientId: number | null;
  name: string;
  phone: string;
  usesTotal: number;
  usesRemaining: number;
  amountPaid: string;
  status: string;
  purchasedAt: string | null;
  expiresAt: string | null;
}

export interface DeskPackagesResponse {
  enabled: boolean;
  packages: DeskServicePackage[];
  purchases: DeskPackagePurchase[];
  stats: {
    packageCount: number;
    activePurchases: number;
    outstandingUses: number;
    soldAmount: number;
  };
}

export interface DeskLoyaltyCard {
  id: number;
  clientId: number | null;
  name: string;
  phone: string;
  totalStamps: number;
  rewardsRedeemed: number;
  lastStampAt: string | null;
  progress: number;
  availableRewards: number;
  required: number;
  reward: string;
}

export interface DeskLoyaltyResponse {
  enabled: boolean;
  required: number;
  reward: string;
  cards: DeskLoyaltyCard[];
  count: number;
  rewardsReady: number;
}

export interface DeskWaitlistEntry {
  id: number;
  serviceId: number | null;
  name: string;
  phone: string;
  date: string;
  status: string;
  offeredDate: string | null;
  offeredTime: string | null;
  notifiedAt: string | null;
  serviceName: string;
  createdAt: string | null;
}

export interface DeskWaitlistResponse {
  count: number;
  waitingCount: number;
  notifiedCount: number;
  entries: DeskWaitlistEntry[];
}

export interface DeskQueueResponse {
  tickets: DeskQueueTicket[];
  waitingCount: number;
  estimatedWaitMinutes: number;
  settings: DeskSettings;
  seated: { appointmentId: number; serviceName: string | null; remainingMinutes: number } | null;
  services: DeskService[];
  sharePath: string;
  qrPath: string;
}

export const QUEUE_STATUS_LABELS: Record<string, string> = {
  waiting: "En espera",
  notified: "Avisado",
  seated: "En la silla",
  served: "Atendido",
  left: "Se fue",
  cancelled: "Cancelado",
};

export class DeskApiError extends Error {
  status: number;
  payload: any;
  constructor(status: number, message: string, payload?: any) {
    super(message);
    this.name = "DeskApiError";
    this.status = status;
    this.payload = payload;
  }
}

/** JSON request with the session token + CSRF header handled by `apiFetch`. */
export async function deskRequest<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await apiFetch(url, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new DeskApiError(res.status, payload?.message || `Error ${res.status}`, payload);
  }
  return payload as T;
}

const penFormatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

export function formatPEN(value: number | string | null | undefined): string {
  const amount = typeof value === "number" ? value : parseFloat(String(value ?? 0));
  return penFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export function formatLimaTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
  });
}
