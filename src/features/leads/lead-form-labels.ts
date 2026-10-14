import { ROUTES } from "@/config/navigation";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { localizePath } from "@/i18n/routing";
import type { LeadFormLabels } from "./lead-form";

/**
 * Build the (serialisable) label set the client form needs, on the server.
 *
 * Keeping this in one function means the catalog is read once per render and the
 * Client Component receives plain strings — never the whole dictionary.
 */
export function leadFormLabels(locale: Locale): LeadFormLabels {
  const m = getMessages(locale);
  return {
    optional: m.lead.optional,
    company: m.lead.company,
    fields: m.lead.fields,
    hints: m.lead.hints,
    placeholders: m.lead.placeholders,
    consent: m.lead.consent,
    submit: m.lead.submit,
    submitting: m.lead.submitting,
    submittingSr: m.lead.submittingSr,
    errorSr: m.lead.errorSr,
    footnote: m.lead.footnote,
    genericError: m.lead.genericError,
    networkError: m.lead.networkError,
    success: m.lead.success,
    validation: m.lead.validation,
    errors: m.lead.errors,
    hotline: m.common.hotline,
    privacyHref: localizePath(locale, ROUTES.privacy),
    datePicker: {
      placeholder: m.datePicker.placeholder,
      dialogLabel: m.datePicker.dialogLabel,
      previousMonth: m.datePicker.previousMonth,
      nextMonth: m.datePicker.nextMonth,
      clear: m.datePicker.clear,
      today: m.datePicker.today,
      tomorrow: m.datePicker.tomorrow,
      months: m.datePicker.months,
      weekdaysShort: m.datePicker.weekdaysShort,
      weekdaysFull: m.datePicker.weekdaysFull,
      dayAria: m.datePicker.dayAria,
    },
  };
}
