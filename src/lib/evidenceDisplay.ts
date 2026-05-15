export type EvidenceSummary = {
  evidenceId?: string
  id?: string
  fileName?: string
  filePath?: string
  evidenceName?: string
  itemType?: string
  itemName?: string
  description?: string
  createdAt?: string
  handler?: string
  initialHash?: string
  currentHash?: string
  hashValue?: string
  caseId?: string
}

type EvidenceNameType = {
  name: string
  type: string
}

export function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function toStringValue(value: unknown): string {
  return typeof value === 'number' || typeof value === 'string'
    ? String(value)
    : ''
}

export function parseEvidenceNameType(row: EvidenceSummary): EvidenceNameType {
  const rawEvidenceName = row.evidenceName?.trim() ?? ''
  const rawItemType = row.itemType?.trim() ?? ''
  const rawItemName = row.itemName?.trim() ?? ''
  if (rawEvidenceName) {
    return {
      name: rawEvidenceName,
      type: rawItemType || '—',
    }
  }

  const combined = rawItemName || rawItemType
  const match = combined.match(/^\[(.*)]\s*(.+)$/)

  if (match) {
    return {
      name: match[1].trim() || row.fileName || '—',
      type: match[2].trim() || '—',
    }
  }

  return {
    name: rawItemName && rawItemName !== rawItemType ? rawItemName : row.fileName || '—',
    type: rawItemType || '—',
  }
}

export function parseEvidenceRow(item: unknown): EvidenceSummary {
  const o = asRecord(item) ?? {}
  return {
    evidenceId:
      toStringValue(o.evidenceId) ||
      toStringValue(o.evidence_id) ||
      toStringValue(o.id),
    id: toStringValue(o.id) || toStringValue(o.evidenceId) || toStringValue(o.evidence_id),
    fileName: toStringValue(o.fileName) || toStringValue(o.file_name),
    filePath: toStringValue(o.filePath) || toStringValue(o.file_path),
    evidenceName:
      toStringValue(o.evidenceName) ||
      toStringValue(o.evidence_name),
    itemType: toStringValue(o.itemType) || toStringValue(o.item_type),
    itemName: toStringValue(o.itemName) || toStringValue(o.item_name),
    description:
      toStringValue(o.description) ||
      toStringValue(o.decription),
    createdAt: toStringValue(o.createdAt) || toStringValue(o.created_at),
    handler: toStringValue(o.handler) || toStringValue(o.username),
    initialHash: toStringValue(o.initialHash) || toStringValue(o.initial_hash),
    currentHash:
      toStringValue(o.currentHash) ||
      toStringValue(o.current_hash) ||
      toStringValue(o.hashValue) ||
      toStringValue(o.hash_value),
    hashValue: toStringValue(o.hashValue) || toStringValue(o.hash_value),
    caseId: toStringValue(o.caseId) || toStringValue(o.case_id),
  }
}

export function parseEvidenceList(raw: unknown): EvidenceSummary[] {
  if (Array.isArray(raw)) return raw.map(parseEvidenceRow)

  const data = asRecord(raw)
  const inner = data?.data ?? data?.content ?? data?.items
  return Array.isArray(inner) ? inner.map(parseEvidenceRow) : []
}

export function formatEvidenceDate(value: string | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value.substring(0, 16).replace('T', ' ')

  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
