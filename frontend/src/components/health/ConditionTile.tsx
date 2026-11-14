import { Box, ButtonBase, Collapse, Typography } from '@mui/material';
import { CheckBoxOutlineBlankRounded, CheckBoxRounded } from '@mui/icons-material';
import { HEALTH_STRINGS } from '../../constants/healthStrings';
import type { ConditionDetails, ConditionKey, FollowUpValue, HealthCondition } from '../../types/health';
import { answerQuestion, visibleQuestions } from '../../utils/health';
import { ChoiceChips } from './ChoiceChips';
import { conditionTileStyles as styles } from './ConditionTile.styles';

const P = HEALTH_STRINGS.profile;
const C = HEALTH_STRINGS.common;

type ConditionTileProps = {
  condition: ConditionKey;
  /** The answers, or undefined while the condition is not ticked. */
  answers: ConditionDetails | undefined;
  /** The saved record, for where and when it was recorded. */
  saved: HealthCondition | undefined;
  onChange: (answers: ConditionDetails | undefined) => void;
};

/** One condition: a tick box that opens its follow-up questions. */
export function ConditionTile({ condition, answers, saved, onChange }: ConditionTileProps) {
  const selected = answers !== undefined;
  const label = P.conditions[condition];
  const yesNo = [
    { value: true, label: C.yes },
    { value: false, label: C.no },
  ];

  function answer(key: string, value: FollowUpValue | undefined) {
    onChange(answerQuestion(condition, answers ?? {}, key, value));
  }

  return (
    <Box sx={styles.root(selected)}>
      <ButtonBase
        role="checkbox"
        aria-checked={selected}
        onClick={() => onChange(selected ? undefined : {})}
        sx={styles.toggle}
      >
        {selected ? <CheckBoxRounded sx={styles.checkOn} /> : <CheckBoxOutlineBlankRounded sx={styles.checkOff} />}
        <Typography component="span" sx={styles.label}>
          {label}
        </Typography>
      </ButtonBase>

      <Collapse in={selected} unmountOnExit>
        <Box sx={styles.questions}>
          {visibleQuestions(condition, answers ?? {}).map((question) =>
            question.kind === 'bool' ? (
              <ChoiceChips
                key={question.key}
                label={P.questions[question.key]}
                options={yesNo}
                value={answers?.[question.key] as boolean | undefined}
                onChange={(value) => answer(question.key, value)}
              />
            ) : (
              <ChoiceChips
                key={question.key}
                label={P.questions[question.key]}
                options={(question.options ?? []).map((option) => ({ value: option, label: P.options[option] }))}
                value={answers?.[question.key] as string | undefined}
                onChange={(value) => answer(question.key, value)}
              />
            ),
          )}
          {saved && (
            <Typography variant="caption" sx={styles.provenance}>
              {saved.provenance === 'report' ? C.fromReport : C.selfReported} {C.recordedOn(saved.recorded_at)}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
