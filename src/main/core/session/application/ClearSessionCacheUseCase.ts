import { inject, injectable } from "inversify";
import { SessionLocator } from "../domain/SessionLocator";
import type { SessionRepository } from "../domain/SessionRepository";

@injectable()
export class ClearSessionCacheUseCase {
  constructor(
    @inject(SessionLocator.SessionRepository)
    private readonly repo: SessionRepository,
  ) {}

  execute(): Promise<void> {
    return this.repo.clearAll();
  }
}
