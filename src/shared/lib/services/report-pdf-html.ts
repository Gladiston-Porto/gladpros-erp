/**
 * Report PDF Generation via Playwright
 *
 * Renders a report print page in a headless browser
 * and generates a PDF that is pixel-perfect identical to the screen layout.
 */
import { chromium } from 'playwright';

interface GenerateOptions {
  /** Path to the print page (e.g. /reports/invoices) */
  printPath: string;
  /** Base URL of the running Next.js server (e.g. http://localhost:3000) */
  baseUrl: string;
  /** Query string to forward (filters, search params) */
  queryString?: string;
  /** Cookie header to forward authentication */
  cookie?: string;
}

/**
 * Generates a PDF buffer by rendering a report print page.
 */
export async function generateReportPDFFromHTML(
  options: GenerateOptions,
): Promise<Buffer> {
  const { printPath, baseUrl, cookie, queryString } = options;
  const qs = queryString ? `?${queryString}` : '';
  const url = `${baseUrl}${printPath}${qs}`;

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();

    if (cookie) {
      const cookies = parseCookieHeader(cookie, baseUrl);
      if (cookies.length > 0) {
        await context.addCookies(cookies);
      }
    }

    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    // Hide the print button before generating PDF
    await page.evaluate(() => {
      const btn = document.querySelector('.print-note') as HTMLElement | null;
      if (btn) btn.style.display = 'none';
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    await context.close();

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

/**
 * Parse a raw Cookie header string into Playwright cookie objects.
 */
function parseCookieHeader(
  cookieHeader: string,
  baseUrl: string,
): Array<{
  name: string;
  value: string;
  domain: string;
  path: string;
}> {
  const urlObj = new URL(baseUrl);
  return cookieHeader
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const eqIdx = c.indexOf('=');
      if (eqIdx === -1) return null;
      return {
        name: c.substring(0, eqIdx),
        value: c.substring(eqIdx + 1),
        domain: urlObj.hostname,
        path: '/',
      };
    })
    .filter(Boolean) as Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
  }>;
}
