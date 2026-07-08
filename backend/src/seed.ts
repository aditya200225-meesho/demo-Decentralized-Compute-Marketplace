import { prisma } from "./db.ts";
import { randomVirtualSpecs } from "./services/hardware.ts";

const TEMPLATES = [
  {
    name: "Document Embeddings",
    description: "Generate vector embeddings for a batch of text documents. Data stays on the provider; only vectors are returned.",
    taskType: "EMBEDDINGS",
    minCpuCores: 2,
    minRamGb: 4,
    requiresGpu: false,
    basePrice: 1.2,
    estCarbonG: 8,
  },
  {
    name: "Small Model Inference",
    description: "Run batched inference requests against a small (<1B param) model.",
    taskType: "INFERENCE",
    minCpuCores: 4,
    minRamGb: 8,
    requiresGpu: false,
    basePrice: 2.5,
    estCarbonG: 15,
  },
  {
    name: "Image Preprocessing",
    description: "Resize, normalize, and augment an image dataset for training.",
    taskType: "PREPROCESS",
    minCpuCores: 2,
    minRamGb: 4,
    requiresGpu: false,
    basePrice: 0.8,
    estCarbonG: 5,
  },
  {
    name: "Tiny Fine-Tune (LoRA)",
    description: "Run a small LoRA fine-tune pass on a lightweight base model.",
    taskType: "FINETUNE",
    minCpuCores: 6,
    minRamGb: 16,
    requiresGpu: true,
    basePrice: 6.0,
    estCarbonG: 40,
  },
];

const VIRTUAL_PROVIDER_NAMES = [
  "Hostel-PC-14",
  "Lab-Machine-B3",
  "Home-Laptop-Aditi",
  "Gaming-Rig-Karan",
  "Dorm-Desktop-2",
  "Library-Kiosk-7",
  "Family-Laptop-Rohan",
  "Study-Room-PC-1",
];

export async function seedIfEmpty() {
  const templateCount = await prisma.jobTemplate.count();
  if (templateCount === 0) {
    await prisma.jobTemplate.createMany({ data: TEMPLATES });
    console.log(`[seed] created ${TEMPLATES.length} job templates`);
  }

  const providerCount = await prisma.provider.count();
  if (providerCount === 0) {
    const team = await prisma.team.create({ data: { name: "Hostel Wing-C Co-op" } });
    for (let i = 0; i < VIRTUAL_PROVIDER_NAMES.length; i++) {
      const specs = randomVirtualSpecs(i);
      await prisma.provider.create({
        data: {
          name: VIRTUAL_PROVIDER_NAMES[i],
          cpuCores: specs.cpuCores,
          ramGb: specs.ramGb,
          hasGpu: specs.hasGpu,
          gpuModel: specs.gpuModel,
          status: "ONLINE",
          isVirtual: true,
          teamId: i < 3 ? team.id : null,
        },
      });
    }
    console.log(`[seed] created ${VIRTUAL_PROVIDER_NAMES.length} virtual providers`);
  }
}
