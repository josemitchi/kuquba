"use client";

import {
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
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
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!sessionToken || !selectedItem) {
      setCaseDetail(null);
      setLoadState("idle");
      setNextStep("");
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