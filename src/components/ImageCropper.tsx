import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { ZoomIn, ZoomOut, Check, X, Move } from "lucide-react";

interface ImageCropperProps {
  imageFile: File;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
}

const ImageCropper = ({ imageFile, onCrop, onCancel }: ImageCropperProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgSrc, setImgSrc] = useState("");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const CROP_SIZE = 280;

  useEffect(() => {
    const url = URL.createObjectURL(imageFile);
    setImgSrc(url);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      // fit image so shortest side fills crop area
      const fitScale = CROP_SIZE / Math.min(image.width, image.height);
      setScale(fitScale);
      setOffset({
        x: (CROP_SIZE - image.width * fitScale) / 2,
        y: (CROP_SIZE - image.height * fitScale) / 2,
      });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const draw = useCallback(() => {
    if (!canvasRef.current || !img) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    ctx.save();
    // clip to circle
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, offset.x, offset.y, img.width * scale, img.height * scale);
    ctx.restore();
  }, [img, scale, offset]);

  useEffect(() => { draw(); }, [draw]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = () => setDragging(false);

  const handleZoom = (delta: number) => {
    setScale((prev) => {
      const newScale = Math.max(0.1, prev + delta);
      // adjust offset to zoom toward center
      if (img) {
        const cx = CROP_SIZE / 2;
        const cy = CROP_SIZE / 2;
        setOffset((o) => ({
          x: cx - ((cx - o.x) / prev) * newScale,
          y: cy - ((cy - o.y) / prev) * newScale,
        }));
      }
      return newScale;
    });
  };

  const handleCrop = () => {
    if (!canvasRef.current) return;
    // Export at high quality
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 512;
    exportCanvas.height = 512;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx || !img) return;

    const exportScale = 512 / CROP_SIZE;
    ctx.beginPath();
    ctx.arc(256, 256, 256, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      img,
      offset.x * exportScale,
      offset.y * exportScale,
      img.width * scale * exportScale,
      img.height * scale * exportScale
    );

    exportCanvas.toBlob((blob) => {
      if (blob) onCrop(blob);
    }, "image/png", 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center gap-4"
    >
      {/* Crop area */}
      <div
        className="relative rounded-full overflow-hidden border-4 border-primary/30 shadow-xl cursor-grab active:cursor-grabbing"
        style={{ width: CROP_SIZE, height: CROP_SIZE }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <canvas ref={canvasRef} width={CROP_SIZE} height={CROP_SIZE} className="w-full h-full" />
        {/* Guide overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <Move className="w-6 h-6 text-white/30" />
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Перетащите для позиционирования
      </p>

      {/* Zoom controls */}
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => handleZoom(-0.05)}
          className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </motion.button>

        <input
          type="range"
          min="0.1"
          max="3"
          step="0.01"
          value={scale}
          onChange={(e) => {
            const newScale = parseFloat(e.target.value);
            if (img) {
              const cx = CROP_SIZE / 2;
              const cy = CROP_SIZE / 2;
              setOffset((o) => ({
                x: cx - ((cx - o.x) / scale) * newScale,
                y: cy - ((cy - o.y) / scale) * newScale,
              }));
            }
            setScale(newScale);
          }}
          className="w-28 accent-primary"
        />

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => handleZoom(0.05)}
          className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-foreground transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <X className="w-4 h-4" /> Отмена
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleCrop}
          className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Check className="w-4 h-4" /> Сохранить
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ImageCropper;
