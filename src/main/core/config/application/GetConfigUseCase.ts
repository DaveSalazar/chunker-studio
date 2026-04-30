import { inject, injectable } from "inversify";
import { ConfigLocator } from "../domain/ConfigLocator";
import type { ConfigRepository } from "../domain/ConfigRepository";
import type { AppConfig } from "../domain/ConfigEntities";

@injectable()
export class GetConfigUseCase {
  constructor(
    @inject(ConfigLocator.ConfigRepository)
    private readonly repo: ConfigRepository,
  ) {}

  execute(): Promise<AppConfig> {
    return this.repo.read();
  }
}
