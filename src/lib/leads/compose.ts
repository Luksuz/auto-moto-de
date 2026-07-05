/**
 * Compose the WhatsApp message body for a lead, mirroring the prototype:
 * an uppercase heading, a blank line, then "Label: value" lines with
 * empty values filtered out.
 */
export function composeWaMessage(
  heading: string,
  entries: Array<[label: string, value: string | undefined | null]>,
): string {
  const lines = entries
    .filter(([, value]) => Boolean(value && String(value).trim()))
    .map(([label, value]) => `${label}: ${String(value).trim()}`);
  return [heading, "", ...lines].join("\n");
}
