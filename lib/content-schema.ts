import { z } from "zod";

const unifatoPage = z.object({ slug: z.string(), kind: z.string(), title: z.string(), hero: z.string().optional(), storeKey: z.enum(["ponto-negro", "upstyle", "outlet", "mango"]).optional(), itemId: z.number().int().optional() }).passthrough();
const unifatoSettings = z.object({ nav: z.object({ PT: z.array(z.unknown()), EN: z.array(z.unknown()) }), timeline: z.array(z.tuple([z.string(), z.string()])), storeGroups: z.array(z.object({ key: z.string(), name: z.string(), hero: z.string(), stores: z.array(z.unknown()) }).passthrough()), news: z.array(z.object({ id: z.number(), title: z.string(), slug: z.string() }).passthrough()), clipping: z.array(z.unknown()), brandLogos: z.array(z.unknown()), customerBenefits: z.array(z.unknown()), privacySections: z.array(z.unknown()), contactEmail: z.string().email() }).passthrough();

export function validatePageContent(websiteType: string, content: unknown) { return websiteType === "unifato-v1" ? unifatoPage.parse(content) : z.record(z.string(), z.unknown()).parse(content); }
export function validateSettingsContent(websiteType: string, content: unknown) { return websiteType === "unifato-v1" ? unifatoSettings.parse(content) : z.record(z.string(), z.unknown()).parse(content); }
