export const toBool = (v: number | boolean | null | undefined): boolean => Boolean(v);
export const fromBool = (v: boolean): 0 | 1 => (v ? 1 : 0);
