import {
  Alert,
  Box,
  Button,
  Checkbox,
  DatePicker,
  Field,
  Flex,
  NumberInput,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Calendar } from '@strapi/icons';
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  CronJob,
  CronJobInputData,
  CronJobInputErrors,
  SecurityCheckResult,
} from '../../../types';
import { ApiError, type CronJobPayload } from '../api/cron';
import { FormField } from '../components/FormField';
import { useScriptValidation } from '../hooks/useScriptValidation';
import { useSettings } from '../hooks/useSettings';
import { getDateAndTimeString, mapLocalDateToUTC } from '../utils/date';
import { ScriptEditor, SecurityFindings, type ScriptEditorHandle } from './ScriptEditor';

const initialState: CronJobInputData = {
  name: '',
  schedule: '',
  script: [
    'console.log(`${cronJob.name} – ${cronJob.iterationsCount} / ${cronJob.iterationsLimit}`)',
  ].join('\n'),
  iterationsLimit: -1,
  startDate: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
  endDate: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
};

const pickInput = (cronJob: CronJob): CronJobInputData => ({
  name: cronJob.name,
  schedule: cronJob.schedule,
  script: cronJob.script ?? '',
  iterationsLimit: cronJob.iterationsLimit,
  startDate: cronJob.startDate,
  endDate: cronJob.endDate,
});

type Props = {
  initialData?: CronJob;
  handleSubmit: (data: CronJobPayload) => Promise<any>;
  previewData?: boolean;
};

