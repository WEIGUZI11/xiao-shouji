export function buildHttpErrorMessage(
  label: string,
  {
    status,
    statusText,
    detail,
  }: {
    status: number;
    statusText?: string;
    detail?: string;
  },
) {
  const cleanStatusText = statusText?.replace(/\s+/g, ' ').trim();
  const cleanDetail = detail?.replace(/\s+/g, ' ').trim();
  return [
    `HTTP ${status}${cleanStatusText ? ` ${cleanStatusText}` : ''}`,
    label.trim(),
    cleanDetail,
  ].filter(Boolean).join(' - ');
}

export async function readHttpErrorDetail(response: Response, limit = 1200) {
  try {
    const text = await response.text();
    return text.slice(0, limit).trim();
  } catch {
    return '';
  }
}
