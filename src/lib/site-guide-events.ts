export const SITE_SETTINGS_EVENT = "lt:open-learning-settings";
export const DESKTOP_GUIDE_MEDIA = "(hover: hover) and (pointer: fine) and (min-width: 1024px)";
export const SITE_GUIDE_OFFER_DELAY = 12_000;
export function canOfferSiteGuide(input: {
  hydrated: boolean;
  onboardingComplete: boolean;
  tutorOpen: boolean;
  currentTab: string;
  hasLessonLink: boolean;
}): boolean {
  return (
    input.hydrated &&
    input.onboardingComplete &&
    !input.tutorOpen &&
    !input.hasLessonLink &&
    ["reader", "modules", "guide", "dashboard"].includes(input.currentTab)
  );
}
