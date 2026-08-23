"use client";

import {
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardList,
  Eye,
  FileText,
  GitBranch,
  History,
  MessageSquareText,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  UserCheck,
  UserX,
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
type PropertyOnboardingStatus =
  "DRAFT" | "QUALIFICATION" | "DOCUMENTS" | "OPERATIONS_READY" | "CLOSED";
type StayProposalStatus = "DRAFT" | "READY_TO_SEND" | "SENT" | "ACCEPTED" | "DECLINED" | "VOID";
type FormalApprovalStatus = "DRAFT" | "READY_FOR_APPROVAL" | "APPROVED" | "SENT";
type FormalDeliveryStatus = "PENDING" | "SENT" | "DELIVERED" | "FAILED";
type FormalTransitionAction = "approval-request" | "approve" | "send";
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

type OpsCaseAssignee = {
  displayName: string;
  email: string;
  id: string;
} | null;

type OpsFormalActivity = {
  actor: OpsCaseAssignee;
  body: string;
  createdAt: string;
  id: string;
};

type StayProposalPreview = {
  body: string[];
  readinessLabel: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
};

type OpsFormalDeliveryState = {
  channel?: string | null;
  deliveredAt?: string | null;
  errorMessage?: string | null;
  failedAt?: string | null;
  provider?: string | null;
  providerMessageId?: string | null;
  status: FormalDeliveryStatus;
  statusLabel: string;
  templateKey?: string | null;
  templateVersion?: number | null;
} | null;

type OpsFormalState = {
  approvedAt?: string | null;
  approvedBy: OpsCaseAssignee;
  canSend: boolean;
  delivery: OpsFormalDeliveryState;
  deliveryNotes?: string | null;
  sentAt?: string | null;
  sentBy: OpsCaseAssignee;
  status: FormalApprovalStatus;
  statusLabel: string;
};

type OpsFormalDelivery = {
  actor: OpsCaseAssignee;
  channel: string;
  createdAt: string;
  deliveredAt?: string | null;
  errorMessage?: string | null;
  failedAt?: string | null;
  id: string;
  provider: string;
  providerMessageId?: string | null;
  recipientMasked: string;
  sentAt?: string | null;
  status: FormalDeliveryStatus;
  statusLabel: string;
  subject: string;
  templateKey: string;
  templateVersion: number;
};

type FormalAssigneeAction = "ASSIGN_SELF" | "CLEAR";

type CurrentOpsUser = {
  displayName: string;
  emailMasked: string;
  id: string;
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
      assignee: OpsCaseAssignee;
      targetDate?: string | null;
      handoffNotes?: string | null;
      formalState: OpsFormalState;
      activities: OpsFormalActivity[];
      deliveries: OpsFormalDelivery[];
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
      assignee: OpsCaseAssignee;
      targetDate?: string | null;
      handoffNotes?: string | null;
      formalState: OpsFormalState;
      activities: OpsFormalActivity[];
      deliveries: OpsFormalDelivery[];
      preview: StayProposalPreview;
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

type OpsFormalConversion = Exclude<OpsCaseConversion, null>;

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
  canApproveFormal,
  currentUser,
  selectedItem,
  sessionToken
}: {
  canApproveFormal: boolean;
  currentUser: CurrentOpsUser | null;
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
  const [formalTargetDate, setFormalTargetDate] = useState("");
  const [formalHandoffNotes, setFormalHandoffNotes] = useState("");
  const [formalActivityBody, setFormalActivityBody] = useState("");
  const [proposalSummary, setProposalSummary] = useState("");
  const [proposalTermsLabel, setProposalTermsLabel] = useState(
    "Borrador interno sujeto a disponibilidad final"
  );
  const [proposalInternalNotes, setProposalInternalNotes] = useState("");
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!sessionToken || !selectedItem) {
      setCaseDetail(null);
      setLoadState("idle");
      setNextStep("");
      setConversionMilestone("");
      setFormalTargetDate("");
      setFormalHandoffNotes("");
      setFormalActivityBody("");
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

    if (detail.conversion) {
      setFormalTargetDate(detail.conversion.targetDate ?? "");
      setFormalHandoffNotes(detail.conversion.handoffNotes ?? "");
    } else {
      setFormalTargetDate("");
      setFormalHandoffNotes("");
    }

    if (detail.conversion?.kind === "propertyOnboarding") {
      setConversionMilestone(detail.conversion.nextMilestone);
    } else {
      setConversionMilestone("");
    }
  }

  async function handleCaseUpdate(
    patch: Partial<{ nextStep: string | null; priority: Priority; status: CaseStatus }>
  ) {
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
      const response = await patchCaseTask(
        caseDetail.source.item,
        task.id,
        nextStatus,
        sessionToken
      );
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

  async function handleConversionStatusChange(
    status: PropertyOnboardingStatus | StayProposalStatus
  ) {
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
      const response = await patchCaseConversion(
        caseDetail.source.item,
        { nextMilestone },
        sessionToken
      );
      applyCaseDetail(response.caseDetail);
      setNotice({ kind: "success", text: "Hito de onboarding actualizado." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo actualizar el hito." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleFormalAssignmentChange(assigneeAction: FormalAssigneeAction) {
    if (!sessionToken || !caseDetail || !caseDetail.conversion) {
      return;
    }

    setUpdatingKey("conversion:assignee");
    setNotice(null);

    try {
      const response = await patchCaseConversion(
        caseDetail.source.item,
        { assigneeAction },
        sessionToken
      );
      applyCaseDetail(response.caseDetail);
      setNotice({
        kind: "success",
        text: assigneeAction === "ASSIGN_SELF" ? "Responsable asignado." : "Responsable liberado."
      });
    } catch {
      setNotice({ kind: "error", text: "No se pudo actualizar el responsable." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleFormalPlanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sessionToken || !caseDetail || !caseDetail.conversion) {
      return;
    }

    setUpdatingKey("conversion:plan");
    setNotice(null);

    try {
      const response = await patchCaseConversion(
        caseDetail.source.item,
        {
          handoffNotes: formalHandoffNotes.trim() || null,
          targetDate: formalTargetDate || null
        },
        sessionToken
      );
      applyCaseDetail(response.caseDetail);
      setNotice({ kind: "success", text: "Plan formal actualizado." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo actualizar el plan formal." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleFormalActivitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !sessionToken ||
      !caseDetail ||
      !caseDetail.conversion ||
      formalActivityBody.trim().length < 3
    ) {
      return;
    }

    setUpdatingKey("conversion:activity");
    setNotice(null);

    try {
      const response = await postFormalActivity(
        caseDetail.source.item,
        formalActivityBody.trim(),
        sessionToken
      );
      applyCaseDetail(response.caseDetail);
      setFormalActivityBody("");
      setNotice({ kind: "success", text: "Actividad formal registrada." });
    } catch {
      setNotice({ kind: "error", text: "No se pudo registrar la actividad formal." });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleFormalTransition(action: FormalTransitionAction) {
    if (!sessionToken || !caseDetail || !caseDetail.conversion) {
      return;
    }

    setUpdatingKey(`conversion:${action}`);
    setNotice(null);

    try {
      const response = await postFormalTransition(
        caseDetail.source.item,
        action,
        { note: formalHandoffNotes.trim() || undefined },
        sessionToken
      );
      applyCaseDetail(response.caseDetail);
      setNotice({ kind: "success", text: buildFormalTransitionNotice(action) });
    } catch {
      setNotice({ kind: "error", text: "No se pudo actualizar la aprobacion formal." });
    } finally {
      setUpdatingKey(null);
    }
  }
  async function handleChecklistStatusChange(item: {
    key: string;
    label: string;
    status: TaskStatus;
  }) {
    if (!sessionToken || !caseDetail || caseDetail.conversion?.kind !== "propertyOnboarding") {
      return;
    }

    const nextStatus: TaskStatus = item.status === "DONE" ? "OPEN" : "DONE";
    setUpdatingKey(`conversion:checklist:${item.key}`);
    setNotice(null);

    try {
      const response = await patchConversionChecklist(
        caseDetail.source.item,
        item.key,
        nextStatus,
        sessionToken
      );
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
        <CompactState
          icon={RefreshCw}
          title="Cargando expediente"
          body="Sincronizando notas y tareas."
        />
      ) : loadState === "error" ? (
        <CompactState
          icon={ShieldCheck}
          title="No se pudo abrir"
          body="La API no devolvio el expediente."
        />
      ) : !caseDetail ? (
        <CompactState
          icon={FileText}
          title="Sin expediente seleccionado"
          body="Abre un item de la bandeja para ver su flujo."
        />
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
            <CaseMetric
              label="Tareas"
              value={`${caseDetail.metrics.openTaskCount}/${caseDetail.metrics.taskCount}`}
            />
            <CaseMetric label="Notas" value={`${caseDetail.metrics.noteCount}`} />
            <CaseMetric label="Estado" value={caseDetail.statusLabel} />
          </div>

          <ConversionSection
            canApproveFormal={canApproveFormal}
            caseDetail={caseDetail}
            conversionMilestone={conversionMilestone}
            currentUser={currentUser}
            formalActivityBody={formalActivityBody}
            formalHandoffNotes={formalHandoffNotes}
            formalTargetDate={formalTargetDate}
            onChecklistStatusChange={handleChecklistStatusChange}
            onConversionMilestoneChange={setConversionMilestone}
            onConversionMilestoneSubmit={handleConversionMilestoneSubmit}
            onConversionStatusChange={handleConversionStatusChange}
            onConvert={handleConvertCase}
            onFormalActivityBodyChange={setFormalActivityBody}
            onFormalActivitySubmit={handleFormalActivitySubmit}
            onFormalAssignmentChange={handleFormalAssignmentChange}
            onFormalHandoffNotesChange={setFormalHandoffNotes}
            onFormalPlanSubmit={handleFormalPlanSubmit}
            onFormalTransition={handleFormalTransition}
            onFormalTargetDateChange={setFormalTargetDate}
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
            <label
              className="block text-xs font-semibold uppercase text-ink/48"
              htmlFor="case-next-step"
            >
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
                <div
                  className="border-b border-line pb-3 text-sm last:border-b-0 last:pb-0"
                  key={note.id}
                >
                  <p className="leading-6 text-ink/76">{note.body}</p>
                  <p className="mt-2 text-xs text-ink/50">
                    {note.author?.displayName ?? "KUQUBA"} - {formatDateTime(note.createdAt)}
                  </p>
                </div>
              ))}
              {caseDetail.notes.length === 0 ? (
                <p className="text-sm leading-6 text-ink/62">Sin notas.</p>
              ) : null}
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
              {caseDetail.tasks.length === 0 ? (
                <p className="text-sm leading-6 text-ink/62">Sin tareas.</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ConversionSection({
  canApproveFormal,
  caseDetail,
  conversionMilestone,
  currentUser,
  formalActivityBody,
  formalHandoffNotes,
  formalTargetDate,
  onChecklistStatusChange,
  onConversionMilestoneChange,
  onConversionMilestoneSubmit,
  onConversionStatusChange,
  onConvert,
  onFormalActivityBodyChange,
  onFormalActivitySubmit,
  onFormalAssignmentChange,
  onFormalHandoffNotesChange,
  onFormalPlanSubmit,
  onFormalTransition,
  onFormalTargetDateChange,
  onProposalInternalNotesChange,
  onProposalSummaryChange,
  onProposalTermsLabelChange,
  onProposalVersionSubmit,
  proposalInternalNotes,
  proposalSummary,
  proposalTermsLabel,
  updatingKey
}: {
  canApproveFormal: boolean;
  caseDetail: OpsCaseDetail;
  conversionMilestone: string;
  currentUser: CurrentOpsUser | null;
  formalActivityBody: string;
  formalHandoffNotes: string;
  formalTargetDate: string;
  onChecklistStatusChange: (item: { key: string; label: string; status: TaskStatus }) => void;
  onConversionMilestoneChange: (value: string) => void;
  onConversionMilestoneSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onConversionStatusChange: (status: PropertyOnboardingStatus | StayProposalStatus) => void;
  onConvert: () => void;
  onFormalActivityBodyChange: (value: string) => void;
  onFormalActivitySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormalAssignmentChange: (action: FormalAssigneeAction) => void;
  onFormalHandoffNotesChange: (value: string) => void;
  onFormalPlanSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormalTransition: (action: FormalTransitionAction) => void;
  onFormalTargetDateChange: (value: string) => void;
  onProposalInternalNotesChange: (value: string) => void;
  onProposalSummaryChange: (value: string) => void;
  onProposalTermsLabelChange: (value: string) => void;
  onProposalVersionSubmit: (event: FormEvent<HTMLFormElement>) => void;
  proposalInternalNotes: string;
  proposalSummary: string;
  proposalTermsLabel: string;
  updatingKey: string | null;
}) {
  const conversionLabel =
    caseDetail.source.item.kind === "ownerLead"
      ? "Convertir a onboarding"
      : "Convertir a propuesta";

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

        <FormalOpsControls
          canApproveFormal={canApproveFormal}
          conversion={conversion}
          currentUser={currentUser}
          formalActivityBody={formalActivityBody}
          formalHandoffNotes={formalHandoffNotes}
          formalTargetDate={formalTargetDate}
          onFormalActivityBodyChange={onFormalActivityBodyChange}
          onFormalActivitySubmit={onFormalActivitySubmit}
          onFormalAssignmentChange={onFormalAssignmentChange}
          onFormalHandoffNotesChange={onFormalHandoffNotesChange}
          onFormalPlanSubmit={onFormalPlanSubmit}
          onFormalTransition={onFormalTransition}
          onFormalTargetDateChange={onFormalTargetDateChange}
          updatingKey={updatingKey}
        />

        <form className="mt-4 space-y-3" onSubmit={onConversionMilestoneSubmit}>
          <label
            className="block text-xs font-semibold uppercase text-ink/48"
            htmlFor="conversion-next-milestone"
          >
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
            disabled={
              updatingKey === "conversion:milestone" || conversionMilestone.trim().length === 0
            }
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

      <FormalOpsControls
        canApproveFormal={canApproveFormal}
        conversion={conversion}
        currentUser={currentUser}
        formalActivityBody={formalActivityBody}
        formalHandoffNotes={formalHandoffNotes}
        formalTargetDate={formalTargetDate}
        onFormalActivityBodyChange={onFormalActivityBodyChange}
        onFormalActivitySubmit={onFormalActivitySubmit}
        onFormalAssignmentChange={onFormalAssignmentChange}
        onFormalHandoffNotesChange={onFormalHandoffNotesChange}
        onFormalPlanSubmit={onFormalPlanSubmit}
        onFormalTransition={onFormalTransition}
        onFormalTargetDateChange={onFormalTargetDateChange}
        updatingKey={updatingKey}
      />

      <ProposalPreviewBlock preview={conversion.preview} />

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
          disabled={
            updatingKey === "conversion:version" ||
            proposalSummary.trim().length < 8 ||
            proposalTermsLabel.trim().length < 4
          }
          type="submit"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Crear version
        </button>
      </form>
    </div>
  );
}

function FormalOpsControls({
  canApproveFormal,
  conversion,
  currentUser,
  formalActivityBody,
  formalHandoffNotes,
  formalTargetDate,
  onFormalActivityBodyChange,
  onFormalActivitySubmit,
  onFormalAssignmentChange,
  onFormalHandoffNotesChange,
  onFormalPlanSubmit,
  onFormalTransition,
  onFormalTargetDateChange,
  updatingKey
}: {
  canApproveFormal: boolean;
  conversion: OpsFormalConversion;
  currentUser: CurrentOpsUser | null;
  formalActivityBody: string;
  formalHandoffNotes: string;
  formalTargetDate: string;
  onFormalActivityBodyChange: (value: string) => void;
  onFormalActivitySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormalAssignmentChange: (action: FormalAssigneeAction) => void;
  onFormalHandoffNotesChange: (value: string) => void;
  onFormalPlanSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFormalTransition: (action: FormalTransitionAction) => void;
  onFormalTargetDateChange: (value: string) => void;
  updatingKey: string | null;
}) {
  return (
    <div className="mt-4 border-y border-green/20 py-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <FormalSummaryItem
          detail={conversion.assignee?.email ?? "Pendiente"}
          icon={UserCheck}
          label="Responsable"
          value={conversion.assignee?.displayName ?? "Sin responsable"}
        />
        <FormalSummaryItem
          detail={conversion.targetDate ? "Fecha objetivo" : "Pendiente"}
          icon={CalendarDays}
          label="Objetivo"
          value={formatDateOnlyLabel(conversion.targetDate)}
        />
        <FormalSummaryItem
          detail={buildFormalStateDetail(conversion.formalState)}
          icon={ShieldCheck}
          label="Aprobacion"
          value={conversion.formalState.statusLabel}
        />
        <FormalSummaryItem
          detail={buildDeliveryStateDetail(conversion.formalState.delivery)}
          icon={Send}
          label="Entrega"
          value={conversion.formalState.delivery?.statusLabel ?? "Sin envio"}
        />
      </div>

      {conversion.formalState.delivery ? (
        <div className="mt-3 rounded-[6px] border border-line bg-white px-3 py-2 text-xs leading-5 text-ink/68">
          <p className="font-semibold text-midnight">
            {conversion.formalState.delivery.provider ?? "Proveedor pendiente"} -{" "}
            {conversion.formalState.delivery.templateKey ?? "plantilla"} v
            {conversion.formalState.delivery.templateVersion ?? 1}
          </p>
          <p className="mt-1">
            ID proveedor: {conversion.formalState.delivery.providerMessageId ?? "pendiente"}
          </p>
          {conversion.formalState.delivery.errorMessage ? (
            <p className="mt-1 text-terracotta">{conversion.formalState.delivery.errorMessage}</p>
          ) : null}
        </div>
      ) : null}

      {conversion.formalState.deliveryNotes ? (
        <p className="mt-3 rounded-[6px] border border-line bg-white px-3 py-2 text-xs leading-5 text-ink/68">
          {conversion.formalState.deliveryNotes}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-3 text-xs font-semibold text-midnight transition hover:border-green hover:text-green disabled:cursor-not-allowed disabled:opacity-55"
          disabled={
            !currentUser ||
            updatingKey === "conversion:assignee" ||
            conversion.assignee?.id === currentUser.id
          }
          onClick={() => onFormalAssignmentChange("ASSIGN_SELF")}
          type="button"
        >
          <UserCheck aria-hidden className="h-4 w-4" />
          Asignarme
        </button>
        <button
          className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-3 text-xs font-semibold text-midnight transition hover:border-terracotta hover:text-terracotta disabled:cursor-not-allowed disabled:opacity-55"
          disabled={updatingKey === "conversion:assignee" || !conversion.assignee}
          onClick={() => onFormalAssignmentChange("CLEAR")}
          type="button"
        >
          <UserX aria-hidden className="h-4 w-4" />
          Liberar
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-3 text-xs font-semibold text-midnight transition hover:border-green hover:text-green disabled:cursor-not-allowed disabled:opacity-55"
          disabled={
            updatingKey === "conversion:approval-request" ||
            conversion.formalState.status !== "DRAFT"
          }
          onClick={() => onFormalTransition("approval-request")}
          type="button"
        >
          <ShieldCheck aria-hidden className="h-4 w-4" />
          Solicitar aprobacion
        </button>
        <button
          className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-3 text-xs font-semibold text-midnight transition hover:border-green hover:text-green disabled:cursor-not-allowed disabled:opacity-55"
          disabled={
            !canApproveFormal ||
            updatingKey === "conversion:approve" ||
            conversion.formalState.status !== "READY_FOR_APPROVAL"
          }
          onClick={() => onFormalTransition("approve")}
          type="button"
        >
          <ShieldCheck aria-hidden className="h-4 w-4" />
          Aprobar
        </button>
        <button
          className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-3 text-xs font-semibold text-midnight transition hover:border-green hover:text-green disabled:cursor-not-allowed disabled:opacity-55"
          disabled={
            !canApproveFormal ||
            updatingKey === "conversion:send" ||
            !conversion.formalState.canSend
          }
          onClick={() => onFormalTransition("send")}
          type="button"
        >
          <Send aria-hidden className="h-4 w-4" />
          {conversion.kind === "stayProposal" ? "Registrar envio" : "Registrar entrega"}
        </button>
      </div>

      <form className="mt-4 grid gap-3" onSubmit={onFormalPlanSubmit}>
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <input
            aria-label="Fecha objetivo formal"
            className="focus-ring min-h-10 rounded-[6px] border border-line bg-white px-3 text-sm text-ink outline-none"
            onChange={(event) => onFormalTargetDateChange(event.target.value)}
            type="date"
            value={formalTargetDate}
          />
          <textarea
            aria-label="Notas de entrega formal"
            className="focus-ring min-h-20 w-full resize-none rounded-[6px] border border-line bg-white px-3 py-2 text-sm leading-6 text-ink outline-none"
            maxLength={700}
            onChange={(event) => onFormalHandoffNotesChange(event.target.value)}
            placeholder="Notas de entrega"
            value={formalHandoffNotes}
          />
        </div>
        <button
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-midnight px-4 text-sm font-semibold text-white transition hover:bg-midnight/90 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={updatingKey === "conversion:plan"}
          type="submit"
        >
          <Save aria-hidden className="h-4 w-4" />
          Guardar plan
        </button>
      </form>

      <form className="mt-4 grid gap-3" onSubmit={onFormalActivitySubmit}>
        <textarea
          aria-label="Actividad formal"
          className="focus-ring min-h-20 w-full resize-none rounded-[6px] border border-line bg-white px-3 py-2 text-sm leading-6 text-ink outline-none"
          maxLength={1000}
          onChange={(event) => onFormalActivityBodyChange(event.target.value)}
          placeholder="Registrar actividad formal"
          value={formalActivityBody}
        />
        <button
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={updatingKey === "conversion:activity" || formalActivityBody.trim().length < 3}
          type="submit"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Registrar actividad
        </button>
      </form>

      <div className="mt-4">
        <div className="flex items-center gap-2">
          <Send aria-hidden className="h-4 w-4 text-green" />
          <p className="text-xs font-semibold uppercase text-ink/48">Historial de entrega</p>
        </div>
        <div className="mt-3 space-y-3">
          {conversion.deliveries.map((delivery) => (
            <div
              className="border-b border-green/20 pb-3 text-sm last:border-b-0 last:pb-0"
              key={delivery.id}
            >
              <p className="font-semibold text-midnight">
                {delivery.statusLabel} - {delivery.subject}
              </p>
              <p className="mt-1 text-xs text-ink/52">
                {delivery.provider} - {delivery.templateKey} v{delivery.templateVersion} -{" "}
                {delivery.recipientMasked}
              </p>
              <p className="mt-1 text-xs text-ink/52">
                {delivery.providerMessageId ?? "sin id proveedor"} -{" "}
                {formatDateTime(delivery.createdAt)}
              </p>
              {delivery.errorMessage ? (
                <p className="mt-1 text-xs text-terracotta">{delivery.errorMessage}</p>
              ) : null}
            </div>
          ))}
          {conversion.deliveries.length === 0 ? (
            <p className="text-sm leading-6 text-ink/62">Sin intentos de entrega.</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2">
          <History aria-hidden className="h-4 w-4 text-green" />
          <p className="text-xs font-semibold uppercase text-ink/48">Actividad formal</p>
        </div>
        <div className="mt-3 space-y-3">
          {conversion.activities.map((activity) => (
            <div
              className="border-b border-green/20 pb-3 text-sm last:border-b-0 last:pb-0"
              key={activity.id}
            >
              <p className="leading-6 text-ink/76">{activity.body}</p>
              <p className="mt-1 text-xs text-ink/52">
                {activity.actor?.displayName ?? "KUQUBA"} - {formatDateTime(activity.createdAt)}
              </p>
            </div>
          ))}
          {conversion.activities.length === 0 ? (
            <p className="text-sm leading-6 text-ink/62">Sin actividad formal.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FormalSummaryItem({
  detail,
  icon: Icon,
  label,
  value
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[6px] border border-line bg-white px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-ink/48">
        <Icon aria-hidden className="h-4 w-4 shrink-0 text-green" />
        <span>{label}</span>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-midnight">{value}</p>
      <p className="mt-1 truncate text-xs text-ink/52">{detail}</p>
    </div>
  );
}

function ProposalPreviewBlock({ preview }: { preview: StayProposalPreview }) {
  return (
    <div className="mt-4 rounded-[6px] border border-line bg-white p-3 text-sm leading-6 text-ink/72">
      <div className="flex items-center gap-2">
        <Eye aria-hidden className="h-4 w-4 text-green" />
        <p className="text-xs font-semibold uppercase text-green">Preview interno</p>
      </div>
      <p className="mt-2 font-semibold text-midnight">{preview.subject}</p>
      <p className="mt-1 text-xs text-ink/52">
        {preview.recipientName} - {preview.recipientEmail} - {preview.readinessLabel}
      </p>
      <div className="mt-3 space-y-2">
        {preview.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
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

function CompactState({
  icon: Icon,
  title,
  body
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="mt-5 rounded-[6px] border border-line bg-ivory p-5 text-center">
      <Icon aria-hidden className="mx-auto h-7 w-7 text-green" />
      <h3 className="mt-3 text-base font-semibold text-midnight">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/64">{body}</p>
    </div>
  );
}

async function fetchCaseDetail(
  item: OpsCaseWorkbenchItem,
  sessionToken: string
): Promise<CaseDetailResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case`,
    {
      headers: {
        "x-kuquba-dev-session": sessionToken
      }
    }
  );

  const payload = (await response.json().catch(() => ({}))) as CaseDetailResponse & {
    error?: string;
  };

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
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case`,
    {
      body: JSON.stringify(patch),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "PATCH"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as CaseDetailResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_update_failed");
  }

  return payload;
}

async function postCaseConversion(
  item: OpsCaseWorkbenchItem,
  sessionToken: string
): Promise<CaseConversionResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case/convert`,
    {
      body: JSON.stringify({}),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "POST"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as CaseConversionResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_conversion_failed");
  }

  return payload;
}

async function patchCaseConversion(
  item: OpsCaseWorkbenchItem,
  patch: Partial<{
    assigneeAction: FormalAssigneeAction;
    handoffNotes: string | null;
    nextMilestone: string;
    status: PropertyOnboardingStatus | StayProposalStatus;
    targetDate: string | null;
  }>,
  sessionToken: string
): Promise<CaseConversionResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case/conversion`,
    {
      body: JSON.stringify(patch),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "PATCH"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as CaseConversionResponse & {
    error?: string;
  };

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

  const payload = (await response.json().catch(() => ({}))) as CaseConversionResponse & {
    error?: string;
  };

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

  const payload = (await response.json().catch(() => ({}))) as CaseConversionResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_conversion_version_failed");
  }

  return payload;
}

async function postFormalActivity(
  item: OpsCaseWorkbenchItem,
  body: string,
  sessionToken: string
): Promise<CaseConversionResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case/conversion/activity`,
    {
      body: JSON.stringify({ body }),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "POST"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as CaseConversionResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_conversion_activity_failed");
  }

  return payload;
}

async function postFormalTransition(
  item: OpsCaseWorkbenchItem,
  action: FormalTransitionAction,
  body: { note?: string },
  sessionToken: string
): Promise<CaseConversionResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case/conversion/${action}`,
    {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "POST"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as CaseConversionResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_conversion_transition_failed");
  }

  return payload;
}

async function postCaseNote(
  item: OpsCaseWorkbenchItem,
  body: string,
  sessionToken: string
): Promise<CaseDetailResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case/notes`,
    {
      body: JSON.stringify({ body }),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "POST"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as CaseDetailResponse & {
    error?: string;
  };

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
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/workbench/${getItemType(item)}/${item.id}/case/tasks`,
    {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "POST"
    }
  );

  const payload = (await response.json().catch(() => ({}))) as CaseDetailResponse & {
    error?: string;
  };

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

  const payload = (await response.json().catch(() => ({}))) as CaseDetailResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "case_task_update_failed");
  }

  return payload;
}

function getItemType(item: OpsCaseWorkbenchItem) {
  return item.kind === "ownerLead" ? "owner-lead" : "stay-proposal-request";
}

function formatDateOnlyLabel(value?: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC"
  }).format(date);
}
function buildFormalStateDetail(state: OpsFormalState) {
  if (state.sentAt) {
    return `Enviado ${formatDateTime(state.sentAt)}`;
  }

  if (state.approvedAt) {
    return `Aprobado ${formatDateTime(state.approvedAt)}`;
  }

  return "Pendiente";
}

function buildDeliveryStateDetail(delivery: OpsFormalDeliveryState) {
  if (!delivery) {
    return "Pendiente";
  }

  if (delivery.failedAt) {
    return `Fallido ${formatDateTime(delivery.failedAt)}`;
  }

  if (delivery.deliveredAt) {
    return `Entregado ${formatDateTime(delivery.deliveredAt)}`;
  }

  return delivery.provider ?? "Proveedor pendiente";
}

function buildFormalTransitionNotice(action: FormalTransitionAction) {
  if (action === "approval-request") {
    return "Solicitud de aprobacion formal registrada.";
  }

  if (action === "approve") {
    return "Aprobacion interna registrada.";
  }

  return "Envio transaccional registrado por adaptador dev.";
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
