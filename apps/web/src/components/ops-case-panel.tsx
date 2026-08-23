"use client";

import {
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  GitBranch,
  MessageSquareText,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  type LucideIcon
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { getDevPortalApiBaseUrl } from "./use-dev-portal-session";

export type OpsCaseWorkbenchItem = {
  id: string;
  kind: "ownerLead" | "proposalRequest";
  title: string;
};

type CaseStatus = "OPEN" | "QUALIFYING" | "ACTION_PENDING" | "CLOSED";
type TaskStatus = "OPEN" | "DONE";
type PropertyOnboardingStatus = "DRAFT" | "QUALIFICATION" | "DOCUMENTS" | "OPERATIONS_READY" | "CLOSED";
type StayProposalStatus = "DRAFT" | "READY_TO_SEND" | "SENT" | "ACCEPTED" | "DECLINED" | "VOID";
type Priority = "high" | "normal" | "medium" | "low";
type LoadState = "idle" | "loading" | "ready" | "error";
type Notice = { kind: "success" | "error"; text: string } | null;

type CaseOption<T extends string> = {
  label: string;
  value: T;
};

type OpsCaseTask = {
  createdAt: string;
  dueLabel?: string | null;
  id: string;
  priority: Priority | string;
  priorityLabel: string;
  sortOrder: number;
  status: TaskStatus;
  statusLabel: string;
  title: string;
  updatedAt: string;
};

type OpsCaseConversion =
  | {
      kind: "propertyOnboarding";
      id: string;
      label: string;
      status: PropertyOnboardingStatus;
      statusLabel: string;
      nextMilestone: string;
      checklist: Array<{ key: string; label: string; status: TaskStatus }>;
      createdAt: string;
      updatedAt: string;
    }
  | {
      kind: "stayProposal";
      id: string;
      label: string;
      status: StayProposalStatus;
      statusLabel: string;
      currentVersion: number;
      stayName: string;
      versions: Array<{
        createdAt: string;
        id: string;
        internalNotes?: string | null;
        summary: string;
        termsLabel: string;
        title: string;
        version: number;
      }>;
      createdAt: string;
      updatedAt: string;
    }
  | null;
type OpsCaseDetail = {
  id: string;
  source: {
    entityType: "OwnerLead" | "StayProposalRequest";
    item: OpsCaseWorkbenchItem;
    sourceId: string;
    sourceType: "OWNER_LEAD" | "STAY_PROPOSAL_REQUEST";
  };
  status: CaseStatus;
  statusLabel: string;
  priority: Priority | string;
  priorityLabel: string;
  nextStep?: string | null;
  contact: {
    email: string;
    name: string;
    phone?: string | null;
  };
  conversion: OpsCaseConversion;
  metrics: {
    noteCount: number;
    openTaskCount: number;
    taskCount: number;
  };
  options: {
    priorities: Array<CaseOption<Priority>>;
    statuses: Array<CaseOption<CaseStatus>>;
    taskStatuses: Array<CaseOption<TaskStatus>>;
  };
  notes: Array<{
    author: {
      displayName: string;
      email: string;
      id: string;
    } | null;
    body: string;
    createdAt: string;
    id: string;
  }>;
  tasks: OpsCaseTask[];
  createdAt: string;
  updatedAt: string;
};

type CaseDetailResponse = {
  caseDetail: OpsCaseDetail;
};

type CaseConversionResponse = CaseDetailResponse & {
  conversion: OpsCaseConversion;
};

const caseStatusClasses: Record<CaseStatus, string> = {
  OPEN: "border-terracotta/30 bg-terracotta/10 text-terracotta",
  QUALIFYING: "border-midnight/18 bg-midnight/8 text-midnight",
  ACTION_PENDING: "border-green/24 bg-green/10 text-green",
  CLOSED: "border-line bg-ivory text-ink/62"
};

const priorityClasses: Record<string, string> = {
  high: "border-terracotta/30 bg-terracotta/10 text-terracotta",
  normal: "border-line bg-ivory text-ink/70",
  medium: "border-midnight/18 bg-midnight/8 text-midnight",
  low: "border-green/24 bg-green/10 text-green"
};

const propertyOnboardingStatusOptions: Array<CaseOption<PropertyOnboardingStatus>> = [
  { label: "Borrador", value: "DRAFT" },
  { label: "Calificacion", value: "QUALIFICATION" },
  { label: "Documentos", value: "DOCUMENTS" },
  { label: "Listo ops", value: "OPERATIONS_READY" },
  { label: "Cerrado", value: "CLOSED" }
];

const stayProposalStatusOptions: Array<CaseOption<StayProposalStatus>> = [
  { label: "Borrador", value: "DRAFT" },
  { label: "Lista para enviar", value: "READY_TO_SEND" },
  { label: "Enviada", value: "SENT" },
  { label: "Aceptada", value: "ACCEPTED" },
  { label: "Rechazada", value: "DECLINED" },
  { label: "Anulada", value: "VOID" }
];

export function OpsCasePanel({
  selectedItem,
  sessionToken
}: {
  selectedItem: OpsCaseWorkbenchItem | null;
  sessionToken: string | null;
}) {
  const [caseDetail, setCaseDetail] = useState<OpsCaseDetail | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [nextStep, setNextStep] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueLabel, setTaskDueLabel] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("normal");
  const [conversionMilestone, setConversionMilestone] = useState("");
  const [proposalSummary, setProposalSummary] = useState("");
  const [proposalTermsLabel, setProposalTermsLabel] = useState("Borrador interno sujeto a disponibilidad final");
  const [proposalInternalNotes, setProposalInternalNotes] = useState("");
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!sessionToken || !selectedItem) {
      setCaseDetail(null);
      setLoadState("idle");
      setNextStep("");
      setConversionMilestone("");
      setProposalSummary("");
      setProposalTermsLabel("Borrador interno sujeto a disponibilidad final");
      setProposalInternalNotes("");
      setNotice(null);
      return;
    }

    let isMounted = true;
    setLoadState("loading");
    setNotice(null);

    fetchCaseDetail(selectedItem, sessionToken)
      .then((response) => {
        if (isMounted) {
          applyCaseDetail(response.caseDetail);
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadState("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedItem, sessionToken]);

  function applyCaseDetail(detail: OpsCaseDetail) {
    setCaseDetail(detail);
    setNextStep(detail.nextStep ?? "");

    if (detail.conversion?.kind === "propertyOnboarding") {
      setConversionMilestone(detail.conversion.nextMilestone);
    }
  }

  async function handleCaseUpdate(patch: Partial<{ nextStep: string | null; priority: Priority; status: CaseStatus }>) {
    if (!sessionToken || !caseDetail) {
      return;
    }

    setUpdatingKey("case");
    setNotice(null);

    try {
      const response = await patchCaseDetail(caseDetail.source.item, patch, sessionToken);
      applyCaseDetail(response.caseDetail);
      setNotice({ kind: "success", text: "Expediente actualizado." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo actualizar el expediente." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleNextStepSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleCaseUpdate({ nextStep });
  }

  async function handleNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionToken || !caseDetail || noteBody.trim().length < 3) {
      return;
    }

    setUpdatingKey("note");
    setNotice(null);

    try {
      const response = await postCaseNote(caseDetail.source.item, noteBody.trim(), sessionToken);
      applyCaseDetail(response.caseDetail);
      setNoteBody("");
      setNotice({ kind: "success", text: "Nota registrada." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo registrar la nota." });
    } finally {
      setUpdatingKey(null);
    }
  }
  async function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionToken || !caseDetail || taskTitle.trim().length < 3) {
      return;
    }

    setUpdatingKey("task:create");
    setNotice(null);

    try {
      const response = await postCaseTask(
        caseDetail.source.item,
        {
          dueLabel: taskDueLabel.trim() || undefined,
          priority: taskPriority,
          title: taskTitle.trim()
        },
        sessionToken
      );
      applyCaseDetail(response.caseDetail);
      setTaskTitle("");
      setTaskDueLabel("");
      setTaskPriority("normal");
      setNotice({ kind: "success", text: "Tarea creada." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo crear la tarea." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleTaskStatusChange(task: OpsCaseTask) {
    if (!sessionToken || !caseDetail) {
      return;
    }

    const nextStatus: TaskStatus = task.status === "OPEN" ? "DONE" : "OPEN";
    setUpdatingKey(`task:${task.id}`);
    setNotice(null);

    try {
      const response = await patchCaseTask(caseDetail.source.item, task.id, nextStatus, sessionToken);
      applyCaseDetail(response.caseDetail);
      setNotice({ kind: "success", text: "Tarea actualizada." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo actualizar la tarea." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleConvertCase() {
    if (!sessionToken || !caseDetail) {
      return;
    }

    setUpdatingKey("conversion");
    setNotice(null);

    try {
      const response = await postCaseConversion(caseDetail.source.item, sessionToken);
      applyCaseDetail(response.caseDetail);
      setNotice({ kind: "success", text: "Flujo formal creado." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo convertir el expediente." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleConversionStatusChange(status: PropertyOnboardingStatus | StayProposalStatus) {
    if (!sessionToken || !caseDetail || !caseDetail.conversion) {
      return;
    }

    setUpdatingKey("conversion:status");
    setNotice(null);

    try {
      const response = await patchCaseConversion(caseDetail.source.item, { status }, sessionToken);
      applyCaseDetail(response.caseDetail);
      setNotice({ kind: "success", text: "Flujo formal actualizado." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo actualizar el flujo formal." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleConversionMilestoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionToken || !caseDetail || caseDetail.conversion?.kind !== "propertyOnboarding") {
      return;
    }

    const nextMilestone = conversionMilestone.trim();

    if (!nextMilestone) {
      return;
    }

    setUpdatingKey("conversion:milestone");
    setNotice(null);

    try {
      const response = await patchCaseConversion(caseDetail.source.item, { nextMilestone }, sessionToken);
      applyCaseDetail(response.caseDetail);
      setNotice({ kind: "success", text: "Hito de onboarding actualizado." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo actualizar el hito." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleChecklistStatusChange(item: { key: string; label: string; status: TaskStatus }) {
    if (!sessionToken || !caseDetail || caseDetail.conversion?.kind !== "propertyOnboarding") {
      return;
    }

    const nextStatus: TaskStatus = item.status === "DONE" ? "OPEN" : "DONE";
    setUpdatingKey(`conversion:checklist:${item.key}`);
    setNotice(null);

    try {
      const response = await patchConversionChecklist(caseDetail.source.item, item.key, nextStatus, sessionToken);
      applyCaseDetail(response.caseDetail);
      setNotice({ kind: "success", text: "Checklist actualizado." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo actualizar el checklist." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleProposalVersionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionToken || !caseDetail || caseDetail.conversion?.kind !== "stayProposal") {
      return;
    }

    const summary = proposalSummary.trim();
    const termsLabel = proposalTermsLabel.trim();

    if (summary.length < 8 || termsLabel.length < 4) {
      return;
    }

    setUpdatingKey("conversion:version");
    setNotice(null);

    try {
      const response = await postProposalVersion(
        caseDetail.source.item,
        {
          internalNotes: proposalInternalNotes.trim() || undefined,
          summary,
          termsLabel
        },
        sessionToken
      );
      applyCaseDetail(response.caseDetail);
      setProposalSummary("");
      setProposalTermsLabel("Borrador interno sujeto a disponibilidad final");
      setProposalInternalNotes("");
      setNotice({ kind: "success", text: "Version de propuesta creada." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo crear la version." });
    } finally {
      setUpdatingKey(null);
    }
  }

  return (
    <section className="rounded-[8px] border border-line bg-white p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-green/10 text-green">
          <ClipboardList aria-hidden className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-green">Expediente</p>
          <h2 className="truncate text-lg font-semibold text-midnight">
            {caseDetail?.source.item.title ?? selectedItem?.title ?? "Sin caso abierto"}
          </h2>
        </div>
      </div>

      {notice ? (
        <div
          className={`mt-5 rounded-[6px] border p-3 text-sm ${
            notice.kind === "success"
              ? "border-green/24 bg-green/10 text-midnight"
              : "border-terracotta/30 bg-terracotta/10 text-midnight"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      {loadState === "loading" ? (
        <CompactState icon={RefreshCw} title="Cargando expediente" body="Sincronizando notas y tareas." />
      ) : loadState === "error" ? (
        <CompactState icon={ShieldCheck} title="No se pudo abrir" body="La API no devolvio el expediente." />
      ) : !caseDetail ? (
        <CompactState icon={FileText} title="Sin expediente seleccionado" body="Abre un item de la bandeja para ver su flujo." />
      ) : (
        <div className="mt-5 space-y-6">
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${caseStatusClasses[caseDetail.status]}`}
            >
              {caseDetail.statusLabel}
            </span>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                priorityClasses[caseDetail.priority] ?? priorityClasses.normal
              }`}
            >
              Prioridad {caseDetail.priorityLabel}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 border-y border-line py-4 text-center">
            <CaseMetric label="Tareas" value={`${caseDetail.metrics.openTaskCount}/${caseDetail.metrics.taskCount}`} />
            <CaseMetric label="Notas" value={`${caseDetail.metrics.noteCount}`} />
            <CaseMetric label="Estado" value={caseDetail.statusLabel} />
          </div>

          <ConversionSection
            caseDetail={caseDetail}
            conversionMilestone={conversionMilestone}
            onChecklistStatusChange={handleChecklistStatusChange}
            onConversionMilestoneChange={setConversionMilestone}
            onConversionMilestoneSubmit={handleConversionMilestoneSubmit}
            onConversionStatusChange={handleConversionStatusChange}
            onConvert={handleConvertCase}
            onProposalInternalNotesChange={setProposalInternalNotes}
            onProposalSummaryChange={setProposalSummary}
            onProposalTermsLabelChange={setProposalTermsLabel}
            onProposalVersionSubmit={handleProposalVersionSubmit}
            proposalInternalNotes={proposalInternalNotes}
            proposalSummary={proposalSummary}
            proposalTermsLabel={proposalTermsLabel}
            updatingKey={updatingKey}
          />

          <div>
            <p className="text-xs font-semibold uppercase text-ink/48">Estado caso</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {caseDetail.options.statuses.map((option) => (
                <button
                  className={`focus-ring min-h-9 rounded-[6px] border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    caseDetail.status === option.value
                      ? "border-green bg-green text-white"
                      : "border-line bg-white text-midnight hover:border-green hover:text-green"
                  }`}
                  disabled={updatingKey === "case" || caseDetail.status === option.value}
                  key={option.value}
                  onClick={() => handleCaseUpdate({ status: option.value })}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-ink/48">Prioridad</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {caseDetail.options.priorities.map((option) => (
                <button
                  className={`focus-ring min-h-9 rounded-[6px] border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    caseDetail.priority === option.value
                      ? "border-midnight bg-midnight text-white"
                      : "border-line bg-white text-midnight hover:border-midnight"
                  }`}
                  disabled={updatingKey === "case" || caseDetail.priority === option.value}
                  key={option.value}
                  onClick={() => handleCaseUpdate({ priority: option.value })}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <form className="space-y-3" onSubmit={handleNextStepSubmit}>
            <label className="block text-xs font-semibold uppercase text-ink/48" htmlFor="case-next-step">
              Siguiente paso
            </label>
            <textarea
              className="focus-ring min-h-24 w-full resize-none rounded-[6px] border border-line bg-white px-3 py-2 text-sm leading-6 text-ink outline-none"
              id="case-next-step"
              maxLength={240}
              onChange={(event) => setNextStep(event.target.value)}
              value={nextStep}
            />
            <button
              className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-midnight px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-55"
              disabled={updatingKey === "case"}
              type="submit"
            >
              <Save aria-hidden className="h-4 w-4" />
              Guardar
            </button>
          </form>

          <div className="border-t border-line pt-5">
            <div className="flex items-center gap-2">
              <MessageSquareText aria-hidden className="h-4 w-4 text-green" />
              <h3 className="text-sm font-semibold uppercase text-midnight">Notas</h3>
            </div>
            <form className="mt-3 space-y-3" onSubmit={handleNoteSubmit}>
              <textarea
                aria-label="Nueva nota"
                className="focus-ring min-h-24 w-full resize-none rounded-[6px] border border-line bg-white px-3 py-2 text-sm leading-6 text-ink outline-none"
                maxLength={1000}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="Nueva nota"
                value={noteBody}
              />
              <button
                className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={updatingKey === "note" || noteBody.trim().length < 3}
                type="submit"
              >
                <Plus aria-hidden className="h-4 w-4" />
                Agregar nota
              </button>
            </form>
            <div className="mt-4 space-y-3">
              {caseDetail.notes.map((note) => (
                <div className="border-b border-line pb-3 text-sm last:border-b-0 last:pb-0" key={note.id}>
                  <p className="leading-6 text-ink/76">{note.body}</p>
                  <p className="mt-2 text-xs text-ink/50">
                    {note.author?.displayName ?? "KUQUBA"} - {formatDateTime(note.createdAt)}
                  </p>
                </div>
              ))}
              {caseDetail.notes.length === 0 ? <p className="text-sm leading-6 text-ink/62">Sin notas.</p> : null}
            </div>
          </div>
          <div className="border-t border-line pt-5">
            <div className="flex items-center gap-2">
              <ClipboardList aria-hidden className="h-4 w-4 text-green" />
              <h3 className="text-sm font-semibold uppercase text-midnight">Tareas</h3>
            </div>
            <form className="mt-3 grid gap-3" onSubmit={handleTaskSubmit}>
              <input
                aria-label="Nueva tarea"
                className="focus-ring min-h-10 rounded-[6px] border border-line bg-white px-3 text-sm text-ink outline-none"
                maxLength={160}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Nueva tarea"
                value={taskTitle}
              />
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <input
                  aria-label="Fecha o contexto"
                  className="focus-ring min-h-10 rounded-[6px] border border-line bg-white px-3 text-sm text-ink outline-none"
                  maxLength={80}
                  onChange={(event) => setTaskDueLabel(event.target.value)}
                  placeholder="Fecha o contexto"
                  value={taskDueLabel}
                />
                <select
                  aria-label="Prioridad de tarea"
                  className="focus-ring min-h-10 rounded-[6px] border border-line bg-white px-3 text-sm font-semibold text-midnight outline-none"
                  onChange={(event) => setTaskPriority(event.target.value as Priority)}
                  value={taskPriority}
                >
                  {caseDetail.options.priorities.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={updatingKey === "task:create" || taskTitle.trim().length < 3}
                type="submit"
              >
                <Plus aria-hidden className="h-4 w-4" />
                Crear tarea
              </button>
            </form>
            <div className="mt-4 space-y-3">
              {caseDetail.tasks.map((task) => (
                <div className="border-b border-line pb-3 last:border-b-0 last:pb-0" key={task.id}>
                  <button
                    className="focus-ring flex w-full items-start gap-3 rounded-[6px] text-left disabled:cursor-not-allowed disabled:opacity-55"
                    disabled={updatingKey === `task:${task.id}`}
                    onClick={() => handleTaskStatusChange(task)}
                    type="button"
                  >
                    {task.status === "DONE" ? (
                      <CheckCircle2 aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                    ) : (
                      <Circle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" />
                    )}
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-semibold leading-5 ${
                          task.status === "DONE" ? "text-ink/48 line-through" : "text-midnight"
                        }`}
                      >
                        {task.title}
                      </span>
                      <span className="mt-1 block text-xs text-ink/52">
                        {task.dueLabel ?? "Sin fecha"} - {task.priorityLabel} - {task.statusLabel}
                      </span>
                    </span>
                  </button>
                </div>
              ))}
              {caseDetail.tasks.length === 0 ? <p className="text-sm leading-6 text-ink/62">Sin tareas.</p> : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ConversionSection({
  caseDetail,
  conversionMilestone,
  onChecklistStatusChange,
  onConversionMilestoneChange,
  onConversionMilestoneSubmit,
  onConversionStatusChange,
  onConvert,
  onProposalInternalNotesChange,
  onProposalSummaryChange,
  onProposalTermsLabelChange,
  onProposalVersionSubmit,
  proposalInternalNotes,
  proposalSummary,
  proposalTermsLabel,
  updatingKey
}: {
  caseDetail: OpsCaseDetail;
  conversionMilestone: string;
  onChecklistStatusChange: (item: { key: string; label: string; status: TaskStatus }) => void;
  onConversionMilestoneChange: (value: string) => void;
  onConversionMilestoneSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onConversionStatusChange: (status: PropertyOnboardingStatus | StayProposalStatus) => void;
  onConvert: () => void;
  onProposalInternalNotesChange: (value: string) => void;
  onProposalSummaryChange: (value: string) => void;
  onProposalTermsLabelChange: (value: string) => void;
  onProposalVersionSubmit: (event: FormEvent<HTMLFormElement>) => void;
  proposalInternalNotes: string;
  proposalSummary: string;
  proposalTermsLabel: string;
  updatingKey: string | null;
}) {
  const conversionLabel = caseDetail.source.item.kind === "ownerLead" ? "Convertir a onboarding" : "Convertir a propuesta";

  if (!caseDetail.conversion) {
    return (
      <div className="rounded-[6px] border border-line bg-ivory p-4">
        <div className="flex items-center gap-2">
          <GitBranch aria-hidden className="h-4 w-4 text-green" />
          <p className="text-sm font-semibold text-midnight">Flujo formal pendiente</p>
        </div>
        <button
          className="focus-ring mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={updatingKey === "conversion"}
          onClick={onConvert}
          type="button"
        >
          <Plus aria-hidden className="h-4 w-4" />
          {conversionLabel}
        </button>
      </div>
    );
  }

  if (caseDetail.conversion.kind === "propertyOnboarding") {
    const conversion = caseDetail.conversion;

    return (
      <div className="rounded-[6px] border border-green/24 bg-green/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-green">{conversion.label}</p>
            <h3 className="mt-1 text-base font-semibold text-midnight">{conversion.statusLabel}</h3>
          </div>
          <GitBranch aria-hidden className="h-5 w-5 shrink-0 text-green" />
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase text-ink/48">Estado onboarding</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {propertyOnboardingStatusOptions.map((option) => (
              <button
                className={`focus-ring min-h-9 rounded-[6px] border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                  conversion.status === option.value
                    ? "border-green bg-green text-white"
                    : "border-line bg-white text-midnight hover:border-green hover:text-green"
                }`}
                disabled={updatingKey === "conversion:status" || conversion.status === option.value}
                key={option.value}
                onClick={() => onConversionStatusChange(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <form className="mt-4 space-y-3" onSubmit={onConversionMilestoneSubmit}>
          <label className="block text-xs font-semibold uppercase text-ink/48" htmlFor="conversion-next-milestone">
            Hito siguiente
          </label>
          <textarea
            className="focus-ring min-h-20 w-full resize-none rounded-[6px] border border-line bg-white px-3 py-2 text-sm leading-6 text-ink outline-none"
            id="conversion-next-milestone"
            maxLength={180}
            onChange={(event) => onConversionMilestoneChange(event.target.value)}
            value={conversionMilestone}
          />
          <button
            className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-midnight px-4 text-sm font-semibold text-white transition hover:bg-midnight/90 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={updatingKey === "conversion:milestone" || conversionMilestone.trim().length === 0}
            type="submit"
          >
            <Save aria-hidden className="h-4 w-4" />
            Guardar hito
          </button>
        </form>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase text-ink/48">Checklist onboarding</p>
          {conversion.checklist.map((item) => {
            const isDone = item.status === "DONE";

            return (
              <button
                className="focus-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-[6px] border border-line bg-white px-3 py-2 text-left text-xs transition hover:border-green disabled:cursor-not-allowed disabled:opacity-55"
                disabled={updatingKey === `conversion:checklist:${item.key}`}
                key={item.key}
                onClick={() => onChecklistStatusChange(item)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {isDone ? (
                    <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-green" />
                  ) : (
                    <Circle aria-hidden className="h-4 w-4 shrink-0 text-terracotta" />
                  )}
                  <span className="font-semibold text-midnight">{item.label}</span>
                </span>
                <span className="shrink-0 text-ink/58">{isDone ? "Completada" : "Pendiente"}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const conversion = caseDetail.conversion;
  const latestVersion = conversion.versions[0];

  return (
    <div className="rounded-[6px] border border-green/24 bg-green/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-green">{conversion.label}</p>
          <h3 className="mt-1 text-base font-semibold text-midnight">
            Version {conversion.currentVersion} - {conversion.statusLabel}
          </h3>
        </div>
        <GitBranch aria-hidden className="h-5 w-5 shrink-0 text-green" />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase text-ink/48">Estado propuesta</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {stayProposalStatusOptions.map((option) => (
            <button
              className={`focus-ring min-h-9 rounded-[6px] border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                conversion.status === option.value
                  ? "border-green bg-green text-white"
                  : "border-line bg-white text-midnight hover:border-green hover:text-green"
              }`}
              disabled={updatingKey === "conversion:status" || conversion.status === option.value}
              key={option.value}
              onClick={() => onConversionStatusChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {latestVersion ? (
        <div className="mt-4 border-y border-green/20 py-3 text-sm leading-6 text-ink/70">
          <p className="font-semibold text-midnight">{latestVersion.title}</p>
          <p className="mt-1">{latestVersion.summary}</p>
          <p className="mt-1 text-xs text-ink/52">{latestVersion.termsLabel}</p>
        </div>
      ) : null}

      <form className="mt-4 grid gap-3" onSubmit={onProposalVersionSubmit}>
        <textarea
          aria-label="Resumen de nueva version"
          className="focus-ring min-h-24 w-full resize-none rounded-[6px] border border-line bg-white px-3 py-2 text-sm leading-6 text-ink outline-none"
          maxLength={700}
          onChange={(event) => onProposalSummaryChange(event.target.value)}
          placeholder="Resumen de nueva version"
          value={proposalSummary}
        />
        <input
          aria-label="Terminos comerciales"
          className="focus-ring min-h-10 rounded-[6px] border border-line bg-white px-3 text-sm text-ink outline-none"
          maxLength={160}
          onChange={(event) => onProposalTermsLabelChange(event.target.value)}
          placeholder="Terminos comerciales"
          value={proposalTermsLabel}
        />
        <textarea
          aria-label="Notas internas"
          className="focus-ring min-h-20 w-full resize-none rounded-[6px] border border-line bg-white px-3 py-2 text-sm leading-6 text-ink outline-none"
          maxLength={500}
          onChange={(event) => onProposalInternalNotesChange(event.target.value)}
          placeholder="Notas internas"
          value={proposalInternalNotes}
        />
        <button
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-midnight px-4 text-sm font-semibold text-white transition hover:bg-midnight/90 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={updatingKey === "conversion:version" || proposalSummary.trim().length < 8 || proposalTermsLabel.trim().length < 4}
          type="submit"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Crear version
        </button>
      </form>
    </div>
  );
}

function CaseMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-lg font-semibold text-midnight">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase text-ink/48">{label}</p>
    </div>
  );
}

function CompactState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="mt-5 rounded-[6px] border border-line bg-ivory p-5 text-center">
      <Icon aria-hidden className="mx-auto h-7 w-7 text-green" />
      <h3 className="mt-3 text-base font-semibold text-midnight">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/64">{body}</p>
    </div>
  );
}

async function fetchCaseDetail(item: OpsCaseWorkbenchItem, sessionToken: string): Promise<CaseDetailResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case`, {
    headers: {
      "x-kuquba-dev-session": sessionToken
    }
  });

  const payload = (await response.json().catch(() => ({}))) as CaseDetailResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_detail_failed");
  }

  return payload;
}

async function patchCaseDetail(
  item: OpsCaseWorkbenchItem,
  patch: Partial<{ nextStep: string | null; priority: Priority; status: CaseStatus }>,
  sessionToken: string
): Promise<CaseDetailResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case`, {
    body: JSON.stringify(patch),
    headers: {
      "content-type": "application/json",
      "x-kuquba-dev-session": sessionToken
    },
    method: "PATCH"
  });

  const payload = (await response.json().catch(() => ({}))) as CaseDetailResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_update_failed");
  }

  return payload;
}

async function postCaseConversion(item: OpsCaseWorkbenchItem, sessionToken: string): Promise<CaseConversionResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case/convert`, {
    body: JSON.stringify({}),
    headers: {
      "content-type": "application/json",
      "x-kuquba-dev-session": sessionToken
    },
    method: "POST"
  });

  const payload = (await response.json().catch(() => ({}))) as CaseConversionResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_conversion_failed");
  }

  return payload;
}

async function patchCaseConversion(
  item: OpsCaseWorkbenchItem,
  patch: Partial<{ nextMilestone: string; status: PropertyOnboardingStatus | StayProposalStatus }>,
  sessionToken: string
): Promise<CaseConversionResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case/conversion`, {
    body: JSON.stringify(patch),
    headers: {
      "content-type": "application/json",
      "x-kuquba-dev-session": sessionToken
    },
    method: "PATCH"
  });

  const payload = (await response.json().catch(() => ({}))) as CaseConversionResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_conversion_update_failed");
  }

  return payload;
}

async function patchConversionChecklist(
  item: OpsCaseWorkbenchItem,
  key: string,
  status: TaskStatus,
  sessionToken: string
): Promise<CaseConversionResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case/conversion/checklist/${key}`,
    {
      body: JSON.stringify({ status }),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "PATCH"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as CaseConversionResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_conversion_checklist_failed");
  }

  return payload;
}

async function postProposalVersion(
  item: OpsCaseWorkbenchItem,
  body: { internalNotes?: string; summary: string; termsLabel: string },
  sessionToken: string
): Promise<CaseConversionResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case/conversion/versions`,
    {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "POST"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as CaseConversionResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_conversion_version_failed");
  }

  return payload;
}

async function postCaseNote(item: OpsCaseWorkbenchItem, body: string, sessionToken: string): Promise<CaseDetailResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case/notes`, {
    body: JSON.stringify({ body }),
    headers: {
      "content-type": "application/json",
      "x-kuquba-dev-session": sessionToken
    },
    method: "POST"
  });

  const payload = (await response.json().catch(() => ({}))) as CaseDetailResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_note_failed");
  }

  return payload;
}

async function postCaseTask(
  item: OpsCaseWorkbenchItem,
  body: { dueLabel?: string; priority: Priority; title: string },
  sessionToken: string
): Promise<CaseDetailResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case/tasks`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-kuquba-dev-session": sessionToken
    },
    method: "POST"
  });

  const payload = (await response.json().catch(() => ({}))) as CaseDetailResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_task_failed");
  }

  return payload;
}

async function patchCaseTask(
  item: OpsCaseWorkbenchItem,
  taskId: string,
  status: TaskStatus,
  sessionToken: string
): Promise<CaseDetailResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case/tasks/${taskId}`,
    {
      body: JSON.stringify({ status }),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "PATCH"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as CaseDetailResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_task_update_failed");
  }

  return payload;
}

function getItemType(item: OpsCaseWorkbenchItem) {
  return item.kind === "ownerLead" ? "owner-lead" : "stay-proposal-request";
}

function formatDateTime(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(date);
}