import { useEffect, useMemo } from "react";
import { CloudUpload, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { IndexAllIdleBody } from "@/components/app/IndexAllIdleBody";
import {
  IndexAllDoneView,
  IndexAllErrorView,
  IndexAllRunningView,
} from "@/components/app/IndexAllPhaseViews";
import { useIndexAllFlow } from "@/hooks/useIndexAllFlow";
import { useIndexAllValues } from "@/hooks/useIndexAllValues";
import { useProfileChoice } from "@/hooks/useProfileChoice";
import { useT } from "@/lib/i18n";
import type { IndexableDocument } from "@/hooks/session/types";

/**
 * Above this token count we surface a warning before the run starts —
 * each chat draft request that retrieves the template will spend more
 * on input tokens. Same threshold the single-doc IngestDialog uses.
 */
const TEMPLATE_BODY_TOKEN_WARN_LIMIT = 8000;

export interface IndexAllDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  documents: IndexableDocument[];
  onOpenSettings: () => void;
}

export function IndexAllDialog({
  open,
  onOpenChange,
  documents,
  onOpenSettings,
}: IndexAllDialogProps) {
  const t = useT();
  const { phase, start, reset } = useIndexAllFlow();
  const { profile, profiles, selectProfile, loadError } = useProfileChoice(open);
  const { valuesByDoc, onChangeValue, allDocsReady } = useIndexAllValues(
    profile,
    documents,
  );

  // Reset to idle whenever the dialog re-opens for a fresh run.
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  // Pre-run check: any whole-document body crossing the soft cap?
  // Article-aware chunks have body=null and never trigger this.
  const heavyTokens = useMemo(() => {
    let max = 0;
    for (const d of documents) {
      for (const c of d.chunks) {
        if (c.body !== null && c.tokenCount > max) max = c.tokenCount;
      }
    }
    return max >= TEMPLATE_BODY_TOKEN_WARN_LIMIT ? max : null;
  }, [documents]);

  const close = () => {
    if (phase.kind === "running") return; // Don't allow closing mid-batch
    onOpenChange(false);
  };

  const onStart = () => {
    if (!profile) return;
    void start(profile, documents, valuesByDoc);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      modal={phase.kind === "running"}
      className="w-[min(960px,calc(100vw-2rem))]"
    >
      <DialogHeader
        title={
          <span className="flex items-center gap-2">
            <CloudUpload className="h-4 w-4 text-primary" />
            {t("indexAll.title")}
          </span>
        }
        description={t("indexAll.description", { count: documents.length })}
        onClose={phase.kind === "running" ? undefined : close}
      />
      <DialogBody className="gap-4">
        {phase.kind === "idle" && (
          <IndexAllIdleBody
            profile={profile}
            profiles={profiles}
            onSelectProfile={selectProfile}
            documents={documents}
            heavyTokens={heavyTokens}
            loadError={loadError}
            valuesByDoc={valuesByDoc}
            onChangeValue={onChangeValue}
          />
        )}
        {phase.kind === "running" && <IndexAllRunningView phase={phase} />}
        {phase.kind === "done" && <IndexAllDoneView results={phase.results} />}
        {phase.kind === "error" && (
          <IndexAllErrorView
            message={phase.message}
            missingConfig={phase.missingConfig}
          />
        )}
      </DialogBody>
      <DialogFooter>
        {phase.kind === "idle" && (
          <>
            <Button variant="outline" onClick={close}>
              {t("ingest.cancel")}
            </Button>
            <Button
              onClick={onStart}
              disabled={!profile || documents.length === 0 || !allDocsReady}
              title={
                profile && documents.length > 0 && !allDocsReady
                  ? t("indexAll.missingFields")
                  : undefined
              }
            >
              <CloudUpload />
              {t("indexAll.start", { count: documents.length })}
            </Button>
          </>
        )}
        {phase.kind === "running" && (
          <Button variant="outline" disabled>
            <Loader2 className="animate-spin" />
            {t("indexAll.runningFooter", {
              index: phase.currentIndex + 1,
              total: phase.total,
            })}
          </Button>
        )}
        {phase.kind === "done" && (
          <Button onClick={close}>{t("ingest.closeOnDone")}</Button>
        )}
        {phase.kind === "error" && (
          <>
            {phase.missingConfig && (
              <Button variant="outline" onClick={onOpenSettings}>
                {t("ingest.openSettings")}
              </Button>
            )}
            <Button variant="outline" onClick={close}>
              {t("ingest.closeOnDone")}
            </Button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}
