import { Page } from '@strapi/strapi/admin';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { pluginPermissions } from '../permissions';
import { EditCronJobPage } from './EditCronJobPage';
import { HomePage } from './HomePage';
import { NewCronJobPage } from './NewCronJobPage';
import { ViewCronJobPage } from './ViewCronJobPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Page.Protect permissions={pluginPermissions.read}>
        <Routes>
          <Route index element={<HomePage />} />
          <Route
            path={`/cron-jobs/create`}
            element={
              <Page.Protect permissions={pluginPermissions.create}>
                <NewCronJobPage />
              </Page.Protect>
            }
          />
          <Route
            path={`/cron-jobs/edit/:documentId`}
            element={
              <Page.Protect permissions={pluginPermissions.update}>
                <EditCronJobPage />
              </Page.Protect>
            }
          />
          <Route path={`/cron-jobs/:documentId`} element={<ViewCronJobPage />} />
          <Route path="*" element={<Page.Error />} />
        </Routes>
      </Page.Protect>
    </QueryClientProvider>
  );
};

export default App;
