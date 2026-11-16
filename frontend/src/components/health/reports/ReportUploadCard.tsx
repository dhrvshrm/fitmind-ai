import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Box, Button, CircularProgress, Collapse, FormControlLabel, Switch, Typography } from '@mui/material';
import { HelpOutlineRounded, UploadFileRounded } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { LAB_REPORT_STRINGS } from '../../../constants/labReportStrings';
import { useLabReports, useUploadLabReport } from '../../../hooks/queries/useLabReportQueries';
import { resolveApiError } from '../../../lib/apiClient';
import type { LabReport } from '../../../types/labReports';
import { SectionCard } from '../../ui/SectionCard';
import { reportUploadCardStyles as styles } from './ReportUploadCard.styles';

const S = LAB_REPORT_STRINGS.upload;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

type ReportUploadCardProps = {
  /** Called with the new report so its values can be checked straight away. */
  onUploaded: (report: LabReport) => void;
};

/** Pick or drop a report; the server reads it and the person checks the values next. */
export function ReportUploadCard({ onUploaded }: ReportUploadCardProps) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadLabReport();
  const [allowAi, setAllowAi] = useState(true);
  const [dragging, setDragging] = useState(false);
  // Open for a first upload; once there are reports it folds away behind a link.
  const reports = useLabReports();
  const [guideOpen, setGuideOpen] = useState(false);
  const showGuide = guideOpen || (reports.data !== undefined && reports.data.length === 0);

  async function send(file: File | undefined) {
    if (!file || upload.isPending) return;
    if (file.size > MAX_BYTES) {
      toast.error(S.tooBig);
      return;
    }
    if (file.type && !ACCEPTED.includes(file.type)) {
      toast.error(S.wrongType);
      return;
    }
    try {
      onUploaded(await upload.mutateAsync({ file, allowAi }));
    } catch (err) {
      toast.error(resolveApiError(err, S.error));
    }
  }

  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    void send(event.target.files?.[0]);
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    void send(event.dataTransfer.files?.[0]);
  }

  return (
    <SectionCard title={S.title} subtitle={S.subtitle}>
      <Box
        sx={styles.zone(dragging, upload.isPending)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {upload.isPending ? (
          <>
            <CircularProgress size={28} />
            <Typography variant="body2" sx={styles.zoneText}>
              {S.uploading}
            </Typography>
          </>
        ) : (
          <>
            <UploadFileRounded sx={styles.zoneIcon} />
            <Box sx={styles.zoneActions}>
              <Button variant="contained" onClick={() => input.current?.click()}>
                {S.pick}
              </Button>
              <Typography variant="body2" color="text.secondary">
                {S.drop}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {S.types}
            </Typography>
          </>
        )}
        <Box
          component="input"
          ref={input}
          type="file"
          accept={ACCEPTED.join(',')}
          onChange={handlePick}
          sx={styles.hiddenInput}
        />
      </Box>
      {!showGuide && (
        <Button
          size="small"
          startIcon={<HelpOutlineRounded />}
          onClick={() => setGuideOpen(true)}
          sx={styles.whatToggle}
        >
          {S.whatToggle}
        </Button>
      )}
      <Collapse in={showGuide} unmountOnExit>
        <Box sx={styles.what}>
          <Typography variant="body2" sx={styles.whatTitle}>
            {S.whatTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {S.whatBody}
          </Typography>
          <Box component="ul" sx={styles.whatList}>
            {S.what.map((item) => (
              <Box component="li" key={item.group} sx={styles.whatItem}>
                <Typography variant="caption" sx={styles.whatGroup}>
                  {item.group}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.tests}
                </Typography>
              </Box>
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" component="p">
            {S.notThese}
          </Typography>
        </Box>
      </Collapse>
      <FormControlLabel
        sx={styles.aiToggle}
        control={<Switch checked={allowAi} onChange={(e) => setAllowAi(e.target.checked)} />}
        label={
          <Box>
            <Typography variant="body2" sx={styles.aiLabel}>
              {S.allowAi}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {S.allowAiHelp}
            </Typography>
          </Box>
        }
      />
    </SectionCard>
  );
}
