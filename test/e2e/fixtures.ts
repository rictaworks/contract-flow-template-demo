import { test as base, expect } from "@playwright/test";

// alert()/confirm()/prompt() が一切出現しないことを全E2Eテストで保証する（CLAUDE.md）。
// ネイティブダイアログが発火した場合は即座にテストを失敗させる。
export const test = base.extend({
  page: async ({ page }, use) => {
    page.on("dialog", (dialog) => {
      throw new Error(`ネイティブダイアログが検出されました（禁止）: ${dialog.type()} ${dialog.message()}`);
    });
    await use(page);
  },
});

export { expect };
