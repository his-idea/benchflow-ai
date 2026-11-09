import AxeSource from 'axe-core';
import type { Page } from '@playwright/test';

/** Run axe-core inside the real browser, including colour contrast. */
export async function axeViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AxeSource.source });
  const results = await page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await (window as any).axe.run(document, { resultTypes: ['violations'] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return r.violations.map(
      (v: any) =>
        `${v.id} (${v.impact}): ${v.help} -> ${v.nodes
          .slice(0, 2)
          .map((n: any) => n.target.join(' '))
          .join(' | ')}`,
    );
  });
  return results as string[];
}
