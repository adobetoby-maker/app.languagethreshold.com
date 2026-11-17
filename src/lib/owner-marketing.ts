export type MarketingMessage = {
  id: string;
  to: string[];
  from: string;
  subject: string;
  createdAt: string | null;
  status: string;
  isTest: boolean;
  category: string;
};
export type MarketingStream = {
  messages: MarketingMessage[];
  nextCursor: string | null;
  checkedAt: string;
};
