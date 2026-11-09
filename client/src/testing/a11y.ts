import axe from 'axe-core';

/**
 * Run axe-core against rendered markup. Colour contrast and page-level landmark rules are
 * skipped because jsdom has no layout engine; contrast is checked manually (see client/README.md).
 */
export async function expectNoA11yViolations(element: HTMLElement): Promise<void> {
  const results = await axe.run(element, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  expect(
    results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.html).join(' | ')})`),
  ).toEqual([]);
}
