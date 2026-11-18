import { DEMO } from '../lib/demo';
import { getSupabase } from '../lib/supabase';
import { REPORT_DETAILS_MAX, type ReportContext } from '../data/reportReasons';

export type ReportInput = {
  context: ReportContext;
  reason: string;
  reportedUserId: string;
  details?: string;
  postId?: string;
  conversationId?: string;
};

const GENERIC_ERROR = 'Could not send your report. Please try again.';

/**
 * Sends a report to the submit-report Edge Function, which checks it and emails the team.
 */
export async function submitReport(input: ReportInput) {
  if (DEMO) return;
  const { error } = await getSupabase().functions.invoke('submit-report', {
    body: {
      ...input,
      details: (input.details ?? '').trim().slice(0, REPORT_DETAILS_MAX),
    },
  });
  if (!error) return;

  // The function replies with { error: "<safe message>" } on 4xx; show it when present.
  let message = GENERIC_ERROR;
  const response = (error as { context?: Response }).context;
  if (response && typeof response.json === 'function') {
    try {
      const body = await response.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {}
  }
  throw new Error(message);
}