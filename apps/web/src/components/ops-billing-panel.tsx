"use client";

import { Percent, Plus, Power, Receipt, RefreshCw, Save, Tags } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { getDevPortalApiBaseUrl } from "./use-dev-portal-session";

type ChargeCategory =
  | "ACCOMMODATION"
  | "SERVICE"
  | "DIGITAL_PLATFORM"
  | "PAYMENT_PROCESSING"
  | "TAX"
  | "DISCOUNT"
  | "ADJUSTMENT";
type CalculationMethod = "FIXED" | "PER_NIGHT" | "PERCENTAGE" | "PASS_THROUGH";
type BeneficiaryType =
  "OWNER" | "KUQUBA" | "PROVIDER" | "PAYMENT_PROCESSOR" | "TAX_AUTHORITY" | "GUEST";

type BillingMetric = { hint: string; label: string; value: string };
type BillingOption<T extends string = string> = { label: string; value: T };
type BillingUnit = { id: string; name: string };
type BillingProperty = {
  activeContract: {
    id: string;
    kuqubaShareBps: number;
    ownerName: string;
    ownerShareBps: number;
    updatedAt: string;
  } | null;
  destination: string;
  id: string;
  name: string;
  units: BillingUnit[];
};
type ChargeDefinition = {
  active: boolean;
  amount: string | null;
  calculationMethod: CalculationMethod;
  calculationMethodLabel: string;
  category: ChargeCategory;
  categoryLabel: string;
  code: string;
  description: string | null;
  distributionBeneficiaryType: BeneficiaryType | null;
  guestVisible: boolean;
  id: string;
  label: string;
  rateBps: number | null;
  scopeLabel: string;
  taxable: boolean;
  updatedAt: string;
};
type TaxRule = {
  active: boolean;
  appliesToCategories: ChargeCategory[];
  appliesToChargeCodes: string[];
  code: string;
  id: string;
  label: string;
  rateBps: number;
  responsibleParty: BeneficiaryType;
  responsiblePartyLabel: string;
  scopeLabel: string;
  updatedAt: string;
};
type BillingDashboard = {
  chargeDefinitions: ChargeDefinition[];
  generatedAt: string;
  metrics: BillingMetric[];
  options: {
    beneficiaryTypes: Array<BillingOption<BeneficiaryType>>;
    calculationMethods: Array<BillingOption<CalculationMethod>>;
    categories: Array<BillingOption<ChargeCategory>>;
  };
  properties: BillingProperty[];
  taxRules: TaxRule[];
};
type BillingResponse = { billing: BillingDashboard };
type LoadState = "idle" | "loading" | "ready" | "error";
type Notice = { kind: "success" | "error"; text: string } | null;
type SplitDrafts = Record<string, { kuqubaPercent: string; ownerPercent: string }>;
type ChargeForm = {
  active: boolean;
  amount: string;
  calculationMethod: CalculationMethod;
  category: ChargeCategory;
  code: string;
  description: string;
  distributionBeneficiaryType: BeneficiaryType;
  guestVisible: boolean;
  label: string;
  propertyId: string;
  rateBps: string;
  taxable: boolean;
  unitId: string;
};
type TaxRuleForm = {
  active: boolean;
  appliesToCategories: ChargeCategory[];
  appliesToChargeCodes: string;
  code: string;
  label: string;
  propertyId: string;
  rateBps: string;
  responsibleParty: BeneficiaryType;
  unitId: string;
};

const initialChargeForm: ChargeForm = {
  active: true,
  amount: "",
  calculationMethod: "FIXED",
  category: "SERVICE",
  code: "",
  description: "",
  distributionBeneficiaryType: "OWNER",
  guestVisible: true,
  label: "",
  propertyId: "",
  rateBps: "",
  taxable: true,
  unitId: ""
};
const initialTaxRuleForm: TaxRuleForm = {
  active: true,
  appliesToCategories: ["ACCOMMODATION", "SERVICE", "DIGITAL_PLATFORM"],
  appliesToChargeCodes: "",
  code: "",
  label: "",
  propertyId: "",
  rateBps: "1200",
  responsibleParty: "TAX_AUTHORITY",
  unitId: ""
};

