export type TeamTerm = "monthly" | "quarterly" | "annual";

export const TEAM_MIN_SEATS = 5;
export const TEAM_VOLUME_SEATS = 10;

const MONTHLY_BASE_CENTS = 9900;
const MONTHLY_STANDARD_SEAT_CENTS = 1200;
const MONTHLY_VOLUME_SEAT_CENTS = 1000;

export function teamPriceTiers(term: TeamTerm) {
  const monthsCharged = term === "annual" ? 10 : term === "quarterly" ? 3 : 1;
  return {
    baseCents: MONTHLY_BASE_CENTS * monthsCharged,
    standardSeatCents: MONTHLY_STANDARD_SEAT_CENTS * monthsCharged,
    volumeSeatCents: MONTHLY_VOLUME_SEAT_CENTS * monthsCharged,
  };
}

export function teamPeriodCents(seats: number, term: TeamTerm) {
  if (!Number.isInteger(seats) || seats < TEAM_MIN_SEATS)
    throw new Error(`Team plans require at least ${TEAM_MIN_SEATS} learner seats.`);
  const { baseCents, standardSeatCents, volumeSeatCents } = teamPriceTiers(term);
  const standardSeats = Math.min(seats - TEAM_MIN_SEATS, TEAM_VOLUME_SEATS - TEAM_MIN_SEATS);
  const volumeSeats = Math.max(0, seats - TEAM_VOLUME_SEATS);
  return baseCents + standardSeats * standardSeatCents + volumeSeats * volumeSeatCents;
}
