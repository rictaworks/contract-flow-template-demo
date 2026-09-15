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
});
