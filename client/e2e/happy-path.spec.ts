import { expect, test } from '@playwright/test';
import { axeViolations } from './helpers';

test.describe('critical journey: discover, plan, ask the assistant', () => {
  test('finds a course, adds it to the plan, and gets an editable plan draft from the assistant', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back');
    await expect(page.getByRole('heading', { name: 'Recommended next skill' })).toBeVisible();

    // Discover: search and filter the Upskilling Store.
    await page.getByRole('link', { name: 'Learning', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Upskilling Store' })).toBeVisible();
    await page.getByLabel('Search courses').fill('docker');
    await expect(
      page.getByRole('status').filter({ hasText: /Showing 1 of 1 course/ }),
    ).toBeVisible();
    const card = page.getByRole('article', { name: 'Docker for Developers' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('% course relevance');

    // Add to plan (remove first if a previous run left it there).
    const remove = card.getByRole('button', { name: /^Remove .* from plan$/ });
    if (await remove.isVisible()) {
      await remove.click();
      await expect(card.getByRole('button', { name: /^Add .* to plan$/ })).toBeVisible();
    }
    await card.getByRole('button', { name: 'Add Docker for Developers to plan' }).click();
    await expect(
      card.getByRole('button', { name: 'Remove Docker for Developers from plan' }),
    ).toBeVisible();

    // The plan page shows it.
    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My learning plan' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Docker for Developers' })).toBeVisible();
    await expect(page.getByText('Progress shows how far through this plan you are')).toBeVisible();

    // Ask the mock assistant for a four-week plan.
    await page.getByRole('link', { name: 'Assistant', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Bench Assistant' })).toBeVisible();
    await page.getByRole('button', { name: 'Create a four-week learning plan' }).first().click();
    const draft = page.getByRole('region', { name: 'Draft plan (not saved yet)' });
    await expect(draft).toBeVisible();
    await expect(page.getByRole('log')).toContainText('draft four-week plan');

    // Edit the draft before saving: rename it and remove the first course.
    await draft.getByLabel('Plan title').fill('My e2e plan');
    const countBefore = await draft.getByRole('listitem').count();
    await draft
      .getByRole('button', { name: /^Remove .* from the draft$/ })
      .first()
      .click();
    await expect(draft.getByRole('listitem')).toHaveCount(countBefore - 1);

    await draft.getByRole('button', { name: 'Save as my plan' }).click();
    await expect(draft).toBeHidden();

    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My e2e plan' })).toBeVisible();
  });

  test('answers a question with readable references and an honest fallback', async ({ page }) => {
    await page.goto('/assistant');
    await page.getByLabel('Ask the Bench Assistant').fill('What should I learn next?');
    await page.getByRole('button', { name: 'Send' }).click();
    const log = page.getByRole('log');
    await expect(log).toContainText('Consider focusing on');
    await expect(log).toContainText('Based on:');

    await page.getByLabel('Ask the Bench Assistant').fill('Who will win the football match?');
    await page.keyboard.press('Enter');
    await expect(log).toContainText("I don't have approved information");
  });

  test('shows a friendly not-found page', async ({ page }) => {
    await page.goto('/this/does/not/exist');
    await expect(page.getByRole('heading', { name: "We can't find that page" })).toBeVisible();
    await page.getByRole('link', { name: 'Go to dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test.describe('roles', () => {
  test('hides admin navigation from employees and redirects admin URLs', async ({ page }) => {
    await page.goto('/admin/courses');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('link', { name: 'Courses', exact: true })).toHaveCount(0);
  });

  test('lets an admin create and delete a course', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('radio', { name: 'Admin' }).check({ force: true });
    await page.getByRole('link', { name: 'Courses', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Course administration' })).toBeVisible();

    await page.getByRole('button', { name: 'New course' }).click();
    await page.getByLabel('Title').fill('E2E Sample Course');
    await page.getByLabel('Provider').fill('Synthetic Learning Hub');
    await page.getByLabel('Duration (hours)').fill('3');
    await page.getByLabel('Description').fill('A short course created by the end-to-end test.');
    await page.getByRole('combobox', { name: 'Skills taught' }).click();
    await page.getByRole('option', { name: 'Docker' }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Save course' }).click();
    await expect(page.getByRole('row', { name: /E2E Sample Course/ })).toBeVisible();

    await page.getByRole('button', { name: 'Delete E2E Sample Course' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('row', { name: /E2E Sample Course/ })).toHaveCount(0);
  });
});

test.describe('accessibility (axe-core in a real browser, including colour contrast)', () => {
  for (const path of [
    '/dashboard',
    '/learning',
    '/learning/react-fundamentals',
    '/plan',
    '/assistant',
    '/profile',
  ]) {
    test(`no violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.waitForLoadState('networkidle');
      expect(await axeViolations(page)).toEqual([]);
    });
  }
});

test.describe('accessibility of admin screens', () => {
  for (const path of ['/admin/courses', '/admin/demand']) {
    test(`no violations on ${path}`, async ({ page }) => {
      // The mock role is a public dev setting stored in localStorage (see MockAuthService).
      await page.addInitScript(() => localStorage.setItem('benchflow.mockRole', 'admin'));
      await page.goto(path);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.waitForLoadState('networkidle');
      expect(await axeViolations(page)).toEqual([]);
    });
  }
});

test.describe('responsive layout', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('keeps navigation reachable on a phone and avoids horizontal scrolling', async ({
    page,
  }) => {
    await page.goto('/learning');
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav).toBeVisible();
    const box = await nav.boundingBox();
    expect(box && box.y > 600).toBe(true);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
