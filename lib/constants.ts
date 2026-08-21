export const TENDER_FILE_MAX_COUNT = 10;
export const TENDER_FILE_MAX_TOTAL_BYTES = 50 * 1024 * 1024;

export const ErrorMessages = {
  unauthenticated: 'Authentication required',
  insufficientRole: 'Insufficient permissions',
};

export const PUBLIC_DOCUMENT_CATEGORIES = [
  { value: 'balance_sheet', label: 'Balance Sheet' },
  { value: 'financial_statement', label: 'Financial Statement' },
  { value: 'annual_report', label: 'Annual Report' },
  { value: 'tax_registration', label: 'Tax / GST Registration' },
  { value: 'company_profile', label: 'Company Profile' },
  { value: 'certificate', label: 'Certificate / Licence' },
  { value: 'other', label: 'Other' },
] as const;

export const DEFAULT_MATERIAL_GROUPS = [
  { name: 'Pipes & Fittings', description: 'Pipes, flanges, fittings, and piping accessories' },
  { name: 'Valves & Actuators', description: 'Process valves, control valves, and actuators' },
  { name: 'Electrical Equipment', description: 'Cables, switchgear, motors, and electrical panels' },
  { name: 'Instrumentation Materials', description: 'Transmitters, analyzers, and control instruments' },
  { name: 'Structural Steel', description: 'Beams, plates, and structural fabrication materials' },
  { name: 'Process Equipment', description: 'Vessels, heat exchangers, pumps, and rotating equipment' },
] as const;

export const DEFAULT_SERVICE_GROUPS = [
  { name: 'Safety & Environment', description: 'HSE services, environmental compliance, and safety systems' },
  { name: 'Civil & Construction', description: 'Civil works, foundations, and construction services' },
  { name: 'Chemical Cleaning', description: 'Chemical cleaning and decontamination services' },
  { name: 'Operation & Maintenance', description: 'Plant operations and maintenance contracts' },
  { name: 'Mechanical Maintenance', description: 'Mechanical repair, overhaul, and maintenance' },
  { name: 'Welding', description: 'Welding, fabrication, and NDT-related services' },
  { name: 'Electrical Services', description: 'Electrical installation, testing, and maintenance' },
  { name: 'Instrumentation Services', description: 'Instrument installation, calibration, and loop checks' },
] as const;

export const PREDEFINED_CHANNELS = [
  { name: 'Information', slug: 'information', kind: 'information' as const, description: 'General information and updates for all participants' },
  { name: 'Announcements', slug: 'announcements', kind: 'announcement' as const, description: 'Official announcements from the procurement team' },
  { name: 'Alerts', slug: 'alerts', kind: 'alert' as const, description: 'Urgent alerts, deadline reminders, and critical notices' },
  { name: 'General', slug: 'general', kind: 'general' as const, description: 'Open discussion among companies and suppliers' },
] as const;

export const CHANNEL_KIND_ORDER = ['information', 'announcement', 'alert', 'general'] as const;

export const CLAUSE_KINDS = ['safety', 'quality', 'payment', 'delivery', 'compliance', 'scope', 'legal'] as const;
export const CUSTOM_CLAUSE_KIND = 'custom' as const;
export const ALL_CLAUSE_KINDS = [...CLAUSE_KINDS, CUSTOM_CLAUSE_KIND] as const;
export type ClauseKindConst = (typeof ALL_CLAUSE_KINDS)[number];

export const CLAUSE_KIND_LABELS: Record<ClauseKindConst, string> = {
  safety: 'Safety',
  quality: 'Quality',
  payment: 'Payment Terms',
  delivery: 'Delivery Terms',
  compliance: 'Compliance',
  scope: 'Scope of Work',
  legal: 'Legal Clauses',
  custom: 'Custom Term',
};

