import { BookOpen, GraduationCap, Headphones, Link2, ListOrdered, Mic, PencilLine, Heading, Table2, Info, Image, ImagePlus, Tags, Repeat2, MousePointerClick } from "lucide-react";
import EditorialBlock from "./EditorialBlock";
import InteractiveModel from "./InteractiveModel";
import HoerBlock from "./HoerBlock";
import TheorieBlock from "./TheorieBlock";
import LesenBlock from "./LesenBlock";
import LueckeBlock from "./LueckeBlock";
import PaareBlock from "./PaareBlock";
import SatzbauBlock from "./SatzbauBlock";
import SchreibenBlock from "./SchreibenBlock";
import BildBlock from "./BildBlock";
import { BLOCK_META, type BlockType, type LessonBlock } from "./types";

export const BLOCK_ICON: Record<BlockType, any> = {
  topic: Heading,
  table: Table2,
  callout: Info,
  image: Image,
  theorie: GraduationCap,
  hoer: Headphones,
  lesen: BookOpen,
  luecke: PencilLine,
  paare: Link2,
  satzbau: ListOrdered,
  schreiben: Mic,
  artikel: Tags,
  transformation: Repeat2,
  modell: MousePointerClick,
  bild: ImagePlus,
};

interface Props {
  block: LessonBlock;
  value: any;
  onChange: (v: any) => void;
  checked: boolean;
  readOnly?: boolean;
}

/** Рендерить будь-який блок уроку — і для учня, і для викладача. */
export default function BlockRenderer({ block, value, onChange, checked, readOnly }: Props) {
  switch (block.type) {
    case "topic":
    case "table":
    case "callout":
    case "image":
    case "artikel":
    case "transformation":
      return <EditorialBlock block={block} value={value ?? {}} onChange={onChange} checked={checked} readOnly={readOnly} />;
    case "modell":
      return <InteractiveModel payload={block.payload || {}} title={block.title} value={value ?? {}} onChange={onChange} readOnly={readOnly} />;
    case "theorie":
      return <TheorieBlock block={block} />;
    case "hoer":
      return <HoerBlock block={block} />;
    case "lesen":
      return <LesenBlock block={block} />;
    case "luecke":
      return <LueckeBlock block={block} value={value ?? {}} onChange={onChange} checked={checked} readOnly={readOnly} />;
    case "paare":
      return <PaareBlock block={block} value={value ?? {}} onChange={onChange} checked={checked} readOnly={readOnly} />;
    case "satzbau":
      return <SatzbauBlock block={block} value={value ?? {}} onChange={onChange} checked={checked} readOnly={readOnly} />;
    case "schreiben":
      return <SchreibenBlock block={block} value={value ?? {}} onChange={onChange} checked={checked} readOnly={readOnly} />;
    default:
      return <p className="text-sm text-muted-foreground">Невідомий тип блока: {block.type}</p>;
  }
}

export function blockLabel(block: LessonBlock) {
  const meta = BLOCK_META[block.type as BlockType];
  return block.title || meta?.de || block.type;
}
