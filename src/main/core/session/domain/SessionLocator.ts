export const SessionLocator = {
  SessionRepository: Symbol.for("SessionRepository"),
  GetSessionCacheStatsUseCase: Symbol.for("GetSessionCacheStatsUseCase"),
  ClearSessionCacheUseCase: Symbol.for("ClearSessionCacheUseCase"),
};
