import type { AvatarCrop } from './userProfileUi';

export function AvatarCropControls({
  crop,
  status,
  onCropChange,
  onReset,
  onApply,
}: {
  crop: AvatarCrop;
  status: string;
  onCropChange: (updates: Partial<AvatarCrop>) => void;
  onReset: () => void;
  onApply: () => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border-[2px] border-[#111]/15 bg-white/70 p-3">
      <p className="mb-2 text-xs font-black opacity-60">头像裁剪</p>
      <div className="grid gap-3 text-xs font-black">
        <label className="grid gap-1">
          放大/缩小
          <input type="range" min="1" max="3" step="0.05" value={crop.scale} onChange={(event) => onCropChange({ scale: Number(event.target.value) })} />
        </label>
        <label className="grid gap-1">
          左右位置
          <input type="range" min="-50" max="50" step="1" value={crop.x} onChange={(event) => onCropChange({ x: Number(event.target.value) })} />
        </label>
        <label className="grid gap-1">
          上下位置
          <input type="range" min="-50" max="50" step="1" value={crop.y} onChange={(event) => onCropChange({ y: Number(event.target.value) })} />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onReset} className="rounded-xl border-[2px] border-[#111]/20 bg-white px-3 py-2 text-sm font-black">
          重置
        </button>
        <button type="button" onClick={onApply} className="rounded-xl border-[2px] border-[#111] bg-[#dbeafe] px-3 py-2 text-sm font-black">
          应用裁剪
        </button>
      </div>
      {status && <p className="mt-2 text-xs font-black opacity-60">{status}</p>}
    </div>
  );
}
