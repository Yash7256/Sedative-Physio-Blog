import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { NoteStatus } from "../../generated/prisma/client.js"
import { prisma } from "./client.js"

export type NoteSeed = {
  title: string
  description?: string
  tag: string
  category: string
  fileName: string
  fileKey?: string
  fileSize?: number
  image?: string
  imageDark?: string
  isPublished?: boolean
}

export const NOTES: NoteSeed[] = [
  {
    title: "Cerebral Palsy — Treatment Notes",
    description: "Comprehensive notes on cerebral palsy recognition and physiotherapy management.",
    tag: "clinical",
    category: "notes",
    fileName: "CEREBRAL PALSY.pdf",
    fileKey: "pdfs/Orthopaedics/CEREBRAL PALSY.pdf",
    fileSize: 942_023,
    image: "https://i.ibb.co/1tbTg4CK/Chat-GPT-Image-Sep-22-2026-06-00-57-PM.png",
    imageDark: "https://i.ibb.co/wNzcyT8K/Chat-GPT-Image-Sep-22-2026-06-01-11-PM.png",
    isPublished: true,
  },
  {
    title: "Guillain-Barré Syndrome — Treatment Notes",
    description: "Recognition, progression, and physiotherapy management of Guillain-Barré syndrome.",
    tag: "clinical",
    category: "notes",
    fileName: "GULLIAN BAARE SYNDROME.pdf",
    fileKey: "pdfs/Orthopaedics/GULLIAN BAARE SYNDROME.pdf",
    fileSize: 229_673,
    image: "https://i.ibb.co/Xf7kF35K/Chat-GPT-Image-Sep-22-2026-06-12-30-PM.png",
    imageDark: "https://i.ibb.co/Q33bHk19/Chat-GPT-Image-Sep-22-2026-06-12-35-PM.png",
  },
  {
    title: "Multiple Sclerosis — Management Notes",
    description: "Pathophysiology overview and physiotherapy management of multiple sclerosis.",
    tag: "clinical",
    category: "notes",
    fileName: "MULTIPLE SCLEROSIS.pdf",
    fileKey: "pdfs/Orthopaedics/MULTIPLE SCLEROSIS.pdf",
    fileSize: 2_462_373,
    image: "",
    imageDark: "",
  },
  {
    title: "Neurological Assessment Guide",
    description: "Structured approach to neurological examination and assessment findings.",
    tag: "clinical",
    category: "notes",
    fileName: "Neurological Assessment.pdf",
    fileKey: "pdfs/Orthopaedics/Neurological Assessment.pdf",
    fileSize: 481_131,
    image: "",
    imageDark: "",
  },
  {
    title: "Parkinson's Disease — Treatment Notes",
    description: "Clinical features and physiotherapy management strategies for Parkinson's disease.",
    tag: "clinical",
    category: "notes",
    fileName: "Parkinson.pdf",
    fileKey: "pdfs/Orthopaedics/Parkinson.pdf",
    fileSize: 360_678,
    image: "",
    imageDark: "",
  },
  {
    title: "Poliomyelitis — Treatment Notes",
    description: "Overview of poliomyelitis and physiotherapy management of affected patients.",
    tag: "clinical",
    category: "notes",
    fileName: "Poliomyelitis.pdf",
    fileKey: "pdfs/Orthopaedics/Poliomyelitis.pdf",
    fileSize: 142_157,
    image: "",
    imageDark: "",
  },
  {
    title: "Stroke — Physiotherapy Management",
    description: "Physiotherapy management plan and rehabilitation approach for stroke survivors.",
    tag: "clinical",
    category: "notes",
    fileName: "Stroke PT Management.pdf",
    fileKey: "pdfs/Orthopaedics/Stroke PT Management.pdf",
    fileSize: 436_094,
    image: "",
    imageDark: "",
  },
  {
    title: "Stroke — Overview Notes",
    description: "Comprehensive reference notes on types, causes, and effects of stroke.",
    tag: "clinical",
    category: "notes",
    fileName: "Stroke.pdf",
    fileKey: "pdfs/Orthopaedics/Stroke.pdf",
    fileSize: 3_493_415,
    image: "",
    imageDark: "",
  },
  {
    title: "Traumatic Brain Injury — Management Notes",
    description: "Pathophysiology and rehabilitation management of traumatic brain injury.",
    tag: "clinical",
    category: "notes",
    fileName: "Traumatic Brain Injury.pdf",
    fileKey: "pdfs/Orthopaedics/Traumatic Brain Injury.pdf",
    fileSize: 667_377,
    image: "",
    imageDark: "",
  },
]

export async function seedNotes() {
  const seedTitles = NOTES.map((note) => note.title)
  await prisma.note.deleteMany({
    where: { title: { notIn: seedTitles } },
  })
  for (const note of NOTES) {
    const uploaded = Boolean(note.fileKey)
    const payload = {
      description: note.description,
      tag: note.tag,
      category: note.category,
      fileKey: note.fileKey ?? null,
      fileName: note.fileName,
      fileSize: note.fileSize,
      image: note.image ?? null,
      imageDark: note.imageDark ?? null,
      status: uploaded ? NoteStatus.UPLOADED : NoteStatus.PENDING,
      uploadedAt: uploaded ? new Date() : null,
      isPublished: note.isPublished ?? true,
    }
    const existing = await prisma.note.findFirst({
      where: { title: note.title, category: note.category },
    })
    if (existing) {
      await prisma.note.update({ where: { id: existing.id }, data: payload })
    } else {
      await prisma.note.create({ data: { title: note.title, ...payload } })
    }
    console.log(`Seeded note "${note.title}"`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  seedNotes()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}