export const CronJobForm: React.FunctionComponent<Props> = (props) => {
  const [input, setInput] = useState<CronJobInputData>(
    props.initialData ? pickInput(props.initialData) : initialState
  );
  const [errors, setErrors] = useState<CronJobInputErrors>({});
  const [acknowledged, setAcknowledged] = useState(false);
  const [serverResult, setServerResult] = useState<SecurityCheckResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef<ScriptEditorHandle>(null);
  const navigate = useNavigate();
  const settings = useSettings();

  const validation = useScriptValidation(input.script, {
    enabled: settings.securityCheck && !props.previewData,
  });
  const securityResult = serverResult ?? validation.result;
  const hasErrors = (securityResult?.errors ?? 0) > 0;
  // Warnings were already acknowledged when an existing script was saved; only a
  // new or changed script needs a fresh acknowledgement (mirrors the server rule).
  const scriptChanged = !props.initialData || input.script !== (props.initialData.script ?? '');
  const hasWarnings = (securityResult?.warnings ?? 0) > 0;
  const needsAcknowledgement = hasWarnings && !hasErrors && scriptChanged;

  function handleInputChange(e: any) {
    const { name, value } = e.target;
    setInput((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function handleScriptChange(script: string) {
    setInput((current) => ({ ...current, script }));
    setErrors((current) => ({ ...current, script: undefined }));
    setServerResult(null);
    setAcknowledged(false);
  }

  function handleDateChange(inputName: string, value: Date) {
    if (!value) return;
    if (inputName === 'startDate') value.setHours(0, 0, 0, 0);
    if (inputName === 'endDate') value.setHours(23, 59, 59, 999);
    handleInputChange({
      target: { name: inputName, value: value.toISOString() },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await props.handleSubmit({ ...input, acknowledgeWarnings: acknowledged });
    } catch (error: any) {
      if (error instanceof ApiError && error.name === 'ValidationError') {
        const fieldErrors: Record<string, string> = {};
        (error.details.errors ?? []).forEach(({ path: [name], message }) => {
          fieldErrors[name] = message;
        });
        setErrors(fieldErrors);
      } else if (error instanceof ApiError && error.name === 'SecurityCheckError') {
        const findings = error.details.findings ?? [];
        const errorCount = findings.filter((finding) => finding.severity === 'error').length;
        setServerResult({
          enabled: true,
          passed: errorCount === 0,
          errors: errorCount,
          warnings: findings.length - errorCount,
          findings,
        });
        setSubmitError(error.message);
      } else {
        setSubmitError(error?.message ?? 'Something went wrong while saving the cron job.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const today = new Date();
  const preview = Boolean(props.previewData);

  return (
    <form onSubmit={handleSubmit} noValidate={false}>
      {submitError && (
        <Box marginBottom={5}>
          <Alert
            variant="danger"
            title="Could not save"
            closeLabel="Close"
            onClose={() => setSubmitError(null)}
          >
            {submitError}
          </Alert>
        </Box>
      )}

      <FormField name="name" label="Name" error={errors['name']}>
        <TextInput
          placeholder="Cron job name"
          name="name"
          onChange={handleInputChange}
          value={input.name}
          required
          disabled={preview}
        />
      </FormField>

      <FormField name="schedule" label="Schedule" error={errors['schedule']}>
        <TextInput
          placeholder="Cron job schedule expression"
          required
          name="schedule"
          value={input.schedule}
          onChange={handleInputChange}
          disabled={preview}
        />
      </FormField>

      <FormField
        name="startDate"
        label="Start date"
        hint="Publish on this date"
        error={errors['startDate']}
      >
        {preview ? (
          <Field.Input
            disabled
            startAction={<Calendar />}
            value={getDateAndTimeString(input.startDate)}
          />
        ) : (
          <DatePicker
            id="startDate"
            initialDate={mapLocalDateToUTC(input.startDate)}
            onChange={(value: any) => handleDateChange('startDate', value)}
            required
            minDate={props.initialData ? undefined : mapLocalDateToUTC(today.toISOString())}
          />
        )}
      </FormField>

      <FormField
        name="endDate"
        label="End date"
        hint="Unpublish on this date"
        error={errors['endDate']}
      >
        {preview ? (
          <Field.Input
            disabled
            startAction={<Calendar />}
            value={getDateAndTimeString(input.endDate)}
          />
        ) : (
          <DatePicker
            id="endDate"
            initialDate={mapLocalDateToUTC(input.endDate)}
            onChange={(value: any) => handleDateChange('endDate', value)}
            required
            minDate={mapLocalDateToUTC(today.toISOString())}
          />
        )}
      </FormField>

      <FormField
        name="iterationsLimit"
        label="Iterations limit"
        hint="Unlimited when set to -1"
        error={errors['iterationsLimit']}
      >
        <NumberInput
          id="iterationsLimit"
          placeholder="Number of iterations"
          onValueChange={(value: any) =>
            handleInputChange({
              target: { name: 'iterationsLimit', value },
            })
          }
          value={input.iterationsLimit}
          disabled={preview}
          required
        />
      </FormField>

      <FormField
        name="script"
        label="Script"
        width="100%"
        error={errors['script']}
        hint="Runs as the body of an async function with `strapi`, `cronJob` and `console` in scope."
      >
        <ScriptEditor
          ref={editorRef}
          value={input.script}
          onChange={handleScriptChange}
          readOnly={preview}
          highlight={settings.syntaxHighlighting}
          findings={securityResult?.findings ?? []}
          footer={
            !preview && (
              <SecurityFindings
                result={securityResult}
                isValidating={!serverResult && validation.isValidating}
                onSelect={(finding) => editorRef.current?.focusAt(finding.line, finding.column)}
              />
            )
          }
        />
      </FormField>

      {!preview && needsAcknowledgement && (
        <Box marginBottom={5}>
          <Checkbox
            name="acknowledgeWarnings"
            checked={acknowledged}
            onCheckedChange={(checked: boolean) => setAcknowledged(checked === true)}
          >
            I reviewed the security warnings above and want to save this script anyway
          </Checkbox>
          <Typography variant="pi" textColor="neutral600">
            Your acknowledgement is recorded in the audit log.
          </Typography>
        </Box>
      )}

      {!preview && (
        <Flex gap={5} marginTop={5}>
          <Button
            size="L"
            type="submit"
            loading={isSubmitting}
            disabled={hasErrors || (needsAcknowledgement && !acknowledged)}
          >
            Save
          </Button>
          <Button size="L" variant="tertiary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </Flex>
      )}
    </form>
  );
};

export const CronJobFormView = ({ data }: { data: CronJob }) => {
  return <CronJobForm previewData handleSubmit={() => Promise.resolve()} initialData={data} />;
};
