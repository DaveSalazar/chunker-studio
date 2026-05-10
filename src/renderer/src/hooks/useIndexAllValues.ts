import { useCallback, useEffect, useMemo, useState } from "react";
import { initialValuesForProfile, isFormReady } from "@/lib/profileFieldDefaults";
import type { IndexableDocument } from "@/hooks/session/types";
import type { SchemaProfile } from "@shared/types";

export interface IndexAllValues {
  valuesByDoc: Record<string, Record<string, string>>;
  onChangeValue: (docId: string, fieldKey: string, value: string) => void;
  allDocsReady: boolean;
}

/**
 * Per-document operator overrides for the Index-all dialog. Re-seeded
 * whenever the profile or document set changes so the editor always
 * reflects the active profile's field shape; in-flight edits are
 * intentionally dropped on profile change since the field set is
 * different.
 */
export function useIndexAllValues(
  profile: SchemaProfile | null,
  documents: IndexableDocument[],
): IndexAllValues {
  const [valuesByDoc, setValuesByDoc] = useState<
    Record<string, Record<string, string>>
  >({});

  useEffect(() => {
    if (!profile) {
      setValuesByDoc({});
      return;
    }
    const seeded: Record<string, Record<string, string>> = {};
    for (const doc of documents) {
      seeded[doc.id] = initialValuesForProfile(profile, doc.fileName);
    }
    setValuesByDoc(seeded);
  }, [profile, documents]);

  const onChangeValue = useCallback(
    (docId: string, fieldKey: string, value: string) => {
      setValuesByDoc((prev) => ({
        ...prev,
        [docId]: { ...(prev[docId] ?? {}), [fieldKey]: value },
      }));
    },
    [],
  );

  const allDocsReady = useMemo(() => {
    if (!profile || documents.length === 0) return false;
    return documents.every((d) => isFormReady(profile, valuesByDoc[d.id] ?? {}));
  }, [profile, documents, valuesByDoc]);

  return { valuesByDoc, onChangeValue, allDocsReady };
}
