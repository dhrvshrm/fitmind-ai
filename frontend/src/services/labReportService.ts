import { apiClient } from '../lib/apiClient';
import { LAB_REPORT_ENDPOINTS } from '../constants/api';
import type { ApiEnvelope } from '../types/auth';
import type { BiomarkerGroup, BiomarkerValueIn, CatalogBiomarker, FileLink, LabReport } from '../types/labReports';

/** Lab reports and biomarker history. Unwraps the `{ success, message, data }` envelope. */
export const labReportService = {
  async list(): Promise<LabReport[]> {
    const { data } = await apiClient.get<ApiEnvelope<LabReport[]>>(LAB_REPORT_ENDPOINTS.REPORTS);
    return data.data;
  },

  async get(id: string): Promise<LabReport> {
    const { data } = await apiClient.get<ApiEnvelope<LabReport>>(LAB_REPORT_ENDPOINTS.report(id));
    return data.data;
  },

  /** Stores the file and returns draft values to check; nothing is saved to history yet. */
  async upload(file: File, allowAi: boolean): Promise<LabReport> {
    const form = new FormData();
    form.append('file', file, file.name);
    form.append('allow_ai', String(allowAi));
    const { data } = await apiClient.post<ApiEnvelope<LabReport>>(
      LAB_REPORT_ENDPOINTS.REPORTS,
      form,
      // Let the browser set the multipart boundary itself.
      { headers: { 'Content-Type': undefined as unknown as string } },
    );
    return data.data;
  },

  async confirm(id: string, reportDate: string | null, values: BiomarkerValueIn[]): Promise<{ saved: number }> {
    const { data } = await apiClient.post<ApiEnvelope<{ saved: number }>>(LAB_REPORT_ENDPOINTS.confirm(id), {
      report_date: reportDate,
      values,
    });
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(LAB_REPORT_ENDPOINTS.report(id));
  },

  /**
   * A URL to open the original file in a new tab: a short-lived signed link,
   * or (when the file is kept in the database) the file fetched with the
   * person's token and turned into a local blob URL.
   */
  async openUrl(id: string): Promise<string> {
    const { data } = await apiClient.get<ApiEnvelope<FileLink>>(LAB_REPORT_ENDPOINTS.fileLink(id));
    if (data.data.url) return data.data.url;
    const file = await apiClient.get<Blob>(LAB_REPORT_ENDPOINTS.file(id), { responseType: 'blob' });
    return URL.createObjectURL(file.data);
  },

  async history(): Promise<BiomarkerGroup[]> {
    const { data } = await apiClient.get<ApiEnvelope<BiomarkerGroup[]>>(LAB_REPORT_ENDPOINTS.BIOMARKERS);
    return data.data;
  },

  async catalog(): Promise<CatalogBiomarker[]> {
    const { data } = await apiClient.get<ApiEnvelope<CatalogBiomarker[]>>(LAB_REPORT_ENDPOINTS.CATALOG);
    return data.data;
  },

  async addValue(value: BiomarkerValueIn): Promise<void> {
    await apiClient.post(LAB_REPORT_ENDPOINTS.BIOMARKERS, value);
  },

  async removeValue(id: string): Promise<void> {
    await apiClient.delete(LAB_REPORT_ENDPOINTS.biomarker(id));
  },
};
