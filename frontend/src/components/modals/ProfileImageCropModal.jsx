import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  Circle,
  Square,
  RotateCcw as ResetIcon,
  Upload,
  Check,
  Move,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '../../utils/cn';

const CROP_CONTAINER_SIZE = 320; // Visual viewport size (px)
const CROP_BOX_SIZE = 260; // Inner crop boundary size (px)
const OUTPUT_SIZE = 512; // High-resolution output canvas size (px)

export const ProfileImageCropModal = ({
  open,
  onOpenChange,
  imageSrc,
  imageFile,
  onCropComplete,
  isSaving = false,
  profileUser = null,
  onSelectNewImage,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [cropShape, setCropShape] = useState('circle'); // 'circle' | 'square'
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const imgRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const touchStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0, dist: 0, initialZoom: 1 });
  const largePreviewRef = useRef(null);
  const smallPreviewRef = useRef(null);

  // Compute base scale so image covers the crop box at 100% zoom
  const baseScale = naturalSize.width > 0 && naturalSize.height > 0
    ? Math.max(CROP_BOX_SIZE / naturalSize.width, CROP_BOX_SIZE / naturalSize.height)
    : 1;

  // Reset adjustments whenever a new image is loaded
  const resetAdjustments = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    setFlipH(false);
  }, []);

  useEffect(() => {
    if (open) {
      resetAdjustments();
    }
  }, [open, imageSrc, resetAdjustments]);

  // Load natural dimensions of current image
  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
    resetAdjustments();
  };

  // Helper to draw the cropped transform to any canvas element
  const renderToCanvas = useCallback(
    (canvas, targetSize) => {
      if (!canvas || !imgRef.current || !naturalSize.width) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = targetSize;
      canvas.height = targetSize;

      ctx.clearRect(0, 0, targetSize, targetSize);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const ratio = targetSize / CROP_BOX_SIZE;

      // 1. Move origin to center of canvas
      ctx.translate(targetSize / 2, targetSize / 2);

      // 2. Pan offset in target coordinates
      ctx.translate(pan.x * ratio, pan.y * ratio);

      // 3. Rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // 4. Horizontal flip
      ctx.scale(flipH ? -1 : 1, 1);

      // 5. Draw image centered
      const drawWidth = naturalSize.width * baseScale * zoom * ratio;
      const drawHeight = naturalSize.height * baseScale * zoom * ratio;
      ctx.drawImage(imgRef.current, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

      ctx.restore();
    },
    [pan, zoom, rotation, flipH, naturalSize, baseScale]
  );

  // Keep live previews synced
  useEffect(() => {
    if (!open) return;
    const rafId = requestAnimationFrame(() => {
      renderToCanvas(largePreviewRef.current, 176); // 88px @ 2x
      renderToCanvas(smallPreviewRef.current, 72); // 36px @ 2x
    });
    return () => cancelAnimationFrame(rafId);
  }, [open, renderToCanvas]);

  // Mouse pan handling
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Touch pan & pinch-to-zoom handling
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: pan.x,
        panY: pan.y,
        dist: 0,
        initialZoom: zoom,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current.dist = Math.hypot(dx, dy);
      touchStartRef.current.initialZoom = zoom;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      setPan({
        x: touchStartRef.current.panX + dx,
        y: touchStartRef.current.panY + dy,
      });
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      if (touchStartRef.current.dist > 0) {
        const factor = newDist / touchStartRef.current.dist;
        const nextZoom = Math.min(Math.max(1, touchStartRef.current.initialZoom * factor), 4);
        setZoom(Number(nextZoom.toFixed(2)));
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(Math.max(1, Number((prev + delta).toFixed(2))), 4));
  };

  // Rotate 90 degrees
  const handleRotate = (direction = 'cw') => {
    setRotation((prev) => {
      const delta = direction === 'cw' ? 90 : -90;
      const next = (prev + delta) % 360;
      return next < 0 ? next + 360 : next;
    });
  };

  // Export cropped canvas as File and trigger save
  const handleApplyCrop = async () => {
    if (!imgRef.current || !naturalSize.width) return;
    setIsProcessing(true);
    try {
      const exportCanvas = document.createElement('canvas');
      renderToCanvas(exportCanvas, OUTPUT_SIZE);

      const blob = await new Promise((resolve, reject) => {
        exportCanvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to generate cropped image'));
          },
          'image/jpeg',
          0.95
        );
      });

      const baseName = imageFile?.name ? imageFile.name.replace(/\.[^/.]+$/, '') : 'profile-avatar';
      const croppedFile = new File([blob], `${baseName}-cropped.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      await onCropComplete(croppedFile);
    } catch (err) {
      console.error('Error applying image crop:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        noPadding
        hideCloseButton
        className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-2xl max-h-[90vh]"
      >
        {/* Pinned Sticky Header */}
        <DialogHeader className="px-6 py-5 border-b border-border bg-card shrink-0 select-none">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                  Crop & Adjust Profile Picture
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Drag, zoom, and rotate the photo to position your profile image
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted border border-border rounded-md">
                ESC
              </span>
              <DialogClose className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
            {/* ── Left Column: Interactive Viewport & Controls ── */}
            <div className="flex flex-col items-center space-y-4 w-full sm:w-auto">
              {/* Crop Viewport Box */}
              <div
                className="relative rounded-2xl overflow-hidden shadow-inner bg-slate-950 border border-border select-none touch-none cursor-grab active:cursor-grabbing"
                style={{
                  width: `${CROP_CONTAINER_SIZE}px`,
                  height: `${CROP_CONTAINER_SIZE}px`,
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
              >
                {/* Image element being transformed */}
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  crossOrigin="anonymous"
                  onLoad={handleImageLoad}
                  draggable={false}
                  className="pointer-events-none absolute will-change-transform max-w-none max-h-none select-none"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: `${naturalSize.width * baseScale}px`,
                    height: `${naturalSize.height * baseScale}px`,
                    transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${
                      flipH ? -zoom : zoom
                    }, ${zoom})`,
                    transformOrigin: 'center center',
                  }}
                />

                {/* Crop Vignette Mask and Guidelines */}
                <svg
                  className="pointer-events-none absolute inset-0 w-full h-full"
                  viewBox={`0 0 ${CROP_CONTAINER_SIZE} ${CROP_CONTAINER_SIZE}`}
                >
                  <defs>
                    <mask id="profile-crop-mask">
                      <rect width="100%" height="100%" fill="white" />
                      {cropShape === 'circle' ? (
                        <circle
                          cx={CROP_CONTAINER_SIZE / 2}
                          cy={CROP_CONTAINER_SIZE / 2}
                          r={CROP_BOX_SIZE / 2}
                          fill="black"
                        />
                      ) : (
                        <rect
                          x={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2}
                          y={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2}
                          width={CROP_BOX_SIZE}
                          height={CROP_BOX_SIZE}
                          rx="20"
                          fill="black"
                        />
                      )}
                    </mask>
                  </defs>

                  {/* Dimmed backdrop outside crop area */}
                  <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.68)"
                    mask="url(#profile-crop-mask)"
                  />

                  {/* Highlight boundary ring */}
                  {cropShape === 'circle' ? (
                    <circle
                      cx={CROP_CONTAINER_SIZE / 2}
                      cy={CROP_CONTAINER_SIZE / 2}
                      r={CROP_BOX_SIZE / 2}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.9)"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      className="shadow-sm"
                    />
                  ) : (
                    <rect
                      x={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2}
                      y={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2}
                      width={CROP_BOX_SIZE}
                      height={CROP_BOX_SIZE}
                      rx="20"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.9)"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                    />
                  )}

                  {/* Subtle alignment grid lines inside crop window */}
                  <g opacity="0.22" stroke="white" strokeWidth="1">
                    <line
                      x1={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2 + CROP_BOX_SIZE / 3}
                      y1={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2}
                      x2={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2 + CROP_BOX_SIZE / 3}
                      y2={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2 + CROP_BOX_SIZE}
                    />
                    <line
                      x1={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2 + (CROP_BOX_SIZE * 2) / 3}
                      y1={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2}
                      x2={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2 + (CROP_BOX_SIZE * 2) / 3}
                      y2={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2 + CROP_BOX_SIZE}
                    />
                    <line
                      x1={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2}
                      y1={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2 + CROP_BOX_SIZE / 3}
                      x2={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2 + CROP_BOX_SIZE}
                      y2={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2 + CROP_BOX_SIZE / 3}
                    />
                    <line
                      x1={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2}
                      y1={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2 + (CROP_BOX_SIZE * 2) / 3}
                      x2={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2 + CROP_BOX_SIZE}
                      y2={(CROP_CONTAINER_SIZE - CROP_BOX_SIZE) / 2 + (CROP_BOX_SIZE * 2) / 3}
                    />
                  </g>
                </svg>

                {/* Floating "Drag to Move" Pill */}
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-white/90 flex items-center gap-1.5 shadow-lg">
                  <Move size={12} />
                  <span>Drag to reposition</span>
                </div>
              </div>

              {/* Zoom Slider Control */}
              <div className="w-full flex items-center gap-3 px-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, Number((z - 0.1).toFixed(2))))}
                  disabled={zoom <= 1}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-all cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={16} />
                </button>

                <input
                  type="range"
                  min="1"
                  max="3.5"
                  step="0.02"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-secondary accent-primary rounded-lg cursor-pointer"
                  title="Zoom slider"
                />

                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.1).toFixed(2))))}
                  disabled={zoom >= 3.5}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-all cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={16} />
                </button>

                <span className="text-xs font-mono font-bold text-muted-foreground min-w-[42px] text-right">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              {/* Transform Action Bar */}
              <div className="flex items-center gap-1.5 bg-secondary/50 p-1.5 rounded-xl border border-border/80">
                <button
                  type="button"
                  onClick={() => handleRotate('ccw')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-all cursor-pointer"
                  title="Rotate 90° Left"
                >
                  <RotateCcw size={14} />
                  <span>-90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRotate('cw')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-all cursor-pointer"
                  title="Rotate 90° Right"
                >
                  <RotateCw size={14} />
                  <span>+90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFlipH((f) => !f)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer',
                    flipH
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card border-transparent hover:border-border'
                  )}
                  title="Flip Horizontal"
                >
                  <FlipHorizontal size={14} />
                  <span>Flip</span>
                </button>

                <div className="h-4 w-px bg-border/80 mx-1" />

                {/* Shape Toggle */}
                <button
                  type="button"
                  onClick={() => setCropShape((s) => (s === 'circle' ? 'square' : 'circle'))}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-all cursor-pointer"
                  title={cropShape === 'circle' ? 'Switch to Square View' : 'Switch to Circle View'}
                >
                  {cropShape === 'circle' ? <Circle size={14} /> : <Square size={14} />}
                  <span className="capitalize">{cropShape}</span>
                </button>

                <button
                  type="button"
                  onClick={resetAdjustments}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-all cursor-pointer"
                  title="Reset Adjustments"
                >
                  <ResetIcon size={14} />
                </button>
              </div>
            </div>

            {/* ── Right Column: Live Previews & Details ── */}
            <div className="w-full lg:w-72 flex flex-col justify-between bg-secondary/25 rounded-2xl p-5 border border-border/70 space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  Live Avatar Preview
                </h4>

                <div className="flex flex-col items-center text-center space-y-3">
                  {/* Large Avatar Preview (88px) */}
                  <div className="relative group">
                    <div
                      className={cn(
                        'w-[88px] h-[88px] overflow-hidden bg-card border-2 border-primary/30 shadow-xl flex items-center justify-center',
                        cropShape === 'circle' ? 'rounded-full' : 'rounded-2xl'
                      )}
                    >
                      <canvas
                        ref={largePreviewRef}
                        className="w-full h-full object-cover"
                        style={{ display: 'block' }}
                      />
                    </div>
                  </div>

                  <div>
                    <h5 className="font-bold text-sm text-foreground">
                      {profileUser?.name || 'Your Name'}
                    </h5>
                    <p className="text-xs text-muted-foreground capitalize">
                      {profileUser?.role || 'Team Member'}
                    </p>
                  </div>

                  {/* Header / Navbar Avatar Simulation Preview */}
                  <div className="w-full pt-3 border-t border-border/60 flex items-center justify-between px-3 py-2 rounded-xl bg-card/60 border border-border/40">
                    <span className="text-xs font-medium text-muted-foreground">Navbar View:</span>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-9 h-9 overflow-hidden bg-card border border-primary/40 shadow-xs flex items-center justify-center',
                          cropShape === 'circle' ? 'rounded-full' : 'rounded-xl'
                        )}
                      >
                        <canvas
                          ref={smallPreviewRef}
                          className="w-full h-full object-cover"
                          style={{ display: 'block' }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground truncate max-w-[80px]">
                        {profileUser?.name?.split(' ')[0] || 'User'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Hints */}
              <div className="space-y-2 text-[11px] text-muted-foreground bg-card/50 p-3 rounded-xl border border-border/50">
                <div className="font-semibold text-foreground">Quick Tips:</div>
                <ul className="space-y-1 list-disc pl-3.5 leading-relaxed">
                  <li>Scroll mouse wheel over image to zoom.</li>
                  <li>Click and drag to position your face in center.</li>
                  <li>High-resolution 512×512 output is automatically generated.</li>
                </ul>
              </div>

              {/* Change Image Button */}
              {onSelectNewImage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onSelectNewImage}
                  className="w-full text-xs font-bold gap-2 rounded-xl"
                >
                  <Upload size={14} />
                  Choose Different Photo
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Sticky Footer */}
        <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
          <span className="text-xs text-muted-foreground hidden sm:inline">Press ESC to exit</span>
          <div className="flex items-center gap-2.5 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving || isProcessing}
              className="h-11 px-5 rounded-xl font-semibold text-sm"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleApplyCrop}
              disabled={isSaving || isProcessing}
              className="h-11 px-6 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-md"
            >
              {isSaving || isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Profile Picture...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Crop & Save Profile Picture</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
