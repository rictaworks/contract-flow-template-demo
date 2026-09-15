export interface Bindings {
  DB: D1Database;
  APP_ENV: string;
}

export interface Variables {
  sessionId: string;
}

export type AppEnv = { Bindings: Bindings; Variables: Variables };
