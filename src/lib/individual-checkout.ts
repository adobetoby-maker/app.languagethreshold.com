/** Never substitute a payment link with different trial/billing terms. */
export async function individualCheckoutUrl(response: Response): Promise<string> {
  if (!response.ok)
    throw new Error("We could not open checkout. Please try again. You have not been charged.");
  const { url } = (await response.json()) as { url?: unknown };
  if (typeof url !== "string" || !/^https:\/\/(checkout\.stripe\.com|buy\.stripe\.com)\//.test(url))
    throw new Error("Checkout is temporarily unavailable. Please try again.");
  return url;
}
