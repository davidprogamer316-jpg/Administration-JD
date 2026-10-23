import { PaperType, IPaperType } from '../models/index.js';

const MAX_LABEL_LENGTH = 80;
const MAX_SPECS_LENGTH = 300;

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return slug || 'papel';
}

async function generateCode(label: string): Promise<string> {
  const base = slugify(label);
  let code = base;
  let suffix = 2;
  while (await PaperType.exists({ code })) {
    code = `${base}_${suffix}`;
    suffix += 1;
  }
  return code;
}

function normalizeLabel(value: unknown): string {
  const label = String(value ?? '').trim();
  if (!label) throw httpError('El nombre es obligatorio', 400);
  if (label.length > MAX_LABEL_LENGTH) {
    throw httpError(
      `El nombre no puede superar ${MAX_LABEL_LENGTH} caracteres`,
      400
    );
  }
  return label;
}

function normalizeSpecs(value: unknown): string {
  const specs = String(value ?? '').trim();
  if (specs.length > MAX_SPECS_LENGTH) {
    throw httpError(
      `Las especificaciones no pueden superar ${MAX_SPECS_LENGTH} caracteres`,
      400
    );
  }
  return specs;
}

export async function list() {
  return PaperType.find().sort({ sortOrder: 1, label: 1 });
}

export async function create(data: { label?: unknown; specs?: unknown }) {
  const label = normalizeLabel(data.label);
  const specs = normalizeSpecs(data.specs);
  const code = await generateCode(label);

  const last = await PaperType.findOne().sort({ sortOrder: -1 });
  const sortOrder = (last?.sortOrder ?? 0) + 1;

  return PaperType.create({ code, label, specs, active: true, sortOrder });
}

export async function update(
  id: string,
  data: { label?: unknown; specs?: unknown }
) {
  const paper = await PaperType.findById(id);
  if (!paper) throw httpError('Tipo de papel no encontrado', 404);

  if (data.label !== undefined) paper.label = normalizeLabel(data.label);
  if (data.specs !== undefined) paper.specs = normalizeSpecs(data.specs);

  return paper.save();
}

export async function toggleActive(id: string) {
  const paper = await PaperType.findById(id);
  if (!paper) throw httpError('Tipo de papel no encontrado', 404);

  paper.active = !paper.active;
  return paper.save();
}

export type PaperInfoMap = Record<string, { label: string; specs: string }>;

export async function getPaperInfoMap(codes: string[]): Promise<PaperInfoMap> {
  if (codes.length === 0) return {};

  const papers = await PaperType.find({ code: { $in: codes } });
  const map: PaperInfoMap = {};
  for (const paper of papers) {
    map[paper.code] = { label: paper.label, specs: paper.specs };
  }
  return map;
}

export function toPaperInfoMap(papers: IPaperType[]): PaperInfoMap {
  const map: PaperInfoMap = {};
  for (const paper of papers) {
    map[paper.code] = { label: paper.label, specs: paper.specs };
  }
  return map;
}
