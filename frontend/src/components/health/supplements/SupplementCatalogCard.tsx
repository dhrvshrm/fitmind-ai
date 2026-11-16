import { useState } from 'react';
import { Alert, Box, Button, Chip, Collapse, Link, Skeleton, Stack, Typography } from '@mui/material';
import {
  AddRounded,
  CheckRounded,
  ExpandLessRounded,
  ExpandMoreRounded,
  VerifiedUserRounded,
} from '@mui/icons-material';
import { EVIDENCE_COLOR, SEVERITY_COLOR } from '../../../constants/supplements';
import { SUPPLEMENT_STRINGS } from '../../../constants/supplementStrings';
import { queryErrorMessage } from '../../../hooks/queries/queryHelpers';
import { useMySupplements, useSupplementCatalog } from '../../../hooks/queries/useSupplementQueries';
import { useUserProfile } from '../../../hooks/queries/useProfileQueries';
import type { CatalogSupplement } from '../../../types/supplements';
import { ErrorState } from '../../ui/ErrorState';
import { SectionCard } from '../../ui/SectionCard';
import { SupplementDialog } from './SupplementDialog';
import { supplementCatalogCardStyles as styles } from './SupplementCatalogCard.styles';

const S = SUPPLEMENT_STRINGS.catalog;

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <Box>
      <Typography variant="caption" sx={styles.detailTitle}>
        {title}
      </Typography>
      <Box component="ul" sx={styles.detailList}>
        {items.map((item) => (
          <Typography component="li" variant="body2" key={item}>
            {item}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

type CatalogItemProps = { entry: CatalogSupplement; tracked: boolean; india: boolean; onTrack: () => void };

function CatalogItem({ entry, tracked, india, onTrack }: CatalogItemProps) {
  const [open, setOpen] = useState(false);
  const flags = entry.safety_flags;
  return (
    <Box component="li" sx={styles.item(entry.relevant)}>
      <Stack sx={styles.itemHead}>
        <Box sx={styles.itemText}>
          <Stack sx={styles.nameRow}>
            <Typography variant="subtitle2" component="h3">
              {entry.name}
            </Typography>
            {entry.relevant && <Chip size="small" color="secondary" label={S.suggested} />}
            {entry.doctor_first && <Chip size="small" color="error" variant="outlined" label={S.doctorFirst} />}
            {!entry.doctor_first && entry.extra_caution && (
              <Chip size="small" color="warning" variant="outlined" label={S.extraCaution} />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {entry.summary}
          </Typography>
          {entry.monthly_cost_inr ? (
            <Typography variant="caption" color="text.secondary">
              {S.perMonth(entry.monthly_cost_inr)}
            </Typography>
          ) : null}
        </Box>
        <Button
          size="small"
          variant={tracked ? 'text' : 'outlined'}
          startIcon={tracked ? <CheckRounded /> : <AddRounded />}
          onClick={onTrack}
          disabled={tracked}
          sx={styles.trackButton}
        >
          {tracked ? S.tracking : S.track}
        </Button>
      </Stack>

      <Stack sx={styles.evidence}>
        {entry.evidence.map((e) => (
          <Chip
            key={e.use}
            size="small"
            variant="outlined"
            color={EVIDENCE_COLOR[e.level]}
            label={`${e.use}: ${S.evidence[e.level].toLowerCase()}`}
          />
        ))}
      </Stack>

      {entry.reasons.length > 0 && (
        <Box sx={styles.why}>
          <Typography variant="caption" sx={styles.detailTitle}>
            {S.whyTitle}
          </Typography>
          {entry.reasons.map((reason) => (
            <Typography key={reason} variant="body2">
              {reason}
            </Typography>
          ))}
        </Box>
      )}

      {flags.length > 0 && (
        <Stack sx={styles.flags}>
          {flags.map((flag) => (
            <Alert key={flag.code} severity={SEVERITY_COLOR[flag.severity]} variant="outlined" sx={styles.flag}>
              <strong>{S.severity[flag.severity]}:</strong> {flag.message}
            </Alert>
          ))}
        </Stack>
      )}

      <Button
        size="small"
        color="inherit"
        onClick={() => setOpen((v) => !v)}
        endIcon={open ? <ExpandLessRounded /> : <ExpandMoreRounded />}
        sx={styles.toggle}
        aria-expanded={open}
      >
        {open ? S.hideDetails : S.details}
      </Button>
      <Collapse in={open} unmountOnExit>
        <Box sx={styles.details}>
          {entry.india_gap && india && <DetailList title={S.indiaGap} items={[entry.india_gap]} />}
          {entry.food_first && <DetailList title={S.foodFirst} items={[entry.food_first]} />}
          <DetailList title={S.typicalDose} items={[entry.typical_dose]} />
          <DetailList title={S.timing} items={[entry.timing]} />
          <DetailList title={S.cautions} items={entry.cautions} />
          <DetailList title={S.interactions} items={entry.interactions} />
          {entry.sources.length > 0 && (
            <Box>
              <Typography variant="caption" sx={styles.detailTitle}>
                {S.sources}
              </Typography>
              <Box component="ul" sx={styles.detailList}>
                {entry.sources.map((src) => (
                  <Typography component="li" variant="body2" key={src.url}>
                    <Link href={src.url} target="_blank" rel="noopener noreferrer">
                      {src.title}
                    </Link>
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

/** The curated catalogue, checked against the person's body, food log and health profile. */
export function SupplementCatalogCard() {
  const catalog = useSupplementCatalog();
  const mine = useMySupplements();
  const [adding, setAdding] = useState<CatalogSupplement | null>(null);
  const error = queryErrorMessage(catalog.error, S.loadError);
  const tracked = new Set((mine.data ?? []).map((s) => s.supplement_id));
  const country = useUserProfile().data?.food_access?.country;
  const india = !country || ['india', 'in', 'bharat'].includes(country.trim().toLowerCase());

  return (
    <SectionCard title={S.title} subtitle={S.subtitle}>
      <Stack sx={styles.promise}>
        <VerifiedUserRounded fontSize="small" sx={styles.promiseIcon} />
        <Typography variant="body2">{S.promise}</Typography>
      </Stack>
      {catalog.isPending && <Skeleton variant="rounded" height={320} />}
      {error && !catalog.data && <ErrorState message={error} onRetry={() => catalog.refetch()} />}
      {catalog.data && (
        <>
          <Box component="ul" sx={styles.list}>
            {catalog.data.supplements.map((entry) => (
              <CatalogItem
                key={entry.id}
                entry={entry}
                tracked={tracked.has(entry.id)}
                india={india}
                onTrack={() => setAdding(entry)}
              />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" component="p" sx={styles.reviewed}>
            {S.reviewed(catalog.data.version, catalog.data.reviewed)}
          </Typography>
        </>
      )}
      {adding && <SupplementDialog catalog={adding} onClose={() => setAdding(null)} />}
    </SectionCard>
  );
}
