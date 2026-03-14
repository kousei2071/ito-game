import { useRef, useEffect, useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { DrawGuessStroke } from '@ito/shared';

interface DrawingCanvasProps {
  /** Whether this user can draw */
  isDrawer: boolean;
  /** Callback when a stroke is completed */
  onStroke?: (stroke: DrawGuessStroke) => void;
  /** Callback for undo */
  onUndo?: () => void;
  /** Callback for redo */
  onRedo?: () => void;
  /** Callback for clear */
  onClear?: () => void;
  /** Expose canvas element for remote API */
  canvasRefCallback?: (el: HTMLCanvasElement | null) => void;
}

const PEN_SIZES = [2, 5, 10, 18, 30];
const ERASER_SIZES = [8, 16, 28, 42, 60];
const COLORS = ['#000000', '#e74c3c', '#2ecc71', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];

export function DrawingCanvas({ isDrawer, onStroke, onUndo, onRedo, onClear, canvasRefCallback }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [penSizeIndex, setPenSizeIndex] = useState(1);
  const [eraserSizeIndex, setEraserSizeIndex] = useState(1);
  const [color, setColor] = useState('#000000');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Stroke history for local undo/redo
  const strokesRef = useRef<DrawGuessStroke[]>([]);
  const undoneRef = useRef<DrawGuessStroke[]>([]);

  // Current drawing state
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<number[]>([]);

  const currentSize = tool === 'pen' ? PEN_SIZES[penSizeIndex] : ERASER_SIZES[eraserSizeIndex];

  const blockTouchGesture = useCallback((e: React.TouchEvent) => {
    if (!isDrawer) return;
    e.preventDefault();
  }, [isDrawer]);

  const blockContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const getCanvasCoords = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokesRef.current) {
      drawStroke(ctx, stroke);
    }
  }, []);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const { x, y } = getCanvasCoords(e);
    currentPointsRef.current = [x, y];

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(x, y, currentSize / 2, 0, Math.PI * 2);
    if (tool === 'eraser') {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = color;
    }
    ctx.fill();
  }, [isDrawer, getCanvasCoords, tool, color, currentSize]);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !isDrawer) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    const pts = currentPointsRef.current;
    const prevX = pts[pts.length - 2];
    const prevY = pts[pts.length - 1];

    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    currentPointsRef.current.push(x, y);
  }, [isDrawer, getCanvasCoords, tool, color, currentSize]);

  const handlePointerUp = useCallback((e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !isDrawer) return;
    e.preventDefault();
    isDrawingRef.current = false;

    const stroke: DrawGuessStroke = {
      tool,
      color: tool === 'eraser' ? '#ffffff' : color,
      size: currentSize,
      points: [...currentPointsRef.current],
    };

    strokesRef.current.push(stroke);
    undoneRef.current = [];
    setCanUndo(true);
    setCanRedo(false);

    if (onStroke) onStroke(stroke);
    currentPointsRef.current = [];
  }, [isDrawer, tool, color, currentSize, onStroke]);

  const handleUndo = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    const undone = strokesRef.current.pop()!;
    undoneRef.current.push(undone);
    setCanUndo(strokesRef.current.length > 0);
    setCanRedo(true);
    redrawCanvas();
    if (onUndo) onUndo();
  }, [redrawCanvas, onUndo]);

  const handleRedo = useCallback(() => {
    if (undoneRef.current.length === 0) return;
    const redone = undoneRef.current.pop()!;
    strokesRef.current.push(redone);
    setCanUndo(true);
    setCanRedo(undoneRef.current.length > 0);
    redrawCanvas();
    if (onRedo) onRedo();
  }, [redrawCanvas, onRedo]);

  const handleClear = useCallback(() => {
    strokesRef.current = [];
    undoneRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (onClear) onClear();
  }, [onClear]);

  // Receive remote stroke
  const addRemoteStroke = useCallback((stroke: DrawGuessStroke) => {
    strokesRef.current.push(stroke);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawStroke(ctx, stroke);
  }, []);

  const handleRemoteUndo = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    const undone = strokesRef.current.pop()!;
    undoneRef.current.push(undone);
    redrawCanvas();
  }, [redrawCanvas]);

  const handleRemoteRedo = useCallback(() => {
    if (undoneRef.current.length === 0) return;
    const redone = undoneRef.current.pop()!;
    strokesRef.current.push(redone);
    redrawCanvas();
  }, [redrawCanvas]);

  const handleRemoteClear = useCallback(() => {
    strokesRef.current = [];
    undoneRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Expose methods for parent
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    (canvas as any).__drawingApi = {
      addRemoteStroke,
      handleRemoteUndo,
      handleRemoteRedo,
      handleRemoteClear,
    };
  }, [addRemoteStroke, handleRemoteUndo, handleRemoteRedo, handleRemoteClear]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Fixed wide internal resolution shared by all clients for consistent stroke replay.
    canvas.width = 1280;
    canvas.height = 720;
    if (canvasRefCallback) canvasRefCallback(canvas);
  }, [canvasRefCallback]);

  const sizeLabels = tool === 'pen' ? PEN_SIZES : ERASER_SIZES;
  const sizeIndex = tool === 'pen' ? penSizeIndex : eraserSizeIndex;
  const setSizeIndex = tool === 'pen' ? setPenSizeIndex : setEraserSizeIndex;

  return (
    <div className="drawing-canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={blockTouchGesture}
        onTouchMove={blockTouchGesture}
        onContextMenu={blockContextMenu}
        style={{
          touchAction: 'none',
          cursor: isDrawer ? 'crosshair' : 'default',
        }}
      />
      {isDrawer && (
        <div className="drawing-toolbar" onTouchStart={blockTouchGesture} onTouchMove={blockTouchGesture} onContextMenu={blockContextMenu}>
          <div className="drawing-tools-row">
            <button
              type="button"
              className={`drawing-tool-btn ${tool === 'pen' ? 'active' : ''}`}
              onClick={() => setTool('pen')}
              title="ペン"
            >
              ✏️
            </button>
            <button
              type="button"
              className={`drawing-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
              onClick={() => setTool('eraser')}
              title="消しゴム"
            >
              🧹
            </button>
            <div className="drawing-tool-divider" />
            <button
              type="button"
              className="drawing-tool-btn"
              onClick={handleUndo}
              disabled={!canUndo}
              title="元に戻す"
            >
              ↩️
            </button>
            <button
              type="button"
              className="drawing-tool-btn"
              onClick={handleRedo}
              disabled={!canRedo}
              title="やり直す"
            >
              ↪️
            </button>
          </div>

          <div className="drawing-size-row">
            <span className="drawing-size-label">{tool === 'pen' ? 'ペンサイズ' : '消しゴムサイズ'}</span>
            <div className="drawing-size-buttons">
              {sizeLabels.map((size, i) => (
                <button
                  key={size}
                  type="button"
                  className={`drawing-size-btn ${i === sizeIndex ? 'active' : ''}`}
                  onClick={() => setSizeIndex(i)}
                >
                  <span
                    className="drawing-size-dot"
                    style={{
                      width: Math.max(4, size * 0.6),
                      height: Math.max(4, size * 0.6),
                      background: tool === 'pen' ? color : '#ccc',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {tool === 'pen' && (
            <div className="drawing-color-row">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`drawing-color-btn ${c === color ? 'active' : ''}`}
                  onClick={() => setColor(c)}
                  style={{ background: c }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: DrawGuessStroke) {
  if (stroke.points.length < 2) return;
  const { tool, color, size, points } = stroke;

  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
  }

  // Draw initial dot
  ctx.beginPath();
  ctx.arc(points[0], points[1], size / 2, 0, Math.PI * 2);
  ctx.fillStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
  ctx.fill();

  if (points.length === 2) {
    ctx.globalCompositeOperation = 'source-over';
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) {
    ctx.lineTo(points[i], points[i + 1]);
  }
  ctx.strokeStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}
