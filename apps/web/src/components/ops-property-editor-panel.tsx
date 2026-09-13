"use client";

import {
  Building2,
  DollarSign,
  Eye,
  ImageIcon,
  ListChecks,
  RefreshCw,
  Save,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { getDevPortalApiBaseUrl } from "./use-dev-portal-session";

type PropertyVisibility = "PUBLIC" | "SEGMENTED" | "PRIVATE";

type OpsPropertyImage = {
  alt: string;
  id: string;
  isCover: boolean;
  sortOrder: number;
  url: string;
};

type OpsProperty = {
  amenities: string[];
  baseNightlyRate: string;
  bathrooms: number;
  bedrooms: number;
  bookingNote: string;
  cleaningFee: string;
  contractStatus: string;
  coverImageUrl: string;
  currency: string;
  destination: string;
  houseRules: string[];
  id: string;
  images: OpsPropertyImage[];
  maxGuests: number;
  minNights: number;
  name: string;
  neighborhood: string;
  operations: string[];
  ratePlanName: string;
  serviceFeeBps: number;
  stayCode: string;
  stayStyle: string;
  summary: string;
  taxBps: number;
  unitName: string;
  updatedAt: string;
  visibility: PropertyVisibility;
  weekendNightlyRate: string;
};

type PropertiesResponse = {
  properties: OpsProperty[];
};

type PropertyForm = {
  amenities: string;
  baseNightlyRate: string;
  bathrooms: string;
  bedrooms: string;
  bookingNote: string;
  cleaningFee: string;
  coverImageUrl: string;
  currency: string;
  destination: string;
  galleryUrls: string;
  houseRules: string;
  maxGuests: string;
  minNights: string;
  name: string;
  neighborhood: string;
  operations: string;
  ratePlanName: string;
  serviceFeeBps: string;
  stayCode: string;
  stayStyle: string;
  summary: string;
  taxBps: string;
  unitName: string;
  visibility: PropertyVisibility;
  weekendNightlyRate: string;
};

type PropertyEditorTabKey = "overview" | "content" | "rates" | "operations" | "publishing";
type PropertyFieldUpdater = (field: keyof PropertyForm, value: string) => void;

type PropertyEditorTab = {
  icon: LucideIcon;
  key: PropertyEditorTabKey;
  label: string;
};

type LoadState = "idle" | "loading" | "ready" | "error";
type Notice = { kind: "success" | "error"; text: string } | null;

const propertyEditorTabs: PropertyEditorTab[] = [
  { icon: Building2, key: "overview", label: "Informacion" },
  { icon: ImageIcon, key: "content", label: "Contenido" },
  { icon: DollarSign, key: "rates", label: "Tarifas" },
  { icon: ListChecks, key: "operations", label: "Operacion" },
  { icon: Eye, key: "publishing", label: "Publicacion" }
];

export function OpsPropertyEditorPanel({ sessionToken }: { sessionToken: string }) {
  const [properties, setProperties] = useState<OpsProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyForm | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [activePropertyTab, setActivePropertyTab] =
    useState<PropertyEditorTabKey>("overview");

  useEffect(() => {
    void loadProperties();
  }, [sessionToken]);

  const selectedProperty = useMemo(
    () =>
      properties.find((property) => property.id === selectedPropertyId) ?? properties[0] ?? null,
    [properties, selectedPropertyId]
  );

  useEffect(() => {
    if (selectedProperty) {
      setSelectedPropertyId(selectedProperty.id);
      setForm(buildPropertyForm(selectedProperty));
      setActivePropertyTab("overview");
    }
  }, [selectedProperty?.id]);

  async function loadProperties() {
    setLoadState("loading");
    setNotice(null);

    try {
      const response = await fetchProperties(sessionToken);
      setProperties(response.properties);
      setSelectedPropertyId((current) => current ?? response.properties[0]?.id ?? null);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }

  function updateField(field: keyof PropertyForm, value: string) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form || !selectedProperty) {
      return;
    }

    setUpdating(true);
    setNotice(null);

    try {
      const response = await patchPropertyProfile(selectedProperty.id, form, sessionToken);
      setProperties(response.properties);
      setSelectedPropertyId(response.property.id);
      setForm(buildPropertyForm(response.property));
      setNotice({ kind: "success", text: "Propiedad actualizada y auditada." });
    } catch (error) {
      setNotice({
        kind: "error",
        text: getUpdateErrorMessage(
          error instanceof Error ? error.message : "property_update_failed"
        )
      });
    } finally {
      setUpdating(false);
    }
  }

  return (
    <section className="mt-7 border-y border-line py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
            <Building2 aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-green">Catalogo</p>
            <h2 className="text-2xl font-semibold text-midnight">Editor de propiedades</h2>
          </div>
        </div>
        <button
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-4 text-sm font-semibold text-midnight transition hover:border-green hover:text-green disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loadState === "loading"}
          onClick={loadProperties}
          type="button"
        >
          <RefreshCw aria-hidden className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {notice ? (
        <div
          className={`mt-5 rounded-[6px] border p-4 text-sm ${notice.kind === "success" ? "border-green/24 bg-green/10 text-midnight" : "border-terracotta/30 bg-terracotta/10 text-midnight"}`}
        >
          {notice.text}
        </div>
      ) : null}

      {loadState === "loading" ? (
        <StateCard text="Sincronizando propiedades." />
      ) : loadState === "error" ? (
        <StateCard text="No se pudo cargar el catalogo de propiedades." />
      ) : properties.length === 0 ? (
        <StateCard text="No hay propiedades creadas todavia." />
      ) : (
        <div className="mt-5 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <PropertyCatalogSidebar
            onSelectProperty={setSelectedPropertyId}
            properties={properties}
            selectedPropertyId={selectedPropertyId}
          />

          {form && selectedProperty ? (
            <form
              className="min-w-0 rounded-[8px] border border-line bg-white p-5 shadow-soft md:p-6"
              onSubmit={handleSubmit}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-green">
                    {selectedProperty.stayCode || "Propiedad"}
                  </p>
                  <h3 className="mt-1 font-display text-3xl leading-tight text-midnight">
                    {selectedProperty.name}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/62">
                    {selectedProperty.destination} / {selectedProperty.unitName || "Unidad principal"}
                  </p>
                </div>
                <button
                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={updating || countImages(form) < 1}
                  type="submit"
                >
                  <Save aria-hidden className="h-4 w-4" />
                  {updating ? "Guardando" : "Guardar cambios"}
                </button>
              </div>

              <PropertyEditorTabs
                activeTab={activePropertyTab}
                form={form}
                onTabChange={setActivePropertyTab}
              />

              <div className="mt-5">
                {renderPropertyTabContent({
                  activeTab: activePropertyTab,
                  form,
                  property: selectedProperty,
                  updateField
                })}
              </div>
            </form>
          ) : null}
        </div>
      )}
    </section>
  );
}

