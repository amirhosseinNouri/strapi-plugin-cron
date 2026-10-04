import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { ApiError } from '../api/cron';
import { CronJobForm, CronJobFormView } from '../components/CronJobForm';
import { VALIDATION_DEBOUNCE_MS } from '../hooks/useScriptValidation';
import { mockEditor } from './mocks/react-codemirror';
import { mockState } from './mocks/strapi-admin';
import { cleanResult, errorResult, fixtureJob, renderWithProviders, warningResult } from './render';

const { fetchClient } = mockState;

const respond = ({
  settings = { securityCheck: true, syntaxHighlighting: true },
  validation = cleanResult,
}: { settings?: object; validation?: object } = {}) => {
  fetchClient.get.mockImplementation(async (url: string) => {
    if (url.endsWith('/settings')) return { data: settings };
    throw new Error(`unexpected GET ${url}`);
  });
  fetchClient.post.mockImplementation(async (url: string) => {
    if (url.endsWith('/validate-script')) return { data: validation };
    throw new Error(`unexpected POST ${url}`);
  });
};

const flushValidation = async () => {
  await act(async () => {
    jest.advanceTimersByTime(VALIDATION_DEBOUNCE_MS);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  Object.values(fetchClient).forEach((fn) => fn.mockReset());
});
afterEach(() => jest.useRealTimers());

const save = () => screen.getByRole('button', { name: 'Save' });

describe('CronJobForm', () => {
  it('has no file-mode inputs anymore', () => {
    respond();
    renderWithProviders(<CronJobForm handleSubmit={jest.fn()} />);
    expect(screen.queryByText(/Execute script from a file/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Path to script file/)).not.toBeInTheDocument();
    expect(screen.getByTestId('codemirror')).toBeInTheDocument();
  });

  it('submits the form data with the acknowledgement flag', async () => {
    respond();
    const handleSubmit = jest.fn().mockResolvedValue({});
    renderWithProviders(<CronJobForm handleSubmit={handleSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('Cron job name'), { target: { name: 'name', value: 'Job' } });
    fireEvent.change(screen.getByPlaceholderText('Cron job schedule expression'), {
      target: { name: 'schedule', value: '* * * * *' },
    });
    fireEvent.change(screen.getByTestId('codemirror'), { target: { value: 'console.log(2)' } });
    await flushValidation();
    await act(async () => {
      fireEvent.click(save());
    });
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Job', schedule: '* * * * *', script: 'console.log(2)', acknowledgeWarnings: false })
    );
  });

  it('shows live errors and blocks saving', async () => {
    respond({ validation: errorResult });
    renderWithProviders(<CronJobForm handleSubmit={jest.fn()} />);
    await flushValidation();
    expect(await screen.findByText(/Accessing process is not allowed/)).toBeInTheDocument();
    expect(save()).toBeDisabled();
    fireEvent.click(screen.getByText(/Accessing process is not allowed/));
    expect(mockEditor.view!.state.selection.main.head).toBe(0);
  });

  it('requires acknowledging warnings before saving', async () => {
    respond({ validation: warningResult });
    const handleSubmit = jest.fn().mockResolvedValue({});
    renderWithProviders(<CronJobForm handleSubmit={handleSubmit} />);
    await flushValidation();
    expect(await screen.findByText(/fetch\(\) sends data/)).toBeInTheDocument();
    expect(save()).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I reviewed the security warnings/ }));
    expect(save()).toBeEnabled();
    await act(async () => {
      fireEvent.click(save());
    });
    expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({ acknowledgeWarnings: true }));
  });

  it('resets the acknowledgement when the script changes', async () => {
    respond({ validation: warningResult });
    renderWithProviders(<CronJobForm handleSubmit={jest.fn()} />);
    await flushValidation();
    fireEvent.click(await screen.findByRole('checkbox', { name: /I reviewed/ }));
    fireEvent.change(screen.getByTestId('codemirror'), { target: { value: 'fetch(x)' } });
    await flushValidation();
    expect(await screen.findByRole('checkbox', { name: /I reviewed/ })).not.toBeChecked();
  });

  it('does not ask again for unchanged scripts of existing jobs', async () => {
    respond({ validation: warningResult });
    renderWithProviders(<CronJobForm initialData={fixtureJob()} handleSubmit={jest.fn()} />);
    await flushValidation();
    await screen.findByText(/fetch\(\) sends data/);
    expect(screen.queryByRole('checkbox', { name: /I reviewed/ })).not.toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it('renders server security findings after a rejected save', async () => {
    respond({ settings: { securityCheck: true, syntaxHighlighting: true }, validation: cleanResult });
    const handleSubmit = jest.fn().mockRejectedValue(
      new ApiError('SecurityCheckError', 'The script failed the security check.', 422, {
        findings: errorResult.findings as any,
      })
    );
    renderWithProviders(<CronJobForm handleSubmit={handleSubmit} />);
    await flushValidation();
    await act(async () => {
      fireEvent.click(save());
    });
    expect(screen.getByText('The script failed the security check.')).toBeInTheDocument();
    expect(screen.getByText(/Accessing process is not allowed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('The script failed the security check.')).not.toBeInTheDocument();
  });

  it('handles server findings without details', async () => {
    respond();
    const handleSubmit = jest.fn().mockRejectedValue(new ApiError('SecurityCheckError', 'Rejected', 422, {}));
    renderWithProviders(<CronJobForm handleSubmit={handleSubmit} />);
    await flushValidation();
    await act(async () => {
      fireEvent.click(save());
    });
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('maps validation errors onto fields', async () => {
    respond();
    const handleSubmit = jest.fn().mockRejectedValue(
      new ApiError('ValidationError', 'ValidationError', 400, {
        errors: [{ path: ['name'], message: 'This field is required' }],
      })
    );
    renderWithProviders(<CronJobForm handleSubmit={handleSubmit} />);
    await flushValidation();
    await act(async () => {
      fireEvent.click(save());
    });
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Cron job name'), { target: { name: 'name', value: 'x' } });
    expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
  });

  it('handles validation errors without details', async () => {
    respond();
    const handleSubmit = jest.fn().mockRejectedValue(new ApiError('ValidationError', 'ValidationError', 400, {}));
    renderWithProviders(<CronJobForm handleSubmit={handleSubmit} />);
    await act(async () => {
      fireEvent.click(save());
    });
    expect(screen.queryByText('Could not save')).not.toBeInTheDocument();
  });

  it('shows unexpected errors', async () => {
    respond();
    renderWithProviders(<CronJobForm handleSubmit={jest.fn().mockRejectedValue(new Error('Server exploded'))} />);
    await act(async () => {
      fireEvent.click(save());
    });
    expect(screen.getByText('Server exploded')).toBeInTheDocument();
  });

  it('shows a generic message for errors without a message', async () => {
    respond();
    renderWithProviders(<CronJobForm handleSubmit={jest.fn().mockRejectedValue({})} />);
    await act(async () => {
      fireEvent.click(save());
    });
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  });

  it('falls back to a textarea when highlighting is disabled', async () => {
    respond({ settings: { securityCheck: false, syntaxHighlighting: false } });
    renderWithProviders(<CronJobForm handleSubmit={jest.fn()} />);
    await waitFor(() => expect(screen.queryByTestId('codemirror')).not.toBeInTheDocument());
    await flushValidation();
    expect(fetchClient.post).not.toHaveBeenCalled();
  });

  it('updates the iterations limit', () => {
    respond();
    renderWithProviders(<CronJobForm handleSubmit={jest.fn()} />);
    const input = screen.getByPlaceholderText('Number of iterations');
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('5');
  });

  it('navigates back on cancel', () => {
    respond();
    renderWithProviders(<CronJobForm handleSubmit={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('renders a read-only preview without validation or buttons', async () => {
    respond();
    renderWithProviders(<CronJobFormView data={fixtureJob({ script: undefined })} />);
    await flushValidation();
    expect(fetchClient.post).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Cron job name')).toBeDisabled();
  });
});
