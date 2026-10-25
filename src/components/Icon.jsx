import {
  Calculator, Languages, MessageSquareText, Shapes, Lightbulb, FlaskConical, Monitor, BarChart3, Landmark, Newspaper,
  Network, Database, Table, Code, Braces, Coffee, Terminal, FileCode, ChartScatter, BrainCircuit, Cloud, Cpu, RadioTower,
  Cog, Building2, Zap, TestTube, Car, Dna, Pickaxe, Sigma, Atom, Beaker, Receipt, Briefcase, Scale, Sprout, Users, Vote,
  Brain, House, Pill, Mic, BookOpen, Handshake, PiggyBank, Laptop, GraduationCap,
} from 'lucide-react';

export const SUBJECT_ICONS = {
  Calculator, Languages, MessageSquareText, Shapes, Lightbulb, FlaskConical, Monitor, BarChart3, Landmark, Newspaper,
  Network, Database, Table, Code, Braces, Coffee, Terminal, FileCode, ChartScatter, BrainCircuit, Cloud, Cpu, RadioTower,
  Cog, Building2, Zap, TestTube, Car, Dna, Pickaxe, Sigma, Atom, Beaker, Receipt, Briefcase, Scale, Sprout, Users, Vote,
  Brain, House, Pill, Mic, BookOpen, Handshake, PiggyBank, Laptop, GraduationCap,
};
export const ICON_NAMES = Object.keys(SUBJECT_ICONS).sort();

// Soft tint per icon, derived from the name so every subject keeps the same colour
const TINTS = [['#eef2ff', '#4338ca'], ['#e0f2fe', '#0369a1'], ['#ccfbf1', '#0f766e'], ['#ede9fe', '#6d28d9'], ['#dbeafe', '#1d4ed8'], ['#e0e7ff', '#3730a3'], ['#cffafe', '#0e7490']];
export function tint(key = '') { let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TINTS[h % TINTS.length]; }

export function SubjectIcon({ name, size = 22, tile = true, k }) {
  const C = SUBJECT_ICONS[name] || BookOpen;
  if (!tile) return <C size={size} aria-hidden="true" />;
  const [bg, fg] = tint(k || name);
  return <span className="icon-tile" style={{ background: bg, color: fg }} aria-hidden="true"><C size={size} strokeWidth={1.9} /></span>;
}