function PropertyCatalogSidebar({
  onSelectProperty,
  properties,
  selectedPropertyId
}: {
  onSelectProperty: (propertyId: string) => void;
  properties: OpsProperty[];
  selectedPropertyId: string | null;
}) {
  return (
    <aside className="rounded-[8px] border border-line bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-green">Propiedades</p>
          <h3 className="mt-1 text-xl font-semibold text-midnight">Catalogo operativo</h3>
        </div>
        <span className="rounded-full border border-line bg-ivory px-3 py-1 text-xs font-semibold text-midnight/72">
          {properties.length}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {properties.map((property) => {
          const selected = property.id === selectedPropertyId;
          const coverUrl = property.coverImageUrl || property.images[0]?.url || "";

          return (
            <button
              aria-current={selected ? "true" : undefined}
              className={
                "focus-ring grid w-full grid-cols-[84px_minmax(0,1fr)] gap-3 rounded-[8px] border p-3 text-left transition " +
                (selected
                  ? "border-green bg-green/5"
                  : "border-line bg-white hover:border-green hover:bg-ivory/70")
              }
              key={property.id}
              onClick={() => onSelectProperty(property.id)}
              type="button"
            >
              <span
                aria-hidden
                className="h-20 rounded-[6px] border border-line bg-ivory bg-cover bg-center"
                style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-midnight">
                  {property.name}
                </span>
                <span className="mt-1 block truncate text-xs text-ink/58">
                  {property.destination}
                </span>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-midnight/72">
                    {property.visibility}
                  </span>
                  <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[0.68rem] font-semibold text-midnight/72">
                    {property.images.length} foto(s)
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function PropertyEditorTabs({
  activeTab,
  form,
  onTabChange
}: {
  activeTab: PropertyEditorTabKey;
  form: PropertyForm;
  onTabChange: (tab: PropertyEditorTabKey) => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2 border-b border-line pb-3" role="tablist">
      {propertyEditorTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        const badge = getPropertyEditorTabBadge(tab.key, form);

        return (
          <button
            aria-selected={isActive}
            className={
              "focus-ring inline-flex min-h-10 items-center gap-2 rounded-[6px] border px-3 text-sm font-semibold transition " +
              (isActive
                ? "border-green bg-green text-white"
                : "border-line bg-white text-midnight hover:border-green hover:text-green")
            }
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            role="tab"
            type="button"
          >
            <Icon aria-hidden className="h-4 w-4" />
            {tab.label}
            {badge ? (
              <span
                className={
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.68rem] " +
                  (isActive ? "bg-white/20 text-white" : "bg-ivory text-ink/58")
                }
              >
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function renderPropertyTabContent({
  activeTab,
  form,
  property,
  updateField
}: {
  activeTab: PropertyEditorTabKey;
  form: PropertyForm;
  property: OpsProperty;
  updateField: PropertyFieldUpdater;
}) {
  if (activeTab === "content") {
    const images = buildImages(form);
    const coverUrl = images[0]?.url || property.coverImageUrl || "";

    return (
      <div className="grid gap-5">
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
            <TextArea
              label="Resumen publico"
              value={form.summary}
              onChange={(value) => updateField("summary", value)}
            />
            <TextArea
              label="Nota de reserva"
              value={form.bookingNote}
              onChange={(value) => updateField("bookingNote", value)}
            />
            <TextArea
              label="Amenidades"
              hint="Una por linea"
              value={form.amenities}
              onChange={(value) => updateField("amenities", value)}
            />
            <TextArea
              label="Reglas"
              hint="Una por linea"
              value={form.houseRules}
              onChange={(value) => updateField("houseRules", value)}
            />
          </div>

          <div className="rounded-[8px] border border-line bg-ivory p-4">
            <div className="flex items-center gap-2">
              <ImageIcon aria-hidden className="h-4 w-4 text-green" />
              <p className="text-sm font-semibold text-midnight">Galeria</p>
            </div>
            <div
              aria-hidden
              className="mt-4 h-56 rounded-[6px] border border-line bg-white bg-cover bg-center"
              style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
            />
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.slice(0, 8).map((image) => (
                <span
                  aria-hidden
                  className="h-16 rounded-[6px] border border-line bg-white bg-cover bg-center"
                  key={`${image.url}-${image.sortOrder}`}
                  style={{ backgroundImage: `url(${image.url})` }}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-ink/58">
              Fotos registradas al guardar: {images.length}.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="Portada URL"
            value={form.coverImageUrl}
            onChange={(value) => updateField("coverImageUrl", value)}
          />
          <TextArea
            label="Galeria URLs"
            hint="Una URL por linea"
            value={form.galleryUrls}
            onChange={(value) => updateField("galleryUrls", value)}
          />
        </div>
      </div>
    );
  }

  if (activeTab === "rates") {
    return (
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TextInput
            label="Nombre tarifa"
            value={form.ratePlanName}
            onChange={(value) => updateField("ratePlanName", value)}
          />
          <TextInput
            label="Moneda"
            value={form.currency}
            onChange={(value) => updateField("currency", value.toUpperCase())}
          />
          <NumberInput
            label="Tarifa base"
            value={form.baseNightlyRate}
            onChange={(value) => updateField("baseNightlyRate", value)}
          />
          <NumberInput
            label="Tarifa fin de semana"
            value={form.weekendNightlyRate}
            onChange={(value) => updateField("weekendNightlyRate", value)}
          />
          <NumberInput
            label="Limpieza"
            value={form.cleaningFee}
            onChange={(value) => updateField("cleaningFee", value)}
          />
          <NumberInput
            label="Minimo noches"
            value={form.minNights}
            onChange={(value) => updateField("minNights", value)}
          />
          <NumberInput
            label="Fee KUQUBA bps"
            value={form.serviceFeeBps}
            onChange={(value) => updateField("serviceFeeBps", value)}
          />
          <NumberInput
            label="Impuesto bps"
            value={form.taxBps}
            onChange={(value) => updateField("taxBps", value)}
          />
        </div>
      </div>
    );
  }

  if (activeTab === "operations") {
    const operationItems = parseLines(form.operations);

    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TextArea
          label="Operacion KUQUBA"
          hint="Una por linea"
          value={form.operations}
          onChange={(value) => updateField("operations", value)}
        />
        <div className="rounded-[8px] border border-line bg-ivory p-4">
          <p className="text-xs font-semibold uppercase text-green">Checklist visible</p>
          <div className="mt-3 space-y-2 text-sm text-midnight">
            {operationItems.length > 0 ? (
              operationItems.map((item) => (
                <p className="rounded-[6px] border border-line bg-white px-3 py-2" key={item}>
                  {item}
                </p>
              ))
            ) : (
              <p className="text-sm leading-6 text-ink/58">Sin lineamientos operativos.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === "publishing") {
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="Codigo estancia"
            value={form.stayCode}
            onChange={(value) => updateField("stayCode", value)}
          />
          <SelectInput
            label="Visibilidad"
            value={form.visibility}
            onChange={(value) => updateField("visibility", value)}
          />
        </div>
        <div className="rounded-[8px] border border-line bg-ivory p-4">
          <p className="text-xs font-semibold uppercase text-green">Estado de publicacion</p>
          <dl className="mt-3 space-y-3 text-sm">
            <ReadOnlyFact label="Contrato" value={property.contractStatus} />
            <ReadOnlyFact label="Fotos" value={`${countImages(form)} registrada(s)`} />
            <ReadOnlyFact label="Visibilidad" value={form.visibility} />
          </dl>
          <p className="mt-3 text-xs leading-5 text-ink/58">
            Una propiedad publica requiere al menos 3 fotos y codigo de estancia valido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <TextInput label="Nombre" value={form.name} onChange={(value) => updateField("name", value)} />
      <TextInput
        label="Destino"
        value={form.destination}
        onChange={(value) => updateField("destination", value)}
      />
      <TextInput
        label="Zona"
        value={form.neighborhood}
        onChange={(value) => updateField("neighborhood", value)}
      />
      <TextInput
        label="Estilo"
        value={form.stayStyle}
        onChange={(value) => updateField("stayStyle", value)}
      />
      <TextInput
        label="Unidad"
        value={form.unitName}
        onChange={(value) => updateField("unitName", value)}
      />
      <NumberInput
        label="Huespedes"
        value={form.maxGuests}
        onChange={(value) => updateField("maxGuests", value)}
      />
      <NumberInput
        label="Habitaciones"
        value={form.bedrooms}
        onChange={(value) => updateField("bedrooms", value)}
      />
      <NumberInput
        label="Banos"
        step="0.5"
        value={form.bathrooms}
        onChange={(value) => updateField("bathrooms", value)}
      />
    </div>
  );
}

function ReadOnlyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[6px] border border-line bg-white px-3 py-2">
      <dt className="text-xs font-semibold uppercase text-ink/48">{label}</dt>
      <dd className="mt-1 font-semibold text-midnight">{value}</dd>
    </div>
  );
}

function getPropertyEditorTabBadge(tab: PropertyEditorTabKey, form: PropertyForm) {
  if (tab === "content") {
    return String(countImages(form));
  }
  if (tab === "rates") {
    return form.currency || null;
  }
  if (tab === "operations") {
    return String(parseLines(form.operations).length);
  }
  if (tab === "publishing") {
    return form.visibility;
  }
  return null;
}
function TextInput({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block text-xs font-semibold uppercase text-ink/48">
      {label}
      <input
        className="focus-ring mt-2 min-h-10 w-full rounded-[6px] border border-line bg-white px-3 text-sm font-semibold normal-case text-midnight outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function NumberInput({
  label,
  onChange,
  step,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  step?: string;
  value: string;
}) {
  return (
    <label className="block text-xs font-semibold uppercase text-ink/48">
      {label}
      <input
        className="focus-ring mt-2 min-h-10 w-full rounded-[6px] border border-line bg-white px-3 text-sm font-semibold normal-case text-midnight outline-none"
        min="0"
        onChange={(event) => onChange(event.target.value)}
        step={step ?? "1"}
        type="number"
        value={value}
      />
    </label>
  );
}

function SelectInput({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: PropertyVisibility;
}) {
  return (
    <label className="block text-xs font-semibold uppercase text-ink/48">
      {label}
      <select
        className="focus-ring mt-2 min-h-10 w-full rounded-[6px] border border-line bg-white px-3 text-sm font-semibold normal-case text-midnight outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="PUBLIC">PUBLIC</option>
        <option value="SEGMENTED">SEGMENTED</option>
        <option value="PRIVATE">PRIVATE</option>
      </select>
    </label>
  );
}

function TextArea({
  hint,
  label,
  onChange,
  value
}: {
  hint?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block text-xs font-semibold uppercase text-ink/48">
      {label}
      {hint ? <span className="ml-2 normal-case text-ink/42">{hint}</span> : null}
      <textarea
        className="focus-ring mt-2 min-h-24 w-full resize-none rounded-[6px] border border-line bg-white px-3 py-2 text-sm leading-6 normal-case text-ink outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function StateCard({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-[8px] border border-line bg-white p-6 text-sm text-ink/62 shadow-soft">
      {text}
    </div>
  );
}

async function fetchProperties(sessionToken: string): Promise<PropertiesResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/properties`, {
    headers: { "x-kuquba-dev-session": sessionToken }
  });
  const payload = (await response.json().catch(() => ({}))) as PropertiesResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "properties_request_failed");
  }

  return payload;
}

async function patchPropertyProfile(
  propertyId: string,
  form: PropertyForm,
  sessionToken: string
): Promise<PropertiesResponse & { property: OpsProperty }> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/properties/${propertyId}/profile`,
    {
      body: JSON.stringify(buildProfilePayload(form)),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "PATCH"
    }
  );
  const payload = (await response.json().catch(() => ({}))) as PropertiesResponse & {
    error?: string;
    property: OpsProperty;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "property_update_failed");
  }

  return payload;
}

function buildPropertyForm(property: OpsProperty): PropertyForm {
  return {
    amenities: property.amenities.join("\n"),
    baseNightlyRate: property.baseNightlyRate,
    bathrooms: String(property.bathrooms),
    bedrooms: String(property.bedrooms),
    bookingNote: property.bookingNote,
    cleaningFee: property.cleaningFee,
    coverImageUrl: property.coverImageUrl,
    currency: property.currency,
    destination: property.destination,
    galleryUrls: property.images
      .filter((image) => !image.isCover)
      .map((image) => image.url)
      .join("\n"),
    houseRules: property.houseRules.join("\n"),
    maxGuests: String(property.maxGuests),
    minNights: String(property.minNights),
    name: property.name,
    neighborhood: property.neighborhood,
    operations: property.operations.join("\n"),
    ratePlanName: property.ratePlanName,
    serviceFeeBps: String(property.serviceFeeBps),
    stayCode: property.stayCode,
    stayStyle: property.stayStyle,
    summary: property.summary,
    taxBps: String(property.taxBps),
    unitName: property.unitName,
    visibility: property.visibility,
    weekendNightlyRate: property.weekendNightlyRate
  };
}

function buildProfilePayload(form: PropertyForm) {
  return {
    amenities: parseLines(form.amenities),
    baseNightlyRate: form.baseNightlyRate,
    bathrooms: form.bathrooms,
    bedrooms: form.bedrooms,
    bookingNote: form.bookingNote,
    cleaningFee: form.cleaningFee,
    currency: form.currency,
    destination: form.destination,
    houseRules: parseLines(form.houseRules),
    images: buildImages(form),
    maxGuests: form.maxGuests,
    minNights: form.minNights,
    name: form.name,
    neighborhood: form.neighborhood,
    operations: parseLines(form.operations),
    ratePlanName: form.ratePlanName,
    serviceFeeBps: form.serviceFeeBps,
    stayCode: form.stayCode,
    stayStyle: form.stayStyle,
    summary: form.summary,
    taxBps: form.taxBps,
    unitName: form.unitName,
    visibility: form.visibility,
    weekendNightlyRate: form.weekendNightlyRate.trim() || undefined
  };
}

function buildImages(form: PropertyForm) {
  const urls = [form.coverImageUrl, ...form.galleryUrls.split(/\r?\n/)]
    .map((url) => url.trim())
    .filter(Boolean);
  const seen = new Set<string>();

  return urls
    .filter((url) => {
      if (seen.has(url)) {
        return false;
      }
      seen.add(url);
      return true;
    })
    .map((url, index) => ({
      alt: index === 0 ? `Portada ${form.name}` : `${form.name} foto ${index + 1}`,
      isCover: index === 0,
      sortOrder: index,
      url
    }));
}

function countImages(form: PropertyForm) {
  return buildImages(form).length;
}

function parseLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getUpdateErrorMessage(error: string) {
  if (error === "property_images_minimum_required") {
    return "Una propiedad publica necesita al menos 3 fotos.";
  }
  if (error === "stay_code_already_in_use") {
    return "Ese codigo de estancia ya pertenece a otra propiedad.";
  }
  if (error === "stay_code_invalid") {
    return "El codigo de estancia no es valido.";
  }
  return "No se pudo actualizar la propiedad.";
}
