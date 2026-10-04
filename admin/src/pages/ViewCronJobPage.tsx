import { Box, Typography } from '@strapi/design-system';
import { Page } from '@strapi/strapi/admin';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useCronApi } from '../api/cron';
import { ContentBlock } from '../components/ContentBlock';
import { CronJobFormView } from '../components/CronJobForm';
import { DataField } from '../components/DataField';
import { NotFound } from '../components/NotFound';
import { PageLayout } from '../components/PageLayout';
import { ScriptEditor } from '../components/ScriptEditor';
import { getDateAndTimeString } from '../utils/date';
import { formatUser } from '../utils/user';

export const ViewCronJobPage: React.FunctionComponent = () => {
  const { documentId = '' } = useParams();
  const api = useCronApi();
  const { isPending, data: cronJob } = useQuery({
    queryKey: ['cronJob', documentId],
    queryFn: () => api.getCronJob(documentId),
  });

  if (isPending) return <Page.Loading />;

  if (!cronJob) return <NotFound />;

  return (
    <PageLayout title={cronJob.name}>
      <ContentBlock>
        <CronJobFormView data={cronJob} />
        <Box marginBottom={8} marginTop={8}>
          <Typography variant="beta">Details</Typography>
        </Box>
        <DataField
          label="Iterations count"
          value={`${cronJob.iterationsCount} / ${cronJob.iterationsLimit}`}
        />
        <DataField label="Created by" value={formatUser(cronJob.createdBy)} />
        <DataField
          label="Created at"
          value={getDateAndTimeString(cronJob.createdAt)}
          type={'date'}
        />
        <DataField label="Last updated by" value={formatUser(cronJob.updatedBy)} />
        <DataField
          label="Updated at"
          value={getDateAndTimeString(cronJob.updatedAt)}
          type={'date'}
        />
        <DataField
          label="Published at"
          value={getDateAndTimeString(cronJob.publicationDate)}
          type={'date'}
        />
        <Box marginBottom={4} marginTop={8}>
          <Typography variant="beta">Latest execution log</Typography>
        </Box>
        <ScriptEditor
          label="Latest execution log"
          name="latestExecutionLog"
          value={cronJob.latestExecutionLog?.map((line) => line.join(' ')).join('\n') ?? ''}
          readOnly
          highlight={false}
        />
      </ContentBlock>
    </PageLayout>
  );
};
