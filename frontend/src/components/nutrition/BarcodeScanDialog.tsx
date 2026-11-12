import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PhotoCameraRounded, QrCodeScannerRounded, SearchRounded, VideocamOffRounded } from '@mui/icons-material';
import { ACTIVITY_STRINGS } from '../../constants/activityStrings';
import { BARCODE_FORMATS, BARCODE_PATTERN, BARCODE_SCAN_INTERVAL_MS } from '../../constants/activity';
import { useBarcodeLookup } from '../../hooks/queries/useActivityQueries';
import { resolveApiError } from '../../lib/apiClient';
import { foodScanErrorCode } from '../../services/foodScanService';
import type { BarcodeProduct, ServingOption } from '../../types/foodScan';
import type { MealEstimate } from '../../types/nutrition';
import { barcodeEstimate, productTitle } from '../../utils/foodScan';
import { barcodeScanDialogStyles as styles } from './BarcodeScanDialog.styles';

const B = ACTIVITY_STRINGS.barcode;

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect(source: HTMLVideoElement): Promise<DetectedBarcode[]> };
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

/** The browser's BarcodeDetector (Chrome on Android, some desktop browsers), if any. */
function barcodeDetector(): BarcodeDetectorCtor | null {
  const candidate = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return candidate ?? null;
}

type BarcodeScanDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with a one-item estimate for the normal review screen. */
  onEstimate: (estimate: MealEstimate) => void;
};

/**
 * Scan a packaged food's barcode with the camera (where the browser
 * supports it) or type the number, look it up on Open Food Facts, pick how
 * much was eaten, then review and log it like any other meal.
 */
