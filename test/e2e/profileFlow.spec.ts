import { test, expect } from "./fixtures";
import { STRINGS } from "../../src/frontend/strings/ja";

test.describe("プロファイル入力から展開・登録まで", () => {
  test("ハッピーパス：プレビュー表示→登録→フロー全体図へ遷移する", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: STRINGS.profileInput.heading })).toBeVisible();

    await page.locator("#field-label").fill("E2E登録テスト");
    await page.locator("#field-contractType").selectOption("請負");
    await page.locator("#field-workType").selectOption("新規開発");
    await page.locator("#field-scale").selectOption("中");
    await page.locator("#field-requirementCertainty").selectOption("確定");

    await page.getByRole("button", { name: STRINGS.profileInput.previewButton }).click();
    await expect(page.locator(".preview-table")).toBeVisible();
    await expect(page.locator(".preview-table tbody tr")).not.toHaveCount(0);

    const registerButton = page.getByRole("button", { name: STRINGS.profileInput.registerButton });
    await expect(registerButton).toBeEnabled();
    await registerButton.click();

    await expect(page).toHaveURL(/#\/flow$/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: new RegExp(STRINGS.flowOverview.heading) })).toBeVisible();
    await expect(page.locator(".phase-card")).not.toHaveCount(0);
  });

  test("不成立プロファイル（ハイブリッド×保守運用）：登録不可を表示する", async ({ page }) => {
    await page.goto("/");
    await page.locator("#field-contractType").selectOption("ハイブリッド");
    await page.locator("#field-workType").selectOption("保守運用");
    await page.locator("#field-scale").selectOption("中");
    await page.locator("#field-requirementCertainty").selectOption("確定");

    await page.getByRole("button", { name: STRINGS.profileInput.previewButton }).click();
    await expect(page.getByText(STRINGS.profileInput.rejectedHeading)).toBeVisible();
    await expect(page.getByRole("button", { name: STRINGS.profileInput.registerButton })).toBeDisabled();
  });

  test("警告プロファイル（請負×未確定）：警告表示のうえ続行できる", async ({ page }) => {
    await page.goto("/");
    await page.locator("#field-label").fill("E2E警告テスト");
    await page.locator("#field-contractType").selectOption("請負");
    await page.locator("#field-workType").selectOption("新規開発");
    await page.locator("#field-scale").selectOption("小");
    await page.locator("#field-requirementCertainty").selectOption("未確定");

    await page.getByRole("button", { name: STRINGS.profileInput.previewButton }).click();
    await expect(page.getByText(STRINGS.profileInput.warningHeading)).toBeVisible();

    const registerButton = page.getByRole("button", { name: STRINGS.profileInput.registerButton });
    await expect(registerButton).toBeEnabled();
    await registerButton.click();
    await expect(page).toHaveURL(/#\/flow$/, { timeout: 15000 });
  });
});
