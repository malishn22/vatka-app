import type { Level, Section } from '../types';

interface ResolutionCtx {
  languageId: number;
  languageName: string;
  defaultLevelId: number;
  levelCache: Map<string, number>;
  subsectionCaches: Map<number, Map<string, number>>;
  defaultCreatedLevelId: { current: number | null };
  addLevel: (data: Omit<Level, 'id' | 'created_at'>) => Promise<void>;
  addSection: (data: Omit<Section, 'id' | 'created_at'>) => Promise<void>;
  getLevels: () => Level[];
  getSections: () => Section[];
}

export function createResolutionCtx(
  languageId: number,
  languageName: string,
  defaultLevelId: number,
  levels: Level[],
  sections: Section[],
  addLevel: ResolutionCtx['addLevel'],
  addSection: ResolutionCtx['addSection'],
  getLevels: ResolutionCtx['getLevels'],
  getSections: ResolutionCtx['getSections'],
): ResolutionCtx {
  const ctx: ResolutionCtx = {
    languageId,
    languageName,
    defaultLevelId,
    levelCache: new Map(levels.map(l => [l.name.toLowerCase(), l.id])),
    subsectionCaches: new Map(),
    defaultCreatedLevelId: { current: null },
    addLevel,
    addSection,
    getLevels,
    getSections,
  };
  if (defaultLevelId > 0) {
    ctx.subsectionCaches.set(defaultLevelId, new Map(sections.map(s => [s.name.toLowerCase(), s.id])));
  }
  return ctx;
}

const nextLevelPos = (ctx: ResolutionCtx): number => {
  const lvls = ctx.getLevels().filter(l => l.language_id === ctx.languageId);
  return lvls.length ? Math.max(...lvls.map(l => l.position)) + 1 : 0;
};

const nextSectionPos = (ctx: ResolutionCtx, lvlId: number): number => {
  const secs = ctx.getSections().filter(s => s.level_id === lvlId);
  return secs.length ? Math.max(...secs.map(s => s.position)) + 1 : 0;
};

export async function resolveTargetLevel(sectionName: string, ctx: ResolutionCtx): Promise<number> {
  if (sectionName.trim()) {
    const key = sectionName.trim().toLowerCase();
    if (ctx.levelCache.has(key)) return ctx.levelCache.get(key)!;

    await ctx.addLevel({ language_id: ctx.languageId, section_id: null, name: sectionName.trim(), position: nextLevelPos(ctx) });
    const newLevel = ctx.getLevels().find(l => l.language_id === ctx.languageId && l.name.toLowerCase() === key);
    if (newLevel) {
      ctx.levelCache.set(key, newLevel.id);
      return newLevel.id;
    }
    return ctx.defaultLevelId;
  }

  if (ctx.defaultLevelId === 0) {
    if (ctx.defaultCreatedLevelId.current === null) {
      const defaultName = ctx.languageName;
      const existing = ctx.getLevels().find(
        l => l.language_id === ctx.languageId && l.name.toLowerCase() === defaultName.toLowerCase()
      );
      if (existing) {
        ctx.defaultCreatedLevelId.current = existing.id;
      } else {
        await ctx.addLevel({ language_id: ctx.languageId, section_id: null, name: defaultName, position: nextLevelPos(ctx) });
        const created = ctx.getLevels().find(
          l => l.language_id === ctx.languageId && l.name.toLowerCase() === defaultName.toLowerCase()
        );
        ctx.defaultCreatedLevelId.current = created?.id ?? 0;
      }
    }
    return ctx.defaultCreatedLevelId.current!;
  }

  return ctx.defaultLevelId;
}

export async function resolveSubsection(
  subsectionName: string,
  targetLevelId: number,
  ctx: ResolutionCtx
): Promise<number | null> {
  if (!ctx.subsectionCaches.has(targetLevelId)) {
    ctx.subsectionCaches.set(targetLevelId, new Map());
  }
  const subCache = ctx.subsectionCaches.get(targetLevelId)!;

  if (!subsectionName.trim()) return null;

  const key = subsectionName.trim().toLowerCase();
  if (subCache.has(key)) return subCache.get(key)!;

  await ctx.addSection({ level_id: targetLevelId, name: subsectionName.trim(), position: nextSectionPos(ctx, targetLevelId) });
  const newSection = ctx.getSections().find(s => s.level_id === targetLevelId && s.name.toLowerCase() === key);
  if (newSection) {
    subCache.set(key, newSection.id);
    return newSection.id;
  }
  return null;
}