export function BarcodeScanDialog({ open, onClose, onEstimate }: BarcodeScanDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const { mutate: lookupMutate, isPending } = useBarcodeLookup();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [code, setCode] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [servingId, setServingId] = useState<ServingOption['id']>('serving');
  const [amount, setAmount] = useState('1');
  const canScan = typeof window !== 'undefined' && barcodeDetector() !== null;

  const lookup = useCallback(
    (raw: string) => {
      const digits = raw.replace(/[\s-]/g, '');
      if (!BARCODE_PATTERN.test(digits)) {
        setLookupError(B.invalid);
        return;
      }
      setCode(digits);
      setLookupError(null);
      setProduct(null);
      lookupMutate(digits, {
        onSuccess: (found) => {
          setProduct(found);
          setServingId(found.default_serving);
          setAmount(found.default_serving === '100g' ? '100' : '1');
        },
        onError: (error) => {
          setLookupError(foodScanErrorCode(error) === 'not_found' ? B.notFound : resolveApiError(error, B.lookupError));
        },
      });
    },
    [lookupMutate],
  );

  // Camera: stream into the video element and check frames for a barcode.
  useEffect(() => {
    const Detector = barcodeDetector();
    if (!open || !cameraOn || !Detector) return undefined;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let cancelled = false;
    const detector = new Detector({ formats: BARCODE_FORMATS });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (media) => {
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = media;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = media;
        await video.play();
        timer = window.setInterval(async () => {
          if (video.readyState < 2) return;
          try {
            const found = await detector.detect(video);
            const value = found[0]?.rawValue;
            if (value && BARCODE_PATTERN.test(value) && !cancelled) {
              cancelled = true;
              setCameraOn(false);
              lookup(value);
            }
          } catch {
            // A frame that can't be read is skipped.
          }
        }, BARCODE_SCAN_INTERVAL_MS);
      })
      .catch(() => {
        setCameraError(B.cameraError);
        setCameraOn(false);
      });

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, cameraOn, lookup]);

  function reset() {
    setProduct(null);
    setLookupError(null);
    setCode('');
  }

  function handleClose() {
    setCameraOn(false);
    reset();
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    lookup(code);
  }

  const option = product?.serving_options.find((o) => o.id === servingId) ?? product?.serving_options[0];
  const amountNumber = Number(amount);
  const count = option?.id === '100g' ? amountNumber / 100 : amountNumber;
  const valid = Boolean(option) && count > 0 && Number.isFinite(count);
  const preview = product && option && valid && product.per_100g ? barcodeEstimate(product, option, count) : null;

  function review() {
    if (!preview) return;
    onEstimate(preview);
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} fullScreen={fullScreen} fullWidth maxWidth="xs">
      <DialogTitle>{B.title}</DialogTitle>
      <DialogContent>
        {!product && (
          <Box>
            {canScan ? (
              <Box sx={styles.camera}>
                {cameraOn ? (
                  <Box component="video" ref={videoRef} muted playsInline sx={styles.video} />
                ) : (
                  <Stack sx={styles.cameraIdle}>
                    <QrCodeScannerRounded sx={styles.cameraIcon} />
                    <Typography variant="body2" color="text.secondary">
                      {B.cameraHint}
                    </Typography>
                  </Stack>
                )}
                <Button
                  size="small"
                  startIcon={cameraOn ? <VideocamOffRounded /> : <PhotoCameraRounded />}
                  onClick={() => {
                    setCameraError(null);
                    setCameraOn((on) => !on);
                  }}
                  sx={styles.cameraButton}
                >
                  {cameraOn ? B.stopCamera : B.startCamera}
                </Button>
              </Box>
            ) : (
              <Alert severity="info" sx={styles.notice}>
                {B.cameraUnsupported}
              </Alert>
            )}
            {cameraError && (
              <Alert severity="warning" sx={styles.notice}>
                {cameraError}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate sx={styles.manual}>
              <TextField
                size="small"
                fullWidth
                label={B.manualLabel}
                placeholder={B.manualPlaceholder}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 16 } }}
                disabled={isPending}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={isPending || code.trim() === ''}
                startIcon={isPending ? <CircularProgress size={18} color="inherit" /> : <SearchRounded />}
              >
                {isPending ? B.lookingUp : B.lookup}
              </Button>
            </Box>
            {lookupError && (
              <Alert severity="warning" sx={styles.notice}>
                {lookupError}
              </Alert>
            )}
          </Box>
        )}

        {product && (
          <Box>
            <Stack sx={styles.product}>
              <Avatar variant="rounded" src={product.image ?? undefined} alt="" sx={styles.productImage}>
                <QrCodeScannerRounded />
              </Avatar>
              <Box sx={styles.productText}>
                <Typography variant="subtitle1" sx={styles.productName}>
                  {productTitle(product)}
                </Typography>
                {product.per_100g && (
                  <>
                    <Typography variant="body2">{B.per100(product.per_100g.kcal)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {B.macros100(product.per_100g.protein, product.per_100g.carbs, product.per_100g.fat)}
                    </Typography>
                  </>
                )}
              </Box>
            </Stack>

            {!product.has_nutrition ? (
              <Alert severity="warning" sx={styles.notice}>
                {B.noNutrition}
              </Alert>
            ) : (
              <>
                <Typography variant="subtitle2" sx={styles.amountTitle}>
                  {B.amount}
                </Typography>
                <Stack sx={styles.servings} role="group" aria-label={B.servingAria}>
                  {product.serving_options.map((o) => (
                    <Chip
                      key={o.id}
                      label={o.label}
                      clickable
                      color={o.id === option?.id ? 'primary' : 'default'}
                      variant={o.id === option?.id ? 'filled' : 'outlined'}
                      onClick={() => {
                        setServingId(o.id);
                        setAmount(o.id === '100g' ? '100' : '1');
                      }}
                      aria-pressed={o.id === option?.id}
                    />
                  ))}
                </Stack>
                <TextField
                  size="small"
                  type="number"
                  label={option?.id === '100g' ? B.grams : B.quantity}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  sx={styles.amountField}
                  slotProps={{ htmlInput: { min: 0, step: option?.id === '100g' ? 10 : 0.5 } }}
                />
                {preview && (
                  <Typography variant="body2" sx={styles.total}>
                    {B.total(preview.totals.kcal, preview.items[0].grams)}
                  </Typography>
                )}
              </>
            )}
            <Typography variant="caption" color="text.secondary" component="p" sx={styles.provenance}>
              {B.provenance}{' '}
              <Link href={product.source_url} target="_blank" rel="noopener noreferrer">
                {product.source_name}
              </Link>
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {product && <Button onClick={reset}>{B.scanAnother}</Button>}
        <Button onClick={handleClose}>{B.close}</Button>
        {product && (
          <Button variant="contained" onClick={review} disabled={!preview}>
            {B.review}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
