import toast from 'react-hot-toast';
import { resolveApiError } from '../../../lib/apiClient';
import { labReportService } from '../../../services/labReportService';

/**
 * Opens a report's original file in a new tab. The tab is opened straight
 * away (inside the click) so pop-up blockers allow it, then pointed at the
 * signed link or the privately fetched file once that's ready.
 */
export async function openReportFile(id: string, errorText: string) {
  const tab = window.open('', '_blank');
  try {
    const url = await labReportService.openUrl(id);
    if (tab) tab.location.href = url;
    else window.open(url, '_blank', 'noopener');
  } catch (err) {
    tab?.close();
    toast.error(resolveApiError(err, errorText));
  }
}
