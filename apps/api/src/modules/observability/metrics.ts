import type { FastifyRequest } from "fastify";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";

type Labels = Record<string, string>;

type HttpMetricKey = string;

type HttpMetric = {
  bucketCounts: number[];
  count: number;
  durationSumMs: number;
  labels: Labels;
};

const serviceName = "kuquba-api";
const startedAt = new Date();
const httpDurationBucketsMs = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
const httpMetrics = new Map<HttpMetricKey, HttpMetric>();

export function observeHttpRequest(input: {
  durationMs: number;
  method: string;
  route: string;
  statusCode: number;
}) {
  const labels = {
    method: input.method.toUpperCase(),
    route: normalizeRouteLabel(input.route),
    status_class: `${Math.floor(input.statusCode / 100)}xx`,
    status_code: `${input.statusCode}`
  };
  const key = buildMetricKey(labels);
  const metric = httpMetrics.get(key) ?? {
    bucketCounts: httpDurationBucketsMs.map(() => 0),
    count: 0,
    durationSumMs: 0,
    labels
  };

  metric.count += 1;
  metric.durationSumMs += input.durationMs;

  httpDurationBucketsMs.forEach((bucket, index) => {
    if (input.durationMs <= bucket) {
      metric.bucketCounts[index] = (metric.bucketCounts[index] ?? 0) + 1;
    }
  });

  httpMetrics.set(key, metric);
}

export function getRouteMetricLabel(request: FastifyRequest) {
  return request.routeOptions.url ?? "unknown";
}

export async function renderPrometheusMetrics() {
  const sections = [
    renderBuildMetrics(),
    renderRuntimeMetrics(),
    renderHttpMetrics(),
    await renderDomainMetrics()
  ];

  return `${sections.filter(Boolean).join("\n")}\n`;
}

function renderBuildMetrics() {
  return [
    help("kuquba_api_build_info", "Static service metadata."),
    type("kuquba_api_build_info", "gauge"),
    sample(
      "kuquba_api_build_info",
      {
        node_env: env.NODE_ENV,
        service: serviceName
      },
      1
    ),
    help("kuquba_api_start_time_seconds", "Unix timestamp when the API process started."),
    type("kuquba_api_start_time_seconds", "gauge"),
    sample("kuquba_api_start_time_seconds", {}, startedAt.getTime() / 1000)
  ].join("\n");
}

function renderRuntimeMetrics() {
  const memory = process.memoryUsage();

  return [
    help("kuquba_api_process_uptime_seconds", "API process uptime in seconds."),
    type("kuquba_api_process_uptime_seconds", "gauge"),
    sample("kuquba_api_process_uptime_seconds", {}, process.uptime()),
    help("kuquba_api_process_heap_used_bytes", "Node.js heap used in bytes."),
    type("kuquba_api_process_heap_used_bytes", "gauge"),
    sample("kuquba_api_process_heap_used_bytes", {}, memory.heapUsed),
    help("kuquba_api_process_rss_bytes", "Resident set size in bytes."),
    type("kuquba_api_process_rss_bytes", "gauge"),
    sample("kuquba_api_process_rss_bytes", {}, memory.rss)
  ].join("\n");
}

function renderHttpMetrics() {
  const lines = [
    help("kuquba_http_requests_total", "Total HTTP requests observed by method, route and status."),
    type("kuquba_http_requests_total", "counter"),
    help("kuquba_http_request_duration_ms", "HTTP request duration histogram in milliseconds."),
    type("kuquba_http_request_duration_ms", "histogram")
  ];

  for (const metric of httpMetrics.values()) {
    lines.push(sample("kuquba_http_requests_total", metric.labels, metric.count));

    httpDurationBucketsMs.forEach((bucket, index) => {
      lines.push(
        sample(
          "kuquba_http_request_duration_ms_bucket",
          {
            ...metric.labels,
            le: `${bucket}`
          },
          metric.bucketCounts[index] ?? 0
        )
      );
    });
    lines.push(
      sample(
        "kuquba_http_request_duration_ms_bucket",
        {
          ...metric.labels,
          le: "+Inf"
        },
        metric.count
      )
    );
    lines.push(sample("kuquba_http_request_duration_ms_count", metric.labels, metric.count));
    lines.push(
      sample("kuquba_http_request_duration_ms_sum", metric.labels, metric.durationSumMs)
    );
  }

  return lines.join("\n");
}

