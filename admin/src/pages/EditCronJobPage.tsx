import { Page } from '@strapi/strapi/admin';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { pluginBasePath } from '../../../utils/plugin';
import { useCronApi, type CronJobPayload } from '../api/cron';
import { ContentBlock } from '../components/ContentBlock';
import { CronJobForm } from '../components/CronJobForm';
import { NotFound } from '../components/NotFound';
import { PageLayout } from '../components/PageLayout';

export const EditCronJobPage: React.FunctionComponent = () => {
  const { documentId = '' } = useParams();
  const navigate = useNavigate();
  const api = useCronApi();
  const { isPending, data: cronJob } = useQuery({
    queryKey: ['cronJob', documentId],
    queryFn: () => api.getCronJob(documentId),
  });
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: api.updateCronJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronJob', documentId] });
      queryClient.invalidateQueries({ queryKey: ['cronJobs'] });
      navigate(pluginBasePath);
    },
  });

  if (isPending) return <Page.Loading />;

  if (!cronJob) return <NotFound />;

  return (
    <PageLayout title="Edit Cron Job">
      <ContentBlock>
        <CronJobForm
          initialData={cronJob}
          handleSubmit={(data: CronJobPayload) => mutation.mutateAsync({ documentId, data })}
        />
      </ContentBlock>
    </PageLayout>
  );
};
