import { Order, OrderStatus, PaymentStatus, SaleType } from '../types';

/**
 * Centralized POS business rules for the order-status / payment-status state machine.
 *
 * These rules used to be duplicated ad-hoc across App.tsx and ViewOrderPage.tsx.
 * Every status/payment transition in the app must go through this module so the
 * rules can never drift apart between screens again.
 *
 * ── Rule 3 (In-store auto-complete) ─────────────────────────────────────────
 * For an on-site sale (SaleType.ON_SITE), confirming at POS (SOLD) or marking as
 * delivered (DELIVERED) automatically completes the order: status -> DELIVERED
 * and paymentStatus -> PAID in one action.
 *
 * ── Rule 6 (Unpaid completion lock) ─────────────────────────────────────────
 * An order can never reach DELIVERED unless it is fully PAID. Any transition or
 * update that would produce that combination must be blocked by the caller.
 */

/** Rule 6 warning shown to the cashier whenever a completion is blocked. */
export const UNPAID_COMPLETION_WARNING =
  '⚠️ Վճարումը հաստատված չէ: Պատվերը հնարավոր չէ ավարտել, քանի դեռ վճարումը չի հաստատվել (Լրիվ վճարված):';

/** An order without an explicit saleType is treated as an in-store sale. */
export const isOnSiteSale = (order: Pick<Order, 'saleType'>): boolean =>
  (order.saleType || SaleType.ON_SITE) === SaleType.ON_SITE;

/** Rule 6 as a pure predicate: does this status/payment pair violate the unpaid-completion lock? */
export function wouldCompleteUnpaidOrder(
  status: OrderStatus,
  paymentStatus: PaymentStatus
): boolean {
  return status === OrderStatus.DELIVERED && paymentStatus !== PaymentStatus.PAID;
}

export interface StatusTransitionResult {
  /** Final status after Rule 3 remapping (may differ from the requested one). */
  targetStatus: OrderStatus;
  /** Final payment status after Rule 3 remapping. */
  targetPaymentStatus: PaymentStatus;
  /** True when Rule 6 forbids the transition — the caller must abort and warn. */
  blocked: boolean;
}

/**
 * Applies the full status-transition rules (Rule 3 + Rule 6) for a requested
 * status change on an existing order. Pure function: never mutates the order.
 */
export function applyStatusTransition(
  order: Order,
  requestedStatus: OrderStatus
): StatusTransitionResult {
  let targetStatus = requestedStatus;
  let targetPaymentStatus = order.paymentStatus;

  // Rule 3: in-store sales auto-complete (DELIVERED + PAID) on POS confirmation.
  if (isOnSiteSale(order) && (requestedStatus === OrderStatus.SOLD || requestedStatus === OrderStatus.DELIVERED)) {
    targetStatus = OrderStatus.DELIVERED;
    targetPaymentStatus = PaymentStatus.PAID;
  }

  // Rule 6: never complete an order that is not fully paid.
  const blocked = wouldCompleteUnpaidOrder(targetStatus, targetPaymentStatus);

  return { targetStatus, targetPaymentStatus, blocked };
}

/**
 * Payment-side companion of Rule 3 (used by the cashier panel in ViewOrderPage):
 * derives which ORDER status should accompany a manual payment-status change.
 *
 * - Marking PAID on an in-store sale completes the order (Rule 3).
 * - Marking PAID on a delivery/pickup order that is still PENDING advances it to SOLD.
 * - Revoking full payment on a DELIVERED order reverts it to a non-completed status.
 */
export function deriveStatusAfterPaymentChange(
  order: Order,
  newPaymentStatus: PaymentStatus
): OrderStatus {
  const onSite = isOnSiteSale(order);

  if (newPaymentStatus === PaymentStatus.PAID) {
    if (onSite) {
      // Rule 3: In-Store sale + confirmed payment => immediate DELIVERED.
      return OrderStatus.DELIVERED;
    }
    if (order.status === OrderStatus.PENDING) {
      // Delivery/Pickup: confirming payment advances PENDING => SOLD.
      return OrderStatus.SOLD;
    }
    return order.status;
  }

  // Payment revoked (UNPAID / PARTIAL): a DELIVERED order must not stay completed.
  if (order.status === OrderStatus.DELIVERED) {
    return onSite ? OrderStatus.PENDING : OrderStatus.SOLD;
  }
  return order.status;
}
