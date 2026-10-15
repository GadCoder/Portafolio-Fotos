import { describe, expect, it } from 'vitest';
import { rewriteAdminApiPath } from '../lib/proxy';

describe('development API proxy', () => {
  it('maps the same-origin admin path to the API route without losing the suffix', () => {
    expect(rewriteAdminApiPath('/admin-api/session')).toBe('/admin/api/session');
    expect(rewriteAdminApiPath('/admin-api/photos/7/presentation')).toBe('/admin/api/photos/7/presentation');
  });
});
