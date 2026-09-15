import { test, expect } from "./fixtures";
import { STRINGS } from "../../src/frontend/strings/ja";

test.describe("デモ共通UI必須4要素", () => {
  test("アンバーバナー・戻るリンク・ご相談ボタン・フッターのリンクが表示される", async ({ page }) => {
    await page.goto("/");

    const banner = page.locator(".demo-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toHaveText(STRINGS.demo.banner);

    const backLink = page.locator(".app-nav-backlink");
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveText(STRINGS.demo.backToList);
    await expect(backLink).toHaveAttribute("href", "https://rictaworks.jp/#demos");
    await expect(backLink).toHaveAttribute("target", "_blank");

    const consultButton = page.locator(".consult-button");
    await expect(consultButton).toBeVisible();
    await expect(consultButton).toContainText(STRINGS.demo.consult);
    await expect(consultButton).toHaveAttribute("href", "https://rictaworks.jp/");
    await expect(consultButton).toHaveAttribute("target", "_blank");

    const legalFooterLink = page.locator(".app-footer a");
    await expect(legalFooterLink).toHaveText(STRINGS.demo.legalLink);
    await expect(legalFooterLink).toHaveAttribute("href", "#/legal");
  });

  test("/legal ページに利用規約・免責事項・連絡先が表示される", async ({ page }) => {
    await page.goto("/#/legal");

    await expect(page.getByRole("heading", { name: STRINGS.legal.title, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: STRINGS.legal.termsHeading, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: STRINGS.legal.disclaimerHeading, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: STRINGS.legal.contactHeading, exact: true })).toBeVisible();
    await expect(page.locator(".legal-contact-list dd", { hasText: STRINGS.legal.contact.brandValue })).toBeVisible();
    await expect(page.getByText(STRINGS.legal.contact.emailValue)).toBeVisible();

    await page.getByRole("link", { name: STRINGS.legal.backToApp }).click();
    await expect(page).toHaveURL(/#\/$/, { timeout: 15000 });
  });
});
