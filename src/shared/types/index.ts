// Barrel — `import { … } from "@shared/types"` continues to work after
// the per-domain split below. Keep this file flat (no logic) so callers
// don't end up depending on a specific module path.

export * from "./ipc";
export * from "./files";
export * from "./chunks";
export * from "./profiles";
export * from "./ingest";
