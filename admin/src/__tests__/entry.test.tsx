import { render, screen } from '@testing-library/react';
import plugin from '../index';
import { allPluginPermissions, pluginPermissions } from '../permissions';
import { Initializer } from '../components/Initializer';
import { PluginIcon } from '../components/PluginIcon';
import { formatUser } from '../utils/user';
import { getCurrentDate, getDateAndTimeString, getDateString, getTomorrowDate, mapLocalDateToUTC } from '../utils/date';
import { getTranslation } from '../utils/getTranslation';
import { PageLayout } from '../components/PageLayout';
import { renderWithProviders } from './render';

describe('admin entry', () => {
  it('registers a menu link gated by the read permission', async () => {
    const app = { addMenuLink: jest.fn(), registerPlugin: jest.fn() };
    plugin.register(app);
    const link = app.addMenuLink.mock.calls[0][0];
    expect(link.to).toBe('plugins/strapi-plugin-cron');
    expect(link.permissions).toEqual([{ action: 'plugin::strapi-plugin-cron.read', subject: null }]);
    expect(app.registerPlugin).toHaveBeenCalledWith(expect.objectContaining({ id: 'strapi-plugin-cron' }));
    const module = await link.Component();
    expect(module.default).toBeDefined();
  });

  it('loads translations and tolerates missing locales', async () => {
    const result = await plugin.registerTrads({ locales: ['en', 'xx'] });
    expect(result).toEqual([
      { data: expect.any(Object), locale: 'en' },
      { data: {}, locale: 'xx' },
    ]);
  });

  it('exposes one permission per action', () => {
    expect(Object.keys(pluginPermissions)).toEqual(['read', 'create', 'update', 'delete', 'trigger']);
    expect(allPluginPermissions).toHaveLength(5);
  });

  it('initializer reports readiness', () => {
    const setPlugin = jest.fn();
    render(<Initializer setPlugin={setPlugin} />);
    expect(setPlugin).toHaveBeenCalledWith('strapi-plugin-cron');
    renderWithProviders(<PluginIcon />);
  });
});

describe('utils', () => {
  it('formats users by name, username, email or id', () => {
    expect(formatUser(null)).toBe('—');
    expect(formatUser({ id: 1, firstname: 'A', lastname: 'B', username: null, email: null })).toBe('A B');
    expect(formatUser({ id: 1, firstname: null, lastname: null, username: 'u', email: null })).toBe('u');
    expect(formatUser({ id: 1, firstname: null, lastname: null, username: null, email: 'e@x' })).toBe('e@x');
    expect(formatUser({ id: 3, firstname: null, lastname: null, username: null, email: null })).toBe('User #3');
  });

  it('formats dates', () => {
    expect(getDateString(null)).toBe('—');
    expect(getDateAndTimeString(null)).toBe('—');
    expect(getDateString('2026-10-01T00:00:00.000Z')).toContain('2026');
    expect(getDateAndTimeString('2026-10-01T00:00:00.000Z')).toContain('2026');
    expect(typeof getCurrentDate()).toBe('string');
    expect(getTomorrowDate().getTime()).toBeGreaterThan(Date.now());
    expect(mapLocalDateToUTC('2026-10-01T00:00:00.000Z')).toBeInstanceOf(Date);
    expect(getTranslation('x')).toBe('strapi-plugin-cron.x');
  });
});

describe('PageLayout', () => {
  it('shows a back link away from the plugin home', () => {
    const back = jest.spyOn(window.history, 'back').mockImplementation(() => {});
    renderWithProviders(<PageLayout title="Child page">content</PageLayout>);
    const link = document.querySelector('a');
    link?.click();
    expect(back).toHaveBeenCalled();
    back.mockRestore();
  });
});
