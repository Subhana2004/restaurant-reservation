const { test, expect } = require("@playwright/test");
const base = "http://127.0.0.1:8765/v3";

test("a visitor can plan, discover, shortlist, compare, and book a demo table", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await expect(page.locator(".editorial-steps")).toBeVisible();
  await expect(page.locator(".hero-photo-caption")).toBeVisible();
  await expect(page.locator(".hero-cta")).toHaveCSS("background-color", "rgb(216, 237, 145)");
  await expect(page.locator(".reservation-dock #search-form")).toBeVisible();
  await expect(page.locator("#hero-title .headline-top")).toHaveCSS("font-family", /Instrument Serif/);
  await expect(page.locator("#hero-title .headline-bottom")).toHaveCSS("font-family", /Manrope/);
  await expect(page.locator(".reservation-dock .booking-heading h2")).toHaveCSS("font-family", /Instrument Serif/);
  await expect(page.locator(".workspace-content .hero")).toHaveCSS("background-color", "rgb(23, 60, 45)");
  await expect(page.locator("#hero-plan-party")).toHaveText("2 people");
  await expect(page.locator(".restaurant-card").first()).toHaveCSS("display", "grid");
  await expect(page.locator(".workspace-tab.is-current")).toHaveCSS("background-color", "rgb(216, 237, 145)");
  await expect(page.locator(".hero-cta")).toHaveCSS("background-color", "rgb(216, 237, 145)");
  await expect(page.locator(".hero-photo-caption .caption-badge")).toHaveCSS("background-color", "rgb(23, 60, 45)");
  await expect(page.locator(".workspace-content .restaurant-card:first-child .card-main")).toHaveCSS("background-color", "rgb(237, 243, 230)");
  await expect(page.locator(".journey-rail")).toBeHidden();
  await expect(page.locator(".coach-rail")).toBeHidden();
  await expect(page.locator(".hero-plate")).toHaveAttribute("src", /images.unsplash.com/);
  await expect(page.locator("#restaurant-grid .restaurant-card")).toHaveCount(3);
  await expect(page.locator(".restaurant-card .photo-open")).toHaveCount(3);
  await expect(page.locator(".restaurant-card .card-image img").first()).toHaveAttribute("alt", /pasta/i);
  await page.screenshot({ path: "mesa-v9-first-fold.png" });

  await page.locator('[data-party="4"]').click();
  await expect(page.locator("#coach-guests")).toHaveText("4 people");
  await expect(page.locator("#hero-plan-party")).toHaveText("4 people");
  await expect(page.locator("#hero-plan-date")).toContainText("UTC");
  await expect(page.locator("#availability-note")).toContainText("4 guests");

  await page.locator('[data-vibe="comfort"]').click();
  await expect(page.locator("#restaurant-grid .restaurant-card")).toHaveCount(1);
  await expect(page.locator("#restaurant-grid")).toContainText("The Spice Table");
  await page.locator('[data-vibe="all"]').click();
  await expect(page.locator("#restaurant-grid .restaurant-card")).toHaveCount(3);

  await page.locator(".restaurant-card [data-favorite]").first().click();
  await page.locator('[data-filter="saved"]').click();
  await expect(page.locator("#restaurant-grid .restaurant-card")).toHaveCount(1);
  await page.locator('[data-filter="all"]').click();
  await expect(page.locator("#restaurant-grid .restaurant-card")).toHaveCount(3);

  await page.locator(".restaurant-card [data-compare-place]").nth(0).click();
  await page.locator(".restaurant-card [data-compare-place]").nth(1).click();
  await expect(page.locator("#open-compare")).toBeEnabled();
  await page.locator("#open-compare").click();
  await expect(page.locator("#compare-dialog")).toBeVisible();
  await expect(page.locator("#compare-dialog .compare-place")).toHaveCount(2);
  await expect(page.locator("#compare-dialog")).toContainText("SPACE FOR");
  await page.locator("#compare-dialog [data-close]").click();

  await page.locator("#sort-restaurants").selectOption("name");
  await expect(page.locator("#restaurant-grid .restaurant-card h3").first()).toHaveText("Olive Garden Bistro");

  const current = page.locator(".restaurant-card.is-bookable");
  await expect(current.first()).toBeVisible();
  await current.first().locator("[data-book]").click();
  await expect(page.locator("#booking-dialog")).toBeVisible();
  await page.locator("#confirm-booking").click();
  await expect(page.locator("#booking-dialog")).toContainText("confirmed");
  await page.locator("#view-reservations-after-booking").click();
  await expect(page.locator("#reservations-dialog")).toBeVisible();
  await expect(page.locator("#reservations-list .reservation-entry")).toHaveCount(1);
  await page.locator("#reservations-list [data-cancel]").click();
  await expect(page.locator("#cancel-dialog")).toBeVisible();
  await page.locator("#confirm-cancel").click();
  await expect(page.locator("#reservations-list .reservation-entry .status")).toHaveText("CANCELLED");
  await page.locator('#reservations-dialog [data-close]').click();
  await page.screenshot({ path: "mesa-v9-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("mobile visitors get working navigation and a usable two-pane discovery flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await expect(page.locator(".mobile-nav")).toBeVisible();
  await expect(page.locator(".reservation-dock #search-form")).toBeVisible();
  await expect(page.locator(".restaurant-card").first()).toHaveCSS("display", "flex");
  await expect(page.locator("#restaurant-grid .restaurant-card")).toHaveCount(3);
  await expect(page.locator(".hero-visual")).toBeVisible();
  await expect(page.locator(".visual-frame")).toBeVisible();
  const photoFrame = await page.locator(".visual-frame").boundingBox();
  expect(photoFrame.width).toBeGreaterThan(250);
  expect(photoFrame.height).toBeGreaterThan(200);
  await expect(page.locator(".hero-plate")).toBeVisible();
  await expect.poll(() => page.locator(".hero-plate").evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator(".hero-photo-caption")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: "mesa-v9-mobile-first-fold.png" });

  await page.locator('[data-mobile-tab="places"]').click();
  await expect(page.locator("#places")).toBeInViewport();
  await page.locator(".restaurant-card [data-compare-place]").nth(0).click();
  await page.locator(".restaurant-card [data-compare-place]").nth(1).click();
  await page.locator(".mobile-nav [data-open-compare]").click();
  await expect(page.locator("#compare-dialog")).toBeVisible();
  await expect(page.locator("#compare-dialog .compare-place")).toHaveCount(2);
  await page.screenshot({ path: "mesa-v9-mobile.png", fullPage: true });
  expect(errors).toEqual([]);
});
