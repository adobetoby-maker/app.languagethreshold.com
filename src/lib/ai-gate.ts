export type GateStatus =
  | "open"            // call is allowed — no gate needed
  | "email-required"  // 3rd call, need email before continuing
  | "paywall";        // post-beta, email captured, no subscription

/** The client gate is disabled. Server generation limits remain authoritative.
 * Do not collect a browser-wide usage history or retain captured email here.
 */
export function checkGate(_isSubscribed: boolean): GateStatus {
  return "open";
}
