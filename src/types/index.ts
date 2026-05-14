export interface Section {
  id: number;
  level_id: number;
  name: string;
  position: number;
  created_at?: string;
}

export interface Language {
  id: number;
  name: string;
  source: string;
  target: string;
  created_at?: string;
}

export interface Level {
  id: number;
  language_id: number;
  section_id: number | null;
  name: string;
  position: number;
  created_at?: string;
}

export interface WordPair {
  id: number;
  level_id: number;
  section_id: number | null;
  source: string;
  target: string;
  disabled?: boolean;
  created_at?: string;
}

export interface Verb {
  id: number;
  level_id: number;
  section_id: number | null;
  infinitive_source: string;
  infinitive_target: string;
  disabled?: boolean;
  auxiliary?: string | null;
  case_preposition?: string | null;
  created_at?: string;
}

export interface Conjugation {
  id: number;
  verb_id: number;
  form_type: string;
  person: string;
  form: string;
  created_at?: string;
}

export interface VerbWithConjugations extends Verb {
  conjugations: Conjugation[];
}