async function renderDomainMetrics() {
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const [
    reservationStatusCounts,
    paymentStatusCounts,
    formalDeliveryStatusCounts,
    housekeepingStatusCounts,
    maintenanceStatusSeverityCounts,
    auditResultCounts,
    expiredHoldCount,
    stalePendingPaymentCount,
    retryableFormalDeliveryFailureCount,
    blockedHousekeepingCount,
    blockedMaintenanceCount,
    recentAuditFailureCount
  ] = await Promise.all([
    prisma.reservation.groupBy({
      _count: {
        _all: true
      },
      by: ["status"]
    }),
    prisma.payment.groupBy({
      _count: {
        _all: true
      },
      by: ["status"]
    }),
    prisma.opsFormalDelivery.groupBy({
      _count: {
        _all: true
      },
      by: ["status"]
    }),
    prisma.housekeepingTask.groupBy({
      _count: {
        _all: true
      },
      by: ["status"]
    }),
    prisma.maintenanceTicket.groupBy({
      _count: {
        _all: true
      },
      by: ["status", "severity"]
    }),
    prisma.auditEvent.groupBy({
      _count: {
        _all: true
      },
      by: ["result"]
    }),
    prisma.reservation.count({
      where: {
        holdExpiresAt: {
          lt: now
        },
        status: "HOLD"
      }
    }),
    prisma.payment.count({
      where: {
        expiresAt: {
          lt: now
        },
        status: "PENDING"
      }
    }),
    prisma.opsFormalDelivery.count({
      where: {
        nextAttemptAt: {
          not: null
        },
        status: "FAILED"
      }
    }),
    prisma.housekeepingTask.count({
      where: {
        status: "BLOCKED"
      }
    }),
    prisma.maintenanceTicket.count({
      where: {
        severity: {
          in: ["HIGH", "URGENT"]
        },
        status: {
          in: ["OPEN", "TRIAGED", "SCHEDULED", "IN_PROGRESS"]
        }
      }
    }),
    prisma.auditEvent.count({
      where: {
        createdAt: {
          gte: fifteenMinutesAgo
        },
        result: {
          in: ["DENIED", "FAILED"]
        }
      }
    })
  ]);

  const lines = [
    help("kuquba_domain_reservations_total", "Reservations grouped by status."),
    type("kuquba_domain_reservations_total", "gauge"),
    ...reservationStatusCounts.map((entry) =>
      sample("kuquba_domain_reservations_total", { status: entry.status }, entry._count._all)
    ),
    help("kuquba_domain_payments_total", "Payments grouped by status."),
    type("kuquba_domain_payments_total", "gauge"),
    ...paymentStatusCounts.map((entry) =>
      sample("kuquba_domain_payments_total", { status: entry.status }, entry._count._all)
    ),
    help("kuquba_domain_formal_deliveries_total", "Formal deliveries grouped by status."),
    type("kuquba_domain_formal_deliveries_total", "gauge"),
    ...formalDeliveryStatusCounts.map((entry) =>
      sample("kuquba_domain_formal_deliveries_total", { status: entry.status }, entry._count._all)
    ),
    help("kuquba_domain_housekeeping_tasks_total", "Housekeeping tasks grouped by status."),
    type("kuquba_domain_housekeeping_tasks_total", "gauge"),
    ...housekeepingStatusCounts.map((entry) =>
      sample("kuquba_domain_housekeeping_tasks_total", { status: entry.status }, entry._count._all)
    ),
    help(
      "kuquba_domain_maintenance_tickets_total",
      "Maintenance tickets grouped by status and severity."
    ),
    type("kuquba_domain_maintenance_tickets_total", "gauge"),
    ...maintenanceStatusSeverityCounts.map((entry) =>
      sample(
        "kuquba_domain_maintenance_tickets_total",
        { severity: entry.severity, status: entry.status },
        entry._count._all
      )
    ),
    help("kuquba_domain_audit_events_total", "Audit events grouped by result."),
    type("kuquba_domain_audit_events_total", "gauge"),
    ...auditResultCounts.map((entry) =>
      sample("kuquba_domain_audit_events_total", { result: entry.result }, entry._count._all)
    ),
    help("kuquba_domain_expired_holds_total", "HOLD reservations past holdExpiresAt."),
    type("kuquba_domain_expired_holds_total", "gauge"),
    sample("kuquba_domain_expired_holds_total", {}, expiredHoldCount),
    help("kuquba_domain_stale_pending_payments_total", "PENDING payments past expiresAt."),
    type("kuquba_domain_stale_pending_payments_total", "gauge"),
    sample("kuquba_domain_stale_pending_payments_total", {}, stalePendingPaymentCount),
    help(
      "kuquba_domain_retryable_formal_delivery_failures_total",
      "FAILED formal deliveries with nextAttemptAt scheduled."
    ),
    type("kuquba_domain_retryable_formal_delivery_failures_total", "gauge"),
    sample(
      "kuquba_domain_retryable_formal_delivery_failures_total",
      {},
      retryableFormalDeliveryFailureCount
    ),
    help("kuquba_domain_blocked_housekeeping_tasks_total", "Blocked housekeeping tasks."),
    type("kuquba_domain_blocked_housekeeping_tasks_total", "gauge"),
    sample("kuquba_domain_blocked_housekeeping_tasks_total", {}, blockedHousekeepingCount),
    help(
      "kuquba_domain_priority_maintenance_tickets_total",
      "Active HIGH or URGENT maintenance tickets."
    ),
    type("kuquba_domain_priority_maintenance_tickets_total", "gauge"),
    sample("kuquba_domain_priority_maintenance_tickets_total", {}, blockedMaintenanceCount),
    help(
      "kuquba_domain_recent_audit_failures_total",
      "DENIED or FAILED audit events in the last 15 minutes."
    ),
    type("kuquba_domain_recent_audit_failures_total", "gauge"),
    sample("kuquba_domain_recent_audit_failures_total", {}, recentAuditFailureCount)
  ];

  return lines.join("\n");
}

function normalizeRouteLabel(route: string) {
  const normalized = route.trim();

  return normalized ? normalized.slice(0, 180) : "unknown";
}

function buildMetricKey(labels: Labels) {
  return Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
}

function help(name: string, text: string) {
  return `# HELP ${name} ${escapeHelpText(text)}`;
}

function type(name: string, metricType: "counter" | "gauge" | "histogram") {
  return `# TYPE ${name} ${metricType}`;
}

function sample(name: string, labels: Labels, value: number) {
  const labelText = Object.keys(labels).length > 0 ? `{${formatLabels(labels)}}` : "";

  return `${name}${labelText} ${formatMetricValue(value)}`;
}

function formatLabels(labels: Labels) {
  return Object.entries(labels)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}="${escapeLabelValue(value)}"`)
    .join(",");
}

function formatMetricValue(value: number) {
  return Number.isFinite(value) ? `${value}` : "0";
}

function escapeHelpText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n");
}

function escapeLabelValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll('"', '\\"');
}