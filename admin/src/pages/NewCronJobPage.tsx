import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { pluginBasePath } from '../../../utils/plugin';
import { useCronApi, type CronJobPayload } from '../api/cron';
import { ContentBlock } from '../components/ContentBlock';
import { CronJobForm } from '../components/CronJobForm';
import { PageLayout } from '../components/PageLayout';

export const NewCronJobPage: React.FunctionComponent = () => {
  const navigate = useNavigate();
  const api = useCronApi();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: api.createNewCronJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronJobs'] });
      navigate(pluginBasePath);
    },
  });

  return (
    <PageLayout title="New Cron Job">
      <ContentBlock>
        <CronJobForm handleSubmit={(data: CronJobPayload) => mutation.mutateAsync(data)} />
      </ContentBlock>
    </PageLayout>
  );
};
