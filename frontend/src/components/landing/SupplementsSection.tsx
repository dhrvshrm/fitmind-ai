import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import {
  ArrowForwardRounded,
  BlockRounded,
  CheckRounded,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { LANDING_STRINGS } from "../../constants/landingStrings";
import { ROUTES } from "../../constants/routes";
import { InView } from "./InView";
import { supplementsSectionStyles as styles } from "./SupplementsSection.styles";

const P = LANDING_STRINGS.supplements;

/**
 * Supplements without the sales pitch: the bare minimum for your body and
 * budget, folded into the meals and steps you already have. A pill organiser
 * shows one sample day.
 */
export function SupplementsSection() {
  return (
    <Box component="section" id="supplements" sx={styles.root}>
      <Box sx={styles.inner}>
        <InView>
          <Box>
            <Typography sx={styles.eyebrow}>{P.eyebrow}</Typography>
            <Typography variant="h2" sx={styles.title}>
              {P.title}
            </Typography>
            <Typography variant="h2" component="p" sx={styles.titleAccent}>
              {P.titleAccent}
            </Typography>
            <Typography color="text.secondary" sx={styles.body}>
              {P.body}
            </Typography>
            <Box component="ul" sx={styles.points}>
              {P.points.map((point) => (
                <Box component="li" key={point} sx={styles.point}>
                  <CheckRounded fontSize="small" sx={styles.check} />
                  <Typography variant="body2">{point}</Typography>
                </Box>
              ))}
            </Box>
            <Button
              component={RouterLink}
              to={ROUTES.SIGNUP}
              variant="outlined"
              endIcon={<ArrowForwardRounded />}
              sx={styles.cta}
            >
              {P.cta}
            </Button>
          </Box>
        </InView>
        <InView>
          <Box sx={styles.boxWrap}>
            <Box
              sx={styles.box}
              role="img"
              aria-label={`${LANDING_STRINGS.example}: ${P.boxTitle}`}
            >
              <Typography sx={styles.example}>
                {LANDING_STRINGS.example}
              </Typography>
              <Typography sx={styles.boxTitle}>{P.boxTitle}</Typography>
              <Stack sx={styles.budget}>
                {P.budgets.map((budget) => (
                  <Chip
                    key={budget}
                    size="small"
                    label={budget}
                    color={budget === P.budgetPicked ? "primary" : "default"}
                    variant={budget === P.budgetPicked ? "filled" : "outlined"}
                  />
                ))}
              </Stack>
              <Box component="ol" sx={styles.slots}>
                {P.slots.map(([time, when, what, done]) => (
                  <Box
                    component="li"
                    key={time}
                    sx={styles.slot(done === "done")}
                  >
                    <Stack sx={styles.slotHead}>
                      <Box component="span" sx={styles.slotTime}>
                        {time}
                      </Box>
                      <Box component="span" sx={styles.slotWhen}>
                        {when}
                      </Box>
                      {done === "done" && (
                        <CheckRounded fontSize="small" sx={styles.slotCheck} />
                      )}
                    </Stack>
                    <Typography sx={styles.slotWhat}>{what}</Typography>
                  </Box>
                ))}
              </Box>
              <Stack sx={styles.total}>
                <span>{P.total[0]}</span>
                <span>{P.total[1]}</span>
              </Stack>
              <Stack sx={styles.never}>
                <BlockRounded fontSize="small" sx={styles.neverIcon} />
                <Typography variant="caption">{P.never}</Typography>
              </Stack>
              <Typography sx={styles.note}>{P.note}</Typography>
            </Box>
          </Box>
        </InView>
      </Box>
    </Box>
  );
}
