import { z } from 'zod'

export const beltArtSchema = z.object({
  plate: z.enum(['shield', 'oval', 'octagon', 'crest']),
  metal: z.enum(['gold', 'silver', 'bronze']),
  strap: z.enum(['ink', 'oxblood', 'indigo', 'ivory', 'forest']),
  motif: z.enum(['wings', 'sun', 'crown', 'diamond', 'interlocked']),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  sidePlates: z.union([z.literal(2), z.literal(4)]),
  lettering: z.enum(['serif', 'block']),
})

export type BeltArtwork = z.infer<typeof beltArtSchema>
