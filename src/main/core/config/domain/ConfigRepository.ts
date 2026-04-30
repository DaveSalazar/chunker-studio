import type { AppConfig } from "./ConfigEntities";

export interface ConfigRepository {
  read(): Promise<AppConfig>;
  write(next: AppConfig): Promise<AppConfig>;
}
