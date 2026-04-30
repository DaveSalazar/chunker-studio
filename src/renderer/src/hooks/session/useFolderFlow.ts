import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { FolderSelection } from "@shared/types";
import { chunkerClient } from "@/services/chunker-client";
import type { ChunkerSessionState } from "./types";

type SetState = Dispatch<SetStateAction<ChunkerSessionState>>;

export interface FolderFlowDeps {
  state: ChunkerSessionState;
  setState: SetState;
}

export interface FolderFlow {
  selectFolder: () => Promise<void>;
  refreshFolder: () => Promise<void>;
  closeFolder: () => void;
}

export function useFolderFlow(deps: FolderFlowDeps): FolderFlow {
  const { state, setState } = deps;

  const listFolderInto = useCallback(
    async (selection: FolderSelection) => {
      setState((s) => ({
        ...s,
        folder: { selection, entries: [], loading: "listing", error: null },
      }));
      try {
        const entries = await chunkerClient.listFolder(selection.path);
        setState((s) => ({
          ...s,
          folder: { selection, entries, loading: "idle", error: null },
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setState((s) => ({
          ...s,
          folder: { selection, entries: [], loading: "idle", error: message },
        }));
      }
    },
    [setState],
  );

  const selectFolder = useCallback(async () => {
    try {
      const selection = await chunkerClient.pickFolder();
      if (!selection) return;
      await listFolderInto(selection);
    } catch (err) {
      console.error("selectFolder failed", err);
    }
  }, [listFolderInto]);

  const refreshFolder = useCallback(async () => {
    if (!state.folder) return;
    await listFolderInto(state.folder.selection);
  }, [listFolderInto, state.folder]);

  const closeFolder = useCallback(() => {
    setState((s) => ({ ...s, folder: null }));
  }, [setState]);

  return { selectFolder, refreshFolder, closeFolder };
}
