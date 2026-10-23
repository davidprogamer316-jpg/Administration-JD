import { PaperType } from './models/index.js';

interface DefaultPaperType {
  code: string;
  label: string;
  specs: string;
  sortOrder: number;
}

const DEFAULT_PAPER_TYPES: DefaultPaperType[] = [
  {
    code: 'premium',
    label: 'Premium Film',
    specs: 'Solar rejection: 40%, UV protection: 90%, Warranty: 6 months',
    sortOrder: 1,
  },
  {
    code: 'ceramic',
    label: 'Ceramic Film',
    specs: 'Solar rejection: 70%, UV protection: 100%, Warranty: 5 years',
    sortOrder: 2,
  },
  {
    code: 'ultra_ceramic',
    label: 'Ultra Ceramic Film',
    specs: 'Solar rejection: 98%, UV protection: 100%, Warranty: 10 years',
    sortOrder: 3,
  },
  {
    code: 'ceramica_d',
    label: 'Cerámica D · 2 años',
    specs: 'Solar rejection: 70%, UV protection: 100%, Warranty: 2 years',
    sortOrder: 4,
  },
  {
    code: 'architectural_black',
    label: 'Architectural Black Film',
    specs: 'Solar rejection: 80%, UV protection: 99%, Warranty: 4 years',
    sortOrder: 5,
  },
  {
    code: 'architectural_silver',
    label: 'Architectural Silver Film',
    specs: 'Solar rejection: 80%, UV protection: 99%, Warranty: 4 years',
    sortOrder: 6,
  },
  {
    code: 'architectural_black_silver',
    label: 'Architectural Black-Silver Film',
    specs: 'Solar rejection: 97%, UV protection: 99%, Warranty: 6 years',
    sortOrder: 7,
  },
];

export async function seedDefaultPaperTypes(): Promise<void> {
  const operations = DEFAULT_PAPER_TYPES.map((paper) => ({
    updateOne: {
      filter: { code: paper.code },
      update: { $setOnInsert: { ...paper, active: true } },
      upsert: true,
    },
  }));

  await PaperType.bulkWrite(operations);
}
