import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { ChunkSettings } from "@shared/types";
import { updateDocById } from "./helpers";
import type {
  ChunkerSessionState,
  DocumentView,
  SettingsScope,
} from "./types";

type SetState = Dispatch<SetStateAction<ChunkerSessionState>>;

export interface ScopeMutators {
  setActive: (id: string) => void;
  setScope: (scope: SettingsScope) => void;
  setSettings: (next: ChunkSettings) => void;
  clearOverride: () => void;
  setDocumentView: (id: string, view: DocumentView) => void;
  setPdfPage: (id: string, page: number) => void;
}

/**
 * Small synchronous mutators that don't touch refs or external clients —
 * just shape state. Grouped here to keep `useChunkerSession` focused on
 * orchestration.
 */
export function useScopeMutators(setState: SetState): ScopeMutators {
  const setActive = useCallback(
    (id: string) => setState((s) => ({ ...s, activeId: id })),
    [setState],
  );

  const setScope = useCallback(
    (scope: SettingsScope) => setState((s) => ({ ...s, scope })),
    [setState],
  );

  const setSettings = useCallback(
    (next: ChunkSettings) => {
      setState((s) => {
        if (s.scope === "global") return { ...s, globalSettings: next };
        const id = s.activeId;
        if (!id) return { ...s, globalSettings: next };
        return {
          ...s,
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, overrides: next } : d,
          ),
        };
      });
    },
    [setState],
  );

  const clearOverride = useCallback(() => {
    setState((s) => {
      const id = s.activeId;
      if (!id) return s;
      return {
        ...s,
        documents: s.documents.map((d) =>
          d.id === id ? { ...d, overrides: null } : d,
        ),
      };
    });
  }, [setState]);

  const setDocumentView = useCallback(
    (id: string, view: DocumentView) => {
      setState((s) => updateDocById(s, id, { view }));
    },
    [setState],
  );

  const setPdfPage = useCallback(
    (id: string, page: number) => {
      setState((s) => {
        const doc = s.documents.find((d) => d.id === id);
        if (!doc || doc.pdfPage === page) return s;
        return updateDocById(s, id, { pdfPage: page });
      });
    },
    [setState],
  );

  return { setActive, setScope, setSettings, clearOverride, setDocumentView, setPdfPage };
}
