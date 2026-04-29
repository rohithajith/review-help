import {
  buildShortTemplatePageUrl,
  buildTemplatePageUrl,
  decodeBusinessShortCode,
  encodeBusinessShortCode,
  resolveBusinessIdFromShortCode,
} from './templateShare';

describe('templateShare utils', () => {
  test('encodes and decodes base36 business ids', () => {
    expect(encodeBusinessShortCode(1)).toBe('1');
    expect(encodeBusinessShortCode(35)).toBe('z');
    expect(encodeBusinessShortCode(36)).toBe('10');
    expect(decodeBusinessShortCode('10')).toBe(36);
  });

  test('rejects invalid short codes', () => {
    expect(decodeBusinessShortCode('')).toBeNull();
    expect(decodeBusinessShortCode('@@@')).toBeNull();
    expect(decodeBusinessShortCode('0001')).toBeNull();
    expect(resolveBusinessIdFromShortCode('@@@')).toBeNull();
  });

  test('builds template and short URLs with production origin', () => {
    expect(buildTemplatePageUrl(42, { isProd: true })).toBe('https://reviewhelp.uk/#/business/42');
    expect(buildShortTemplatePageUrl(42, { isProd: true })).toBe('https://reviewhelp.uk/#/b/16');
  });

  test('builds URLs with current origin in non-production mode', () => {
    expect(buildTemplatePageUrl(7, { isProd: false, origin: 'http://localhost:5173/' })).toBe('http://localhost:5173/#/business/7');
    expect(buildShortTemplatePageUrl(7, { isProd: false, origin: 'http://localhost:5173/' })).toBe('http://localhost:5173/#/b/7');
  });
});
