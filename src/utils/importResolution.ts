import type { Section, Subsection } from '../types';

interface ResolutionCtx {
  languageId: number;
  languageName: string;
  defaultSectionId: number;
  sectionCache: Map<string, number>;
  subsectionCaches: Map<number, Map<string, number>>;
  defaultCreatedSectionId: { current: number | null };
  addSection: (data: Omit<Section, 'id' | 'created_at'>) => Promise<void>;
  addSubsection: (data: Omit<Subsection, 'id' | 'created_at'>) => Promise<void>;
  getSections: () => Section[];
  getSubsections: () => Subsection[];
}

export function createResolutionCtx(
  languageId: number,
  languageName: string,
  defaultSectionId: number,
  sections: Section[],
  subsections: Subsection[],
  addSection: ResolutionCtx['addSection'],
  addSubsection: ResolutionCtx['addSubsection'],
  getSections: ResolutionCtx['getSections'],
  getSubsections: ResolutionCtx['getSubsections'],
): ResolutionCtx {
  const ctx: ResolutionCtx = {
    languageId,
    languageName,
    defaultSectionId,
    sectionCache: new Map(sections.map(s => [s.name.toLowerCase(), s.id])),
    subsectionCaches: new Map(),
    defaultCreatedSectionId: { current: null },
    addSection,
    addSubsection,
    getSections,
    getSubsections,
  };
  if (defaultSectionId > 0) {
    ctx.subsectionCaches.set(defaultSectionId, new Map(subsections.map(s => [s.name.toLowerCase(), s.id])));
  }
  return ctx;
}

const nextSectionPos = (ctx: ResolutionCtx): number => {
  const secs = ctx.getSections().filter(s => s.language_id === ctx.languageId);
  return secs.length ? Math.max(...secs.map(s => s.position)) + 1 : 0;
};

const nextSubsectionPos = (ctx: ResolutionCtx, sectionId: number): number => {
  const subs = ctx.getSubsections().filter(s => s.section_id === sectionId);
  return subs.length ? Math.max(...subs.map(s => s.position)) + 1 : 0;
};

export async function resolveTargetSection(sectionName: string, ctx: ResolutionCtx): Promise<number> {
  if (sectionName.trim()) {
    const key = sectionName.trim().toLowerCase();
    if (ctx.sectionCache.has(key)) return ctx.sectionCache.get(key)!;

    await ctx.addSection({ language_id: ctx.languageId, name: sectionName.trim(), position: nextSectionPos(ctx) });
    const newSection = ctx.getSections().find(s => s.language_id === ctx.languageId && s.name.toLowerCase() === key);
    if (newSection) {
      ctx.sectionCache.set(key, newSection.id);
      return newSection.id;
    }
    return ctx.defaultSectionId;
  }

  if (ctx.defaultSectionId === 0) {
    if (ctx.defaultCreatedSectionId.current === null) {
      const defaultName = ctx.languageName;
      const existing = ctx.getSections().find(
        s => s.language_id === ctx.languageId && s.name.toLowerCase() === defaultName.toLowerCase()
      );
      if (existing) {
        ctx.defaultCreatedSectionId.current = existing.id;
      } else {
        await ctx.addSection({ language_id: ctx.languageId, name: defaultName, position: nextSectionPos(ctx) });
        const created = ctx.getSections().find(
          s => s.language_id === ctx.languageId && s.name.toLowerCase() === defaultName.toLowerCase()
        );
        ctx.defaultCreatedSectionId.current = created?.id ?? 0;
      }
    }
    return ctx.defaultCreatedSectionId.current!;
  }

  return ctx.defaultSectionId;
}

export async function resolveSubsection(
  subsectionName: string,
  targetSectionId: number,
  ctx: ResolutionCtx
): Promise<number | null> {
  if (!ctx.subsectionCaches.has(targetSectionId)) {
    ctx.subsectionCaches.set(targetSectionId, new Map());
  }
  const subCache = ctx.subsectionCaches.get(targetSectionId)!;

  if (!subsectionName.trim()) return null;

  const key = subsectionName.trim().toLowerCase();
  if (subCache.has(key)) return subCache.get(key)!;

  await ctx.addSubsection({ section_id: targetSectionId, name: subsectionName.trim(), position: nextSubsectionPos(ctx, targetSectionId) });
  const newSub = ctx.getSubsections().find(s => s.section_id === targetSectionId && s.name.toLowerCase() === key);
  if (newSub) {
    subCache.set(key, newSub.id);
    return newSub.id;
  }
  return null;
}
