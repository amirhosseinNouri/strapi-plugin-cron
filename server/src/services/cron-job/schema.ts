import { z } from 'zod';

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const datePreprocess = (arg: unknown) => {
  if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
};

const cronExpressionRegex = /(((\d+,)+\d+|(\d+(\/|-)\d+)|\d+|\*) ?){5,7}/;

const REQUIRED = 'This field is required';
const PAST_DATE = "This date can't be in the past";

/**
 * On update, the start date may already be in the past (the job has been running);
 * only new jobs must start today or later.
 */
export const createCronJobSchema = ({ isUpdate = false }: { isUpdate?: boolean } = {}) =>
  z
    .object({
      name: z.string().trim().min(1, { message: REQUIRED }),
      schedule: z.string().min(1, { message: REQUIRED }).regex(cronExpressionRegex, {
        message: 'This value must be a valid cron expression',
      }),
      script: z.string({ required_error: REQUIRED }).refine((value) => value.trim().length > 0, {
        message: REQUIRED,
      }),
      iterationsLimit: z
        .number()
        .int()
        .min(-1, { message: 'This value must be greater than or equal to -1' }),
      startDate: z.preprocess(
        datePreprocess,
        isUpdate
          ? z.date({ required_error: REQUIRED })
          : z.date({ required_error: REQUIRED }).min(startOfToday(), { message: PAST_DATE })
      ),
      endDate: z.preprocess(
        datePreprocess,
        z.date({ required_error: REQUIRED }).min(startOfToday(), { message: PAST_DATE })
      ),
    })
    .superRefine((data, ctx) => {
      if (data.startDate && data.endDate && data.endDate < data.startDate) {
        ctx.addIssue({
          path: ['endDate'],
          code: z.ZodIssueCode.custom,
          message: 'End date cannot be earlier than start date',
        });
      }
    });

export const CronJobSchema = createCronJobSchema();