export const DEFAULT_CLAUSE_TEMPLATES: { kind: ClauseKindConst; title: string; body: string }[] = [
  {
    kind: 'safety',
    title: 'Health, Safety & Environment',
    body: `The supplier shall comply with the company's HSE policy and applicable statutory safety regulations at all times.

1. All personnel deployed to site shall hold valid safety induction and job-specific permits.
2. Method statements and risk assessments (HIRA) shall be submitted before mobilisation.
3. PPE appropriate to the work shall be provided and worn without exception.
4. Incidents, near misses, and unsafe conditions shall be reported immediately.
5. Work may be stopped by the company if unsafe practices are observed, without cost to the company.`,
  },
  {
    kind: 'quality',
    title: 'Quality Requirements',
    body: `The supplier shall implement a quality system aligned with ISO 9001 or an equivalent standard acceptable to the company.

1. Inspection and test plans (ITP) shall be submitted for approval before manufacture or site work.
2. Materials shall be supplied with mill certificates / test reports as specified.
3. Non-conformances shall be notified within 24 hours and closed only after company acceptance.
4. The company reserves the right to inspect at the supplier's works or at site.
5. Final handover shall include as-built records, certificates, and a quality dossier.`,
  },
  {
    kind: 'payment',
    title: 'Payment Terms',
    body: `Payment shall be made in the currency stated in the tender, subject to accepted invoices and contractual milestones.

1. Unless otherwise agreed, payment is by letter of credit or company-approved transfer, net 60 days from invoice acceptance.
2. Advance payment, if any, requires an equivalent bank guarantee in a form acceptable to the company.
3. Retention of 5% shall be held until successful completion and expiry of the defect liability period.
4. Invoices without supporting delivery / progress documents will not be processed.
5. The company may set off amounts due from the supplier against any invoice.`,
  },
  {
    kind: 'delivery',
    title: 'Delivery Terms',
    body: `Delivery shall be made in accordance with the agreed Incoterms, location, and schedule stated in the tender.

1. Time is of the essence. Delay without an approved extension may attract liquidated damages.
2. Packing shall be suitable for export / site transport and clearly marked as specified.
3. Partial deliveries require prior written approval.
4. Risk and title transfer as per the stated Incoterms; until then the supplier remains responsible for the goods.
5. Late or incomplete documentation is treated as incomplete delivery.`,
  },
  {
    kind: 'compliance',
    title: 'Compliance & Statutory Obligations',
    body: `The supplier warrants compliance with all applicable laws, including labour, tax, environmental, anti-bribery, and sanctions rules.

1. The supplier shall not engage in bribery, facilitation payments, or conflicts of interest.
2. Statutory registrations (GST / VAT, labour, PF, insurance) shall be kept valid throughout the contract.
3. Subcontracting of any substantial portion of the work requires prior written consent.
4. The supplier shall maintain insurance covering workmen, third-party liability, and goods in transit as specified.
5. Audit rights: the company may verify compliance records on reasonable notice.`,
  },
  {
    kind: 'scope',
    title: 'Scope of Work',
    body: `The supplier shall perform the complete scope described in this tender, including all work reasonably inferred as necessary for a fully functional and safe result.

1. Drawings, specifications, and data sheets issued with this tender form part of the scope.
2. The supplier is deemed to have inspected site conditions and local constraints, where relevant.
3. Items not listed but required for completeness of the specified system are included, unless expressly excluded.
4. Variations shall be executed only against a written company instruction.
5. The supplier shall coordinate with other contractors as directed by the company.`,
  },
  {
    kind: 'legal',
    title: 'Legal Clauses',
    body: `This tender and any resulting contract shall be governed by the laws of the jurisdiction stated by the company.

1. Confidentiality: tender documents and project information shall not be disclosed to third parties without consent.
2. Intellectual property in company-issued drawings remains with the company; supplier background IP remains with the supplier.
3. Liability: the supplier is liable for defects, delay, and third-party claims arising from its work, subject to any agreed cap.
4. Warranty / defect liability shall apply for 12 months from acceptance, or as otherwise specified.
5. Disputes shall first be referred to amicable settlement, then to arbitration / courts as specified in the award.
6. The company may reject any offer without assigning reasons and is not obliged to accept the lowest bid.`,
  },
];
