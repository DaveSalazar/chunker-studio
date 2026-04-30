import { inject, injectable } from "inversify";
import { ConfigLocator } from "../domain/ConfigLocator";
import type { ConfigRepository } from "../domain/ConfigRepository";
import type { AppConfig } from "../domain/ConfigEntities";

@injectable()
export class UpdateConfigUseCase {
  constructor(
    @inject(ConfigLocator.ConfigRepository)
    private readonly repo: ConfigRepository,
  ) {}

  execute(next: AppConfig): Promise<AppConfig> {
    return this.repo.write(next);
  }
}
