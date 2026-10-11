export type TeamTerm = "monthly" | "quarterly" | "annual";

export const TEAM_MIN_SEATS = 5;

const MONTHLY_BASE_CENTS = 9900;
const MONTHLY_EXTRA_SEAT_CENTS = 1500;

export function teamPriceTiers(term: TeamTerm) {
  const monthsCharged = term === "annual" ? 10 : term === "quarterly" ? 3 : 1;
  return {
    baseCents: MONTHLY_BASE_CENTS * monthsCharged,
    extraSeatCents: MONTHLY_EXTRA_SEAT_CENTS * monthsCharged,
  };
}

export function teamPeriodCents(seats: number, term: TeamTerm) {
  if (!Number.isInteger(seats) || seats < TEAM_MIN_SEATS)
    throw new Error(`Team plans require at least ${TEAM_MIN_SEATS} learner seats.`);
  const { baseCents, extraSeatCents } = teamPriceTiers(term);
  return baseCents + (seats - TEAM_MIN_SEATS) * extraSeatCents;
}
