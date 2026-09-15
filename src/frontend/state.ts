// 現在選択中の案件IDは、閲覧の便宜のためブラウザのlocalStorageにのみ保持する
// （オーナーキーとしてのセキュリティ境界は常にセッションCookieが担う。localStorageの値は表示の便宜に過ぎない）。
const CURRENT_PROJECT_KEY = "contract_flow_demo.current_project_id";

export function getCurrentProjectId(): string | null {
  try {
    return window.localStorage.getItem(CURRENT_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function setCurrentProjectId(projectId: string): void {
  try {
    window.localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
  } catch {
    // localStorageが使用できない環境ではフォールバックせず、単に永続化を諦める。
  }
}
