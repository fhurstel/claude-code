import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { canvasToBlob } from '../media';

type Pt = { x: number; y: number };
type Shape =
  | { kind: 'pen'; color: string; points: Pt[] }
  | { kind: 'arrow' | 'box'; color: string; from: Pt; to: Pt }
  | { kind: 'text'; color: string; at: Pt; text: string };
type Tool = Shape['kind'];

const COLORS = ['#ff3b30', '#ffcc00', '#34c759', '#0a84ff', '#ffffff'];
const TOOLS: { tool: Tool; label: string }[] = [
  { tool: 'pen', label: '✎ Draw' },
  { tool: 'arrow', label: '➚ Arrow' },
  { tool: 'box', label: '▢ Box' },
  { tool: 'text', label: 'T Text' },
];

function draw(ctx: CanvasRenderingContext2D, s: Shape, unit: number) {
  ctx.strokeStyle = ctx.fillStyle = s.color;
  ctx.lineWidth = unit;
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = unit;
  ctx.beginPath();
  if (s.kind === 'pen') {
    s.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  } else if (s.kind === 'box') {
    ctx.strokeRect(s.from.x, s.from.y, s.to.x - s.from.x, s.to.y - s.from.y);
  } else if (s.kind === 'text') {
    ctx.font = `bold ${unit * 8}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(s.text, s.at.x, s.at.y);
  } else {
    const angle = Math.atan2(s.to.y - s.from.y, s.to.x - s.from.x);
    const head = unit * 5;
    ctx.moveTo(s.from.x, s.from.y);
    ctx.lineTo(s.to.x, s.to.y);
    ctx.moveTo(s.to.x - head * Math.cos(angle - Math.PI / 6), s.to.y - head * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(s.to.x, s.to.y);
    ctx.lineTo(s.to.x - head * Math.cos(angle + Math.PI / 6), s.to.y - head * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

export function Annotator({ source, onSave, onCancel }: { source: Blob; onSave: (b: Blob) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [base, setBase] = useState<ImageBitmap>();
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape>();
  const [tool, setTool] = useState<Tool>('arrow');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let bmp: ImageBitmap | undefined;
    createImageBitmap(source).then((b) => setBase((bmp = b)));
    return () => bmp?.close();
  }, [source]);

  const unit = base ? Math.max(base.width, base.height) / 170 : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !base) return;
    canvas.width = base.width;
    canvas.height = base.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(base, 0, 0);
    for (const s of draft ? [...shapes, draft] : shapes) draw(ctx, s, unit);
  }, [base, shapes, draft, unit]);

  function toImage(e: PointerEvent): Pt {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvasRef.current!.width,
      y: ((e.clientY - rect.top) / rect.height) * canvasRef.current!.height,
    };
  }

  function down(e: PointerEvent) {
    const p = toImage(e);
    if (tool === 'text') {
      const text = prompt('Label text')?.trim();
      if (text) setShapes((s) => [...s, { kind: 'text', color, at: p, text }]);
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraft(tool === 'pen' ? { kind: 'pen', color, points: [p] } : { kind: tool, color, from: p, to: p });
  }

  function move(e: PointerEvent) {
    if (!draft) return;
    const p = toImage(e);
    setDraft(draft.kind === 'pen' ? { ...draft, points: [...draft.points, p] } : draft.kind === 'text' ? draft : { ...draft, to: p });
  }

  function up() {
    if (draft) setShapes((s) => [...s, draft]);
    setDraft(undefined);
  }

  async function save() {
    setSaving(true);
    try {
      onSave(await canvasToBlob(canvasRef.current!, 0.9));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="annotator" role="dialog" aria-label="Mark up photo">
      <div className="annotator-bar">
        <button className="btn btn-sm" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-sm" onClick={() => setShapes((s) => s.slice(0, -1))} disabled={!shapes.length}>
          ↶ Undo
        </button>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !base}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <div className="annotator-stage">
        <canvas
          ref={canvasRef}
          data-testid="markup-canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
      <div className="annotator-tools">
        <div className="seg" role="radiogroup" aria-label="Tool">
          {TOOLS.map((t) => (
            <button key={t.tool} role="radio" aria-checked={tool === t.tool} onClick={() => setTool(t.tool)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="swatches" role="radiogroup" aria-label="Color">
          {COLORS.map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={color === c}
              aria-label={`Color ${c}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
