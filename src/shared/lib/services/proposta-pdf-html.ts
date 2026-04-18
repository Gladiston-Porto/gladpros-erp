/**
 * Proposta PDF Generation via Playwright
 *
 * Renders the print page (/propostas/[id]/print) in a headless browser
 * and generates a PDF that is pixel-perfect identical to the screen layout.
 */
import { chromium } from 'playwright';

interface GenerateOptions {
  propostaId: number;
  /** Base URL of the running Next.js server (e.g. http://localhost:3000) */
  baseUrl: string;
  /** Cookie header to forward authentication */
  cookie?: string;
}

/**
 * Generates a PDF buffer by rendering the proposta print page.
 */
export async function generatePropostaPDFFromHTML(
  options: GenerateOptions,
): Promise<Buffer> {
  const { propostaId, baseUrl, cookie } = options;
  const url = `${baseUrl}/propostas/${propostaId}/print`;

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();

    // Forward auth cookie so the print page loads even for protected routes
    if (cookie) {
      const cookies = parseCookieHeader(cookie, baseUrl);
      if (cookies.length > 0) {
        await context.addCookies(cookies);
      }
    }

    const page = await context.newPage();

    // Navigate and wait for full render (network idle = all images/fonts loaded)
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    // Hide the print button before generating PDF
    await page.evaluate(() => {
      const btn = document.querySelector('.print-note') as HTMLElement | null;
      if (btn) btn.style.display = 'none';
    });

    // Generate PDF matching the A4 layout from the CSS
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
