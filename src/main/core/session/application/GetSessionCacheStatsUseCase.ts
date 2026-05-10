import { inject, injectable } from "inversify";
import { SessionLocator } from "../domain/SessionLocator";
import type { SessionRepository } from "../domain/SessionRepository";
import type { SessionCacheStats } from "../../../../shared/types";

@injectable()
export class GetSessionCacheStatsUseCase {
  constructor(
    @inject(SessionLocator.SessionRepository)
    private readonly repo: SessionRepository,
  ) {}

  execute(): Promise<SessionCacheStats> {
    return this.repo.getStats();
  }
}