export function OpsBillingPanel({ sessionToken }: { sessionToken: string }) {
  const [billing, setBilling] = useState<BillingDashboard | null>(null);
  const [chargeForm, setChargeForm] = useState<ChargeForm>(initialChargeForm);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [notice, setNotice] = useState<Notice>(null);
  const [splitDrafts, setSplitDrafts] = useState<SplitDrafts>({});
  const [taxRuleForm, setTaxRuleForm] = useState<TaxRuleForm>(initialTaxRuleForm);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  useEffect(() => {
    void loadBilling();
  }, [sessionToken]);

  useEffect(() => {
    if (!billing) {
      setSplitDrafts({});
      return;
    }

    setSplitDrafts(
      Object.fromEntries(
        billing.properties.map((property) => [
          property.id,
          {
            kuqubaPercent: formatBpsAsEditablePercent(property.activeContract?.kuqubaShareBps ?? 0),
            ownerPercent: formatBpsAsEditablePercent(property.activeContract?.ownerShareBps ?? 0)
          }
        ])
      )
    );
  }, [billing]);

  const selectedChargeUnits = useMemo(
    () => findPropertyUnits(billing, chargeForm.propertyId),
    [billing, chargeForm.propertyId]
  );
  const selectedTaxUnits = useMemo(
    () => findPropertyUnits(billing, taxRuleForm.propertyId),
    [billing, taxRuleForm.propertyId]
  );
  async function loadBilling() {
    setLoadState("loading");
    setNotice(null);

    try {
      const response = await fetchBilling(sessionToken);
      setBilling(response.billing);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }

  function updateChargeField<K extends keyof ChargeForm>(field: K, value: ChargeForm[K]) {
    setChargeForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "propertyId") {
        next.unitId = "";
      }

      return next;
    });
  }

  function updateTaxRuleField<K extends keyof TaxRuleForm>(field: K, value: TaxRuleForm[K]) {
    setTaxRuleForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "propertyId") {
        next.unitId = "";
      }

      return next;
    });
  }

  function updateSplitDraft(
    propertyId: string,
    field: "ownerPercent" | "kuqubaPercent",
    value: string
  ) {
    setSplitDrafts((current) => {
      const currentDraft = current[propertyId] ?? { kuqubaPercent: "0.00", ownerPercent: "0.00" };

      if (value.trim() === "") {
        return { ...current, [propertyId]: { ...currentDraft, [field]: value } };
      }

      const percent = Number(value);
      if (!Number.isFinite(percent)) {
        return { ...current, [propertyId]: { ...currentDraft, [field]: value } };
      }

      const boundedPercent = Math.min(100, Math.max(0, percent));
      const counterpart = formatEditablePercent(100 - boundedPercent);

      return {
        ...current,
        [propertyId]:
          field === "ownerPercent"
            ? { ownerPercent: value, kuqubaPercent: counterpart }
            : { ownerPercent: counterpart, kuqubaPercent: value }
      };
    });
  }

  function toggleTaxCategory(category: ChargeCategory) {
    setTaxRuleForm((current) => ({
      ...current,
      appliesToCategories: current.appliesToCategories.includes(category)
        ? current.appliesToCategories.filter((item) => item !== category)
        : [...current.appliesToCategories, category]
    }));
  }

  async function handleCreateCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUpdatingKey("charge:create");
    setNotice(null);

    try {
      const response = await createChargeDefinition(chargeForm, sessionToken);
      setBilling(response.billing);
      setChargeForm(initialChargeForm);
      setNotice({ kind: "success", text: "Concepto creado." });
    } catch (error) {
      setNotice({
        kind: "error",
        text: getBillingErrorMessage(error, "No se pudo crear el concepto.")
      });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleCreateTaxRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUpdatingKey("tax:create");
    setNotice(null);

    try {
      const response = await createTaxRule(taxRuleForm, sessionToken);
      setBilling(response.billing);
      setTaxRuleForm(initialTaxRuleForm);
      setNotice({ kind: "success", text: "Regla fiscal creada." });
    } catch (error) {
      setNotice({
        kind: "error",
        text: getBillingErrorMessage(error, "No se pudo crear la regla fiscal.")
      });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleChargeActiveToggle(charge: ChargeDefinition) {
    setUpdatingKey(`charge:${charge.id}`);
    setNotice(null);

    try {
      const response = await patchChargeDefinitionActiveState(
        charge.id,
        !charge.active,
        sessionToken
      );
      setBilling(response.billing);
      setNotice({
        kind: "success",
        text: charge.active ? "Concepto desactivado." : "Concepto activado."
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text: getBillingErrorMessage(error, "No se pudo actualizar el concepto.")
      });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleTaxRuleActiveToggle(rule: TaxRule) {
    setUpdatingKey(`tax:${rule.id}`);
    setNotice(null);

    try {
      const response = await patchTaxRuleActiveState(rule.id, !rule.active, sessionToken);
      setBilling(response.billing);
      setNotice({
        kind: "success",
        text: rule.active ? "Regla fiscal desactivada." : "Regla fiscal activada."
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text: getBillingErrorMessage(error, "No se pudo actualizar la regla fiscal.")
      });
    } finally {
      setUpdatingKey(null);
    }
  }

  async function handleSplitSubmit(property: BillingProperty) {
    const draft = splitDrafts[property.id];

    if (!draft) {
      return;
    }

    const ownerShareBps = percentToBps(draft.ownerPercent);
    const kuqubaShareBps = percentToBps(draft.kuqubaPercent);

    if (ownerShareBps + kuqubaShareBps !== 10000) {
      setNotice({ kind: "error", text: "El split debe sumar 100%." });
      return;
    }

    setUpdatingKey(`split:${property.id}`);
    setNotice(null);

    try {
      const response = await patchPropertySplit(
        property.id,
        ownerShareBps,
        kuqubaShareBps,
        sessionToken
      );
      setBilling(response.billing);
      setNotice({ kind: "success", text: "Split financiero actualizado." });
    } catch (error) {
      setNotice({
        kind: "error",
        text: getBillingErrorMessage(error, "No se pudo actualizar el split.")
      });
    } finally {
      setUpdatingKey(null);
    }
  }
  return (
    <section className="mt-7 border-y border-line py-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-green/10 text-green">
            <Receipt aria-hidden className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-green">ERP financiero</p>
            <h2 className="text-2xl font-semibold text-midnight">Cobros</h2>
          </div>
        </div>
        <button
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] border border-line bg-white px-4 text-sm font-semibold text-midnight transition hover:border-green hover:text-green disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loadState === "loading"}
          onClick={loadBilling}
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
        <StateCard text="Sincronizando cobros." />
      ) : loadState === "error" || !billing ? (
        <StateCard text="No se pudo cargar cobros." />
      ) : (
        <div className="mt-5 grid gap-6">
          <div className="grid gap-3 md:grid-cols-3">
            {billing.metrics.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </div>

          <section className="rounded-[8px] border border-line bg-white p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-midnight/8 text-midnight">
                <Percent aria-hidden className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-green">Propiedades</p>
                <h3 className="text-xl font-semibold text-midnight">Split propietario/KUQUBA</h3>
              </div>
            </div>
            <div className="mt-5 max-h-[520px] overflow-auto rounded-[8px] border border-line">
              <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
                <thead className="sticky top-0 z-20 bg-ivory text-xs uppercase text-ink/48 shadow-[0_1px_0_rgba(17,24,39,0.08)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Propiedad</th>
                    <th className="px-4 py-3 font-semibold">Propietario</th>
                    <th className="px-4 py-3 font-semibold">KUQUBA</th>
                    <th className="px-4 py-3 font-semibold">Contrato</th>
                    <th className="sticky right-0 z-30 bg-ivory px-4 py-3 font-semibold shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
                      Accion
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {billing.properties.map((property) => {
                    const draft = splitDrafts[property.id] ?? {
                      kuqubaPercent: "0.00",
                      ownerPercent: "0.00"
                    };
                    const disabled =
                      !property.activeContract || updatingKey === `split:${property.id}`;

                    return (
                      <tr className="align-top transition hover:bg-ivory/60" key={property.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-midnight">{property.name}</p>
                          <p className="mt-1 text-xs text-ink/58">{property.destination}</p>
                        </td>
                        <td className="px-4 py-4">
                          <NumberInput
                            ariaLabel={`Porcentaje propietario ${property.name}`}
                            disabled={disabled}
                            max="100"
                            min="0"
                            step="0.01"
                            value={draft.ownerPercent}
                            onChange={(value) =>
                              updateSplitDraft(property.id, "ownerPercent", value)
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <NumberInput
                            ariaLabel={`Porcentaje KUQUBA ${property.name}`}
                            disabled={disabled}
                            max="100"
                            min="0"
                            step="0.01"
                            value={draft.kuqubaPercent}
                            onChange={(value) =>
                              updateSplitDraft(property.id, "kuqubaPercent", value)
                            }
                          />
                        </td>
                        <td className="px-4 py-4 text-xs text-ink/62">
                          <p className="font-semibold text-midnight">
                            {property.activeContract?.ownerName ?? "Sin contrato activo"}
                          </p>
                          <p className="mt-1">
                            {property.activeContract
                              ? formatDate(property.activeContract.updatedAt)
                              : "-"}
                          </p>
                        </td>
                        <td className="sticky right-0 bg-white px-4 py-4 shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
                          <button
                            className="focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-[6px] bg-green px-3 text-xs font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={disabled}
                            onClick={() => handleSplitSubmit(property)}
                            type="button"
                          >
                            <Save aria-hidden className="h-4 w-4" />
                            Guardar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-[8px] border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-green/10 text-green">
                  <Tags aria-hidden className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-green">Conceptos</p>
                  <h3 className="text-xl font-semibold text-midnight">Servicios y cargos</h3>
                </div>
              </div>

              <form className="mt-5 grid gap-4" onSubmit={handleCreateCharge}>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Codigo"
                    value={chargeForm.code}
                    onChange={(value) => updateChargeField("code", value)}
                  />
                  <TextInput
                    label="Nombre"
                    value={chargeForm.label}
                    onChange={(value) => updateChargeField("label", value)}
                  />
                  <SelectInput
                    label="Categoria"
                    options={billing.options.categories}
                    value={chargeForm.category}
                    onChange={(value) => updateChargeField("category", value as ChargeCategory)}
                  />
                  <SelectInput
                    label="Calculo"
                    options={billing.options.calculationMethods}
                    value={chargeForm.calculationMethod}
                    onChange={(value) =>
                      updateChargeField("calculationMethod", value as CalculationMethod)
                    }
                  />
                  <TextInput
                    label="Monto"
                    value={chargeForm.amount}
                    onChange={(value) => updateChargeField("amount", value)}
                  />
                  <TextInput
                    label="Bps"
                    value={chargeForm.rateBps}
                    onChange={(value) => updateChargeField("rateBps", value)}
                  />
                  <SelectInput
                    label="Beneficiario"
                    options={billing.options.beneficiaryTypes}
                    value={chargeForm.distributionBeneficiaryType}
                    onChange={(value) =>
                      updateChargeField("distributionBeneficiaryType", value as BeneficiaryType)
                    }
                  />
                  <ScopeSelect
                    label="Propiedad"
                    properties={billing.properties}
                    value={chargeForm.propertyId}
                    onChange={(value) => updateChargeField("propertyId", value)}
                  />
                  <UnitSelect
                    disabled={!chargeForm.propertyId}
                    label="Unidad"
                    units={selectedChargeUnits}
                    value={chargeForm.unitId}
                    onChange={(value) => updateChargeField("unitId", value)}
                  />
                </div>
                <TextArea
                  label="Descripcion"
                  value={chargeForm.description}
                  onChange={(value) => updateChargeField("description", value)}
                />
                <div className="flex flex-wrap gap-4">
                  <CheckboxField
                    label="Visible"
                    checked={chargeForm.guestVisible}
                    onChange={(checked) => updateChargeField("guestVisible", checked)}
                  />
                  <CheckboxField
                    label="Taxable"
                    checked={chargeForm.taxable}
                    onChange={(checked) => updateChargeField("taxable", checked)}
                  />
                  <CheckboxField
                    label="Activo"
                    checked={chargeForm.active}
                    onChange={(checked) => updateChargeField("active", checked)}
                  />
                </div>
                <button
                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={updatingKey === "charge:create"}
                  type="submit"
                >
                  <Plus aria-hidden className="h-4 w-4" />
                  {updatingKey === "charge:create" ? "Creando" : "Crear concepto"}
                </button>
              </form>

              <div className="mt-5 max-h-[420px] overflow-auto rounded-[8px] border border-line">
                <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-0 z-20 bg-ivory text-xs uppercase text-ink/48 shadow-[0_1px_0_rgba(17,24,39,0.08)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Concepto</th>
                      <th className="px-4 py-3 font-semibold">Categoria</th>
                      <th className="px-4 py-3 font-semibold">Valor</th>
                      <th className="px-4 py-3 font-semibold">Alcance</th>
                      <th className="sticky right-0 z-30 bg-ivory px-4 py-3 font-semibold shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {billing.chargeDefinitions.map((definition) => (
                      <tr className="align-top transition hover:bg-ivory/60" key={definition.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-midnight">{definition.label}</p>
                          <p className="mt-1 text-xs text-ink/58">{definition.code}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-ink/62">
                          <p className="font-semibold text-midnight">{definition.categoryLabel}</p>
                          <p className="mt-1">{definition.calculationMethodLabel}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-ink/62">
                          <p>{definition.amount ? formatMoney(definition.amount) : "-"}</p>
                          <p className="mt-1">
                            {definition.rateBps !== null ? formatBps(definition.rateBps) : "-"}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-xs text-ink/62">{definition.scopeLabel}</td>
                        <td className="sticky right-0 bg-white px-4 py-4 shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
                          <ToggleButton
                            active={definition.active}
                            disabled={updatingKey === `charge:${definition.id}`}
                            onClick={() => handleChargeActiveToggle(definition)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="rounded-[8px] border border-line bg-white p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-terracotta/10 text-terracotta">
                  <Receipt aria-hidden className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-green">Fiscal</p>
                  <h3 className="text-xl font-semibold text-midnight">Impuestos</h3>
                </div>
              </div>

              <form className="mt-5 grid gap-4" onSubmit={handleCreateTaxRule}>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Codigo"
                    value={taxRuleForm.code}
                    onChange={(value) => updateTaxRuleField("code", value)}
                  />
                  <TextInput
                    label="Nombre"
                    value={taxRuleForm.label}
                    onChange={(value) => updateTaxRuleField("label", value)}
                  />
                  <TextInput
                    label="Bps"
                    value={taxRuleForm.rateBps}
                    onChange={(value) => updateTaxRuleField("rateBps", value)}
                  />
                  <SelectInput
                    label="Responsable"
                    options={billing.options.beneficiaryTypes}
                    value={taxRuleForm.responsibleParty}
                    onChange={(value) =>
                      updateTaxRuleField("responsibleParty", value as BeneficiaryType)
                    }
                  />
                  <ScopeSelect
                    label="Propiedad"
                    properties={billing.properties}
                    value={taxRuleForm.propertyId}
                    onChange={(value) => updateTaxRuleField("propertyId", value)}
                  />
                  <UnitSelect
                    disabled={!taxRuleForm.propertyId}
                    label="Unidad"
                    units={selectedTaxUnits}
                    value={taxRuleForm.unitId}
                    onChange={(value) => updateTaxRuleField("unitId", value)}
                  />
                </div>
                <TextArea
                  label="Codigos de cargo"
                  value={taxRuleForm.appliesToChargeCodes}
                  onChange={(value) => updateTaxRuleField("appliesToChargeCodes", value)}
                />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {billing.options.categories.map((category) => (
                    <CheckboxField
                      key={category.value}
                      label={category.label}
                      checked={taxRuleForm.appliesToCategories.includes(category.value)}
                      onChange={() => toggleTaxCategory(category.value)}
                    />
                  ))}
                </div>
                <CheckboxField
                  label="Activo"
                  checked={taxRuleForm.active}
                  onChange={(checked) => updateTaxRuleField("active", checked)}
                />
                <button
                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-[6px] bg-green px-4 text-sm font-semibold text-white transition hover:bg-[#0f5c50] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={updatingKey === "tax:create"}
                  type="submit"
                >
                  <Plus aria-hidden className="h-4 w-4" />
                  {updatingKey === "tax:create" ? "Creando" : "Crear impuesto"}
                </button>
              </form>

              <div className="mt-5 max-h-[420px] overflow-auto rounded-[8px] border border-line">
                <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-0 z-20 bg-ivory text-xs uppercase text-ink/48 shadow-[0_1px_0_rgba(17,24,39,0.08)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Regla</th>
                      <th className="px-4 py-3 font-semibold">Tasa</th>
                      <th className="px-4 py-3 font-semibold">Base</th>
                      <th className="px-4 py-3 font-semibold">Alcance</th>
                      <th className="sticky right-0 z-30 bg-ivory px-4 py-3 font-semibold shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {billing.taxRules.map((rule) => (
                      <tr className="align-top transition hover:bg-ivory/60" key={rule.id}>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-midnight">{rule.label}</p>
                          <p className="mt-1 text-xs text-ink/58">{rule.code}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-ink/62">
                          <p className="font-semibold text-midnight">{formatBps(rule.rateBps)}</p>
                          <p className="mt-1">{rule.responsiblePartyLabel}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-ink/62">
                          <p>
                            {rule.appliesToCategories.length > 0
                              ? rule.appliesToCategories.join(", ")
                              : "Todas"}
                          </p>
                          <p className="mt-1">
                            {rule.appliesToChargeCodes.length > 0
                              ? rule.appliesToChargeCodes.join(", ")
                              : "-"}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-xs text-ink/62">{rule.scopeLabel}</td>
                        <td className="sticky right-0 bg-white px-4 py-4 shadow-[-1px_0_0_rgba(17,24,39,0.08)]">
                          <ToggleButton
                            active={rule.active}
                            disabled={updatingKey === `tax:${rule.id}`}
                            onClick={() => handleTaxRuleActiveToggle(rule)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
function MetricCard({ metric }: { metric: BillingMetric }) {
  return (
    <article className="rounded-[8px] border border-line bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase text-ink/48">{metric.label}</p>
      <p className="mt-3 text-3xl font-semibold text-midnight">{metric.value}</p>
      <p className="mt-2 text-sm text-ink/62">{metric.hint}</p>
    </article>
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
  ariaLabel,
  disabled,
  max,
  min,
  onChange,
  step,
  value
}: {
  ariaLabel: string;
  disabled?: boolean;
  max?: string;
  min?: string;
  onChange: (value: string) => void;
  step?: string;
  value: string;
}) {
  return (
    <input
      aria-label={ariaLabel}
      className="focus-ring h-10 w-full min-w-28 rounded-[6px] border border-line bg-white px-3 text-sm font-semibold text-midnight outline-none disabled:cursor-not-allowed disabled:bg-ivory disabled:opacity-70"
      disabled={disabled}
      max={max}
      min={min ?? "0"}
      onChange={(event) => onChange(event.target.value)}
      step={step ?? "1"}
      type="number"
      value={value}
    />
  );
}

function SelectInput({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: BillingOption[];
  value: string;
}) {
  return (
    <label className="block text-xs font-semibold uppercase text-ink/48">
      {label}
      <select
        className="focus-ring mt-2 min-h-10 w-full rounded-[6px] border border-line bg-white px-3 text-sm font-semibold normal-case text-midnight outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ScopeSelect({
  label,
  onChange,
  properties,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  properties: BillingProperty[];
  value: string;
}) {
  return (
    <label className="block text-xs font-semibold uppercase text-ink/48">
      {label}
      <select
        className="focus-ring mt-2 min-h-10 w-full rounded-[6px] border border-line bg-white px-3 text-sm font-semibold normal-case text-midnight outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Organizacion</option>
        {properties.map((property) => (
          <option key={property.id} value={property.id}>
            {property.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function UnitSelect({
  disabled,
  label,
  onChange,
  units,
  value
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  units: BillingUnit[];
  value: string;
}) {
  return (
    <label className="block text-xs font-semibold uppercase text-ink/48">
      {label}
      <select
        className="focus-ring mt-2 min-h-10 w-full rounded-[6px] border border-line bg-white px-3 text-sm font-semibold normal-case text-midnight outline-none disabled:cursor-not-allowed disabled:bg-ivory disabled:opacity-70"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Todas</option>
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
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
      <textarea
        className="focus-ring mt-2 min-h-20 w-full resize-none rounded-[6px] border border-line bg-white px-3 py-2 text-sm leading-6 normal-case text-ink outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}
function CheckboxField({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-10 items-center gap-2 rounded-[6px] border border-line bg-white px-3 text-sm font-semibold text-midnight">
      <input
        checked={checked}
        className="h-4 w-4 accent-green"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

function ToggleButton({
  active,
  disabled,
  onClick
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-[6px] border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${active ? "border-green/25 bg-green/10 text-green" : "border-line bg-ivory text-ink/58"}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Power aria-hidden className="h-4 w-4" />
      {active ? "Activo" : "Inactivo"}
    </button>
  );
}

function StateCard({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-[8px] border border-line bg-white p-6 text-sm text-ink/62 shadow-soft">
      {text}
    </div>
  );
}

async function fetchBilling(sessionToken: string): Promise<BillingResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/billing`, {
    headers: { "x-kuquba-dev-session": sessionToken }
  });
  const payload = (await response.json().catch(() => ({}))) as BillingResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "billing_request_failed");
  }

  return payload;
}

async function createChargeDefinition(
  form: ChargeForm,
  sessionToken: string
): Promise<BillingResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/billing/charges`, {
    body: JSON.stringify(buildChargePayload(form)),
    headers: {
      "content-type": "application/json",
      "x-kuquba-dev-session": sessionToken
    },
    method: "POST"
  });
  const payload = (await response.json().catch(() => ({}))) as BillingResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "charge_definition_create_failed");
  }

  return payload;
}

async function patchChargeDefinitionActiveState(
  id: string,
  active: boolean,
  sessionToken: string
): Promise<BillingResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/billing/charges/${id}`, {
    body: JSON.stringify({ active }),
    headers: {
      "content-type": "application/json",
      "x-kuquba-dev-session": sessionToken
    },
    method: "PATCH"
  });
  const payload = (await response.json().catch(() => ({}))) as BillingResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "charge_definition_update_failed");
  }

  return payload;
}

async function createTaxRule(form: TaxRuleForm, sessionToken: string): Promise<BillingResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/billing/tax-rules`, {
    body: JSON.stringify(buildTaxRulePayload(form)),
    headers: {
      "content-type": "application/json",
      "x-kuquba-dev-session": sessionToken
    },
    method: "POST"
  });
  const payload = (await response.json().catch(() => ({}))) as BillingResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "tax_rule_create_failed");
  }

  return payload;
}

async function patchTaxRuleActiveState(
  id: string,
  active: boolean,
  sessionToken: string
): Promise<BillingResponse> {
  const response = await fetch(`${getDevPortalApiBaseUrl()}/api/ops/billing/tax-rules/${id}`, {
    body: JSON.stringify({ active }),
    headers: {
      "content-type": "application/json",
      "x-kuquba-dev-session": sessionToken
    },
    method: "PATCH"
  });
  const payload = (await response.json().catch(() => ({}))) as BillingResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "tax_rule_update_failed");
  }

  return payload;
}

async function patchPropertySplit(
  propertyId: string,
  ownerShareBps: number,
  kuqubaShareBps: number,
  sessionToken: string
): Promise<BillingResponse> {
  const response = await fetch(
    `${getDevPortalApiBaseUrl()}/api/ops/billing/properties/${propertyId}/split`,
    {
      body: JSON.stringify({ kuqubaShareBps, ownerShareBps }),
      headers: {
        "content-type": "application/json",
        "x-kuquba-dev-session": sessionToken
      },
      method: "PATCH"
    }
  );
  const payload = (await response.json().catch(() => ({}))) as BillingResponse & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "property_split_update_failed");
  }

  return payload;
}

function buildChargePayload(form: ChargeForm) {
  return {
    active: form.active,
    amount: form.amount.trim() || null,
    calculationMethod: form.calculationMethod,
    category: form.category,
    code: form.code,
    description: form.description.trim() || null,
    distributionBeneficiaryType: form.distributionBeneficiaryType,
    guestVisible: form.guestVisible,
    label: form.label,
    propertyId: form.propertyId || null,
    rateBps: form.rateBps.trim() ? Number(form.rateBps) : null,
    taxable: form.taxable,
    unitId: form.unitId || null
  };
}

function buildTaxRulePayload(form: TaxRuleForm) {
  return {
    active: form.active,
    appliesToCategories: form.appliesToCategories,
    appliesToChargeCodes: parseCodes(form.appliesToChargeCodes),
    code: form.code,
    label: form.label,
    propertyId: form.propertyId || null,
    rateBps: Number(form.rateBps),
    responsibleParty: form.responsibleParty,
    unitId: form.unitId || null
  };
}

function findPropertyUnits(billing: BillingDashboard | null, propertyId: string) {
  return billing?.properties.find((property) => property.id === propertyId)?.units ?? [];
}

function parseCodes(value: string) {
  return value
    .split(/[\s,]+/)
    .map((item) =>
      item
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
    )
    .filter(Boolean);
}

function percentToBps(value: string) {
  return Math.round(Number(value) * 100);
}

function formatBps(value: number) {
  return `${formatEditablePercent(value / 100)}%`;
}

function formatBpsAsEditablePercent(value: number) {
  return formatEditablePercent(value / 100);
}

function formatEditablePercent(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function formatMoney(value: string) {
  return `GTQ ${Number(value).toLocaleString("es-GT", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function getBillingErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";

  if (message === "active_contract_required") {
    return "La propiedad necesita contrato activo.";
  }

  if (message === "invalid_financial_split") {
    return "El split debe sumar 100%.";
  }

  if (message === "scope_unit_property_mismatch") {
    return "La unidad no pertenece a la propiedad seleccionada.";
  }

  return fallback;
}
