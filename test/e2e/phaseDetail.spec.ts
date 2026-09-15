import { test, expect } from "./fixtures";
import { STRINGS } from "../../src/frontend/strings/ja";

test.describe("工程詳細：成果物・判断基準の更新とゲート評価", () => {
  test("成果物状態・判断基準を更新しゲートを判定できる", async ({ page }) => {
    await page.goto("/");
    await page.locator("#field-label").fill("E2E工程詳細テスト");
    await page.locator("#field-contractType").selectOption("請負");
    await page.locator("#field-workType").selectOption("新規開発");
    await page.locator("#field-scale").selectOption("小");
    await page.locator("#field-requirementCertainty").selectOption("確定");
    await page.getByRole("button", { name: STRINGS.profileInput.previewButton }).click();
    await page.getByRole("button", { name: STRINGS.profileInput.registerButton }).click();
    await expect(page).toHaveURL(/#\/flow$/, { timeout: 15000 });

    await page.locator(".phase-card").first().click();
    await expect(page.getByRole("heading", { name: new RegExp(STRINGS.phaseDetail.heading) })).toBeVisible();

    // 未達のままゲート判定を実行 → 何らかの判定結果バッジが表示される
    await page.getByRole("button", { name: STRINGS.phaseDetail.evaluateButton }).click();
    await expect(page.locator(".verdict-badge")).toBeVisible();

    // 成果物をすべて承認済にし、操作可能な判断基準をすべて達成にする
    const deliverableSelects = page.locator("table select");
    const deliverableCount = await deliverableSelects.count();
    for (let i = 0; i < deliverableCount; i++) {
      await deliverableSelects.nth(i).selectOption("承認済");
    }

    const criteriaCheckboxes = page.locator(".criteria-item input[type=checkbox]:not([disabled])");
    const criteriaCount = await criteriaCheckboxes.count();
    for (let i = 0; i < criteriaCount; i++) {
      const box = criteriaCheckboxes.nth(i);
      if (!(await box.isChecked())) await box.check();
    }

    await page.getByRole("button", { name: STRINGS.phaseDetail.evaluateButton }).click();
    await expect(page.locator(".verdict-badge")).toBeVisible();
    await expect(page.locator(".verdict-badge.verdict-fail")).toHaveCount(0);
  });

  test("請負契約のP04（要件定義）で派生規則が追加した必須判断基準をチェックしてゲートを通過できる（issue #7 回帰）", async ({ page }) => {
    // R06（契約形態＝請負）が追加する「検収基準の合意」は autoAttached だが自動算出ではない。
    // チェックボックスが誤って disabled のままだと、この工程は永久に不通過になる。
    await page.goto("/");
    await page.locator("#field-label").fill("E2E請負P04テスト");
    await page.locator("#field-contractType").selectOption("請負");
    await page.locator("#field-workType").selectOption("新規開発");
    await page.locator("#field-scale").selectOption("小");
    await page.locator("#field-requirementCertainty").selectOption("確定");
    await page.getByRole("button", { name: STRINGS.profileInput.previewButton }).click();
    await page.getByRole("button", { name: STRINGS.profileInput.registerButton }).click();
    await expect(page).toHaveURL(/#\/flow$/, { timeout: 15000 });

    const p04Card = page.locator(".phase-card", { has: page.locator(".phase-card-code", { hasText: "P04" }) });
    await expect(p04Card).toBeVisible();
    await p04Card.click();
    await expect(page.getByRole("heading", { name: new RegExp(STRINGS.phaseDetail.heading) })).toBeVisible();

    const targetCheckbox = page.locator(".criteria-item", { hasText: "検収基準の合意" }).locator("input[type=checkbox]");
    await expect(targetCheckbox).toBeVisible();
    await expect(targetCheckbox).toBeEnabled();
    await targetCheckbox.check();
    await expect(targetCheckbox).toBeChecked();

    // 残りの必須成果物・判断基準を満たし、顧客承認ゲートのため承認記録も追加する。
    const deliverableSelects = page.locator("table select");
    const deliverableCount = await deliverableSelects.count();
    for (let i = 0; i < deliverableCount; i++) {
      await deliverableSelects.nth(i).selectOption("承認済");
    }
    const remainingCheckboxes = page.locator(".criteria-item input[type=checkbox]:not([disabled])");
    const remainingCount = await remainingCheckboxes.count();
    for (let i = 0; i < remainingCount; i++) {
      const box = remainingCheckboxes.nth(i);
      if (!(await box.isChecked())) await box.check();
    }

    await page.getByRole("button", { name: STRINGS.phaseDetail.addApprovalButton }).click();
    await page.locator("dialog[open] [name=approverRole]").selectOption("発注者決裁者");
    await page.locator("dialog[open] [name=approvedOn]").fill("2026-09-15");
    await page.locator("dialog[open] button[type=submit]").click();

    await page.getByRole("button", { name: STRINGS.phaseDetail.evaluateButton }).click();
    await expect(page.locator(".verdict-badge.verdict-fail")).toHaveCount(0);
  });
});
