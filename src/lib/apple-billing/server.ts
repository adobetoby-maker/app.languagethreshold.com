import { X509Certificate } from "node:crypto";
import {
  Environment,
  SignedDataVerifier,
  VerificationException,
  VerificationStatus,
} from "@apple/app-store-server-library";
import { z } from "zod";
import certificate from "./apple-root-g3.pem?raw";
import type { TeamDb } from "../team-server";
import { TeamOperationError } from "../team-server";

const bundle = "com.languagethreshold.core60v4";
const environments = [Environment.PRODUCTION, Environment.SANDBOX] as const;
const roots = [new X509Certificate(certificate).raw];
const verifiers = environments.map(
  (environment) => new SignedDataVerifier(roots, true, environment, bundle, 6827949414),
);
const products = new Set(
  ["individual.monthly", "individual.annual", "family.monthly", "family.annual"].map(
    (id) => bundle + "." + id,
  ),
);

async function verify<T>(check: (v: SignedDataVerifier) => Promise<T>) {
  for (const verifier of verifiers) {
    try {
      return await check(verifier);
    } catch (error) {
      if (
        error instanceof VerificationException &&
        [
          VerificationStatus.INVALID_ENVIRONMENT,
          VerificationStatus.INVALID_APP_IDENTIFIER,
        ].includes(error.status)
      )
        continue;
      if (
        error instanceof VerificationException &&
        error.status !== VerificationStatus.RETRYABLE_VERIFICATION_FAILURE
      )
        throw new TeamOperationError("Apple could not verify this transaction.", 400);
      throw error;
    }
  }
  throw new TeamOperationError("Unrecognized App Store environment.", 400);
}

export async function recordApplePurchase(db: TeamDb, signed: string, account?: string) {
  const tx = await verify((v) => v.verifyAndDecodeTransaction(signed));
  if (
    !products.has(tx.productId ?? "") ||
    !tx.originalTransactionId ||
    !tx.expiresDate ||
    !tx.signedDate ||
    !tx.purchaseDate ||
    !z.string().uuid().safeParse(tx.appAccountToken).success
  )
    throw new TeamOperationError("This purchase is not a linked V4 subscription.", 400);
  const owner = tx.appAccountToken!.toLowerCase();
  if (account && owner !== account.toLowerCase())
    throw new TeamOperationError("Sign in with the account that purchased this subscription.", 403);
  const { error } = await db.rpc("record_v4_apple_transaction", {
    p_environment: tx.environment,
    p_original_id: tx.originalTransactionId,
    p_owner_id: owner,
    p_product_id: tx.productId,
    p_purchased_at: new Date(tx.purchaseDate).toISOString(),
    p_signed_at: new Date(tx.signedDate).toISOString(),
    p_expires_at: new Date(tx.expiresDate).toISOString(),
    p_revoked: !!tx.revocationDate || tx.isUpgraded === true,
  });
  if (error) throw error;
}

export async function processAppleNotification(db: TeamDb, payload: string) {
  const event = await verify((v) => v.verifyAndDecodeNotification(payload));
  if (event.data?.signedTransactionInfo)
    await recordApplePurchase(db, event.data.signedTransactionInfo);
}

export async function applePlan(db: TeamDb, owner: string, environment = "Production") {
  const { data, error } = await db
    .rpc("v4_apple_account_access", { p_user: owner, p_environment: environment })
    .maybeSingle();
  if (error) throw error;
  return data as { product_id: string; expires_at: string; is_family_member: boolean } | null;
}
