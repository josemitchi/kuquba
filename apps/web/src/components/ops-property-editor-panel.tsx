"use client";

import { Building2, ImageIcon, RefreshCw, Save } from "lucide-react";
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

type LoadState = "idle" | "loading" | "ready" | "error";
type Notice = { kind: "success" | "error"; text: string } | null;

export function OpsPropertyEditorPanel({ sessionToken }: { sessionToken: string }) {
  const [properties, setProperties] = useState<OpsProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyForm | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

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
        <div className="mt-5 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="max-h-[620px] overflow-auto rounded-[8px] border border-line bg-white shadow-soft">
            <table className="w-full min-w-[520px] border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-20 bg-ivory text-xs uppercase text-ink/48 shadow-[0_1px_0_rgba(17,24,39,0.08)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Propiedad</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {properties.map((property) => (
                  <tr
                    className={`cursor-pointer align-top transition hover:bg-ivory/60 ${property.id === selectedPropertyId ? "bg-green/5" : ""}`}
                    key={property.id}
                    onClick={() => setSelectedPropertyId(property.id)}
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-midnight">{property.name}</p>
                      <p className="mt-1 text-xs text-ink/58">{property.destination}</p>
                      <p className="mt-1 text-xs text-ink/58">
                        {property.stayCode || "Sin codigo"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-xs text-ink/62">
                      <p className="font-semibold text-midnight">{property.visibility}</p>
                      <p className="mt-1">Contrato {property.contractStatus}</p>
                      <p className="mt-1">{property.images.length} fotos</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {form && selectedProperty ? (
            <form
              className="rounded-[8px] border border-line bg-white p-6 shadow-soft"
              onSubmit={handleSubmit}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-green">
                    {selectedProperty.stayCode || "Propiedad"}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-midnight">
                    {selectedProperty.name}
                  </h3>
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

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Nombre"
                  value={form.name}
                  onChange={(value) => updateField("name", value)}
                />
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
                <TextInput
                  label="Codigo estancia"
                  value={form.stayCode}
                  onChange={(value) => updateField("stayCode", value)}
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
                <SelectInput
                  label="Visibilidad"
                  value={form.visibility}
                  onChange={(value) => updateField("visibility", value)}
                />
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

              <div className="mt-5 grid gap-4">
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
                <TextArea
                  label="Operacion KUQUBA"
                  hint="Una por linea"
                  value={form.operations}
                  onChange={(value) => updateField("operations", value)}
                />
              </div>

              <div className="mt-5 rounded-[8px] border border-line bg-ivory p-4">
                <div className="flex items-center gap-2">
                  <ImageIcon aria-hidden className="h-4 w-4 text-green" />
                  <p className="text-sm font-semibold text-midnight">Fotografias</p>
                </div>
                <div className="mt-4 grid gap-4">
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
                <p className="mt-3 text-xs text-ink/58">
                  Fotos registradas al guardar: {countImages(form)}.
                </p>
              </div>
            </form>
          ) : null}
        </div>
      )}
    </section>
  );
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
