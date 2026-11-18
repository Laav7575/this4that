/**
 * Reasons depend on where the report starts. Keys must match ALLOWED_REASONS in
 * supabase/functions/submit-report/index.ts, which re-checks them on the server.
 */
export type ReportContext = 'post' | 'message' | 'profile';
export type ReportReasonOption = {
  value: string;
  label: string;
  hint: string;
};

export const REPORT_REASONS: Record<ReportContext, ReportReasonOption[]> = {
  post: [
    {
      value: 'scam',
      label: 'Scam or payment request',
      hint: 'Asks for money, gift cards, or financial details',
    },
    {
      value: 'unsafe',
      label: 'Unsafe or illegal request',
      hint: 'Something dangerous, illegal, or against university rules',
    },
    {
      value: 'inappropriate',
      label: 'Offensive or inappropriate post',
      hint: 'Hateful, sexual, or violent content',
    },
    {
      value: 'spam',
      label: 'Spam or misleading',
      hint: 'Repeated, off-topic, or deceptive',
    },
    {
      value: 'other',
      label: 'Something else',
      hint: 'Tell us what happened below',
    },
  ],
  message: [
    {
      value: 'harassment',
      label: 'Harassment or bullying',
      hint: 'Insults, intimidation, or messages that continue after being asked to stop',
    },
    {
      value: 'hate',
      label: 'Hateful or discriminatory messages',
      hint: 'Attacks based on race, religion, gender, sexuality, disability, or similar',
    },
    {
      value: 'threats',
      label: 'Threats or violence',
      hint: 'Threatening you or encouraging harm',
    },
    {
      value: 'sexual',
      label: 'Sexual or unwanted messages',
      hint: 'Explicit or suggestive messages you did not ask for',
    },
    {
      value: 'scam',
      label: 'Scam or payment request',
      hint: 'Asks for money, gift cards, or financial details',
    },
    {
      value: 'unsafe',
      label: 'Unsafe or illegal plans',
      hint: 'Pushing you to meet somewhere unsafe or do something illegal',
    },
    { value: 'spam', label: 'Spam', hint: 'Repeated or unrelated messages' },
    {
      value: 'other',
      label: 'Something else',
      hint: 'Tell us what happened below',
    },
  ],
  profile: [
    {
      value: 'impersonation',
      label: 'Fake or impersonating account',
      hint: 'Pretending to be someone else or not a real student',
    },
    {
      value: 'inappropriate',
      label: 'Offensive or inappropriate profile',
      hint: 'A name, photo, or bio that is hateful, sexual, or otherwise inappropriate',
    },
    {
      value: 'harassment',
      label: 'Harassment or threats',
      hint: 'Targeting you or other students',
    },
    {
      value: 'scam',
      label: 'Scam behaviour',
      hint: 'Asks people for money or personal information',
    },
    {
      value: 'other',
      label: 'Something else',
      hint: 'Tell us what happened below',
    },
  ],
};

export const REPORT_DETAILS_MAX = 1000;