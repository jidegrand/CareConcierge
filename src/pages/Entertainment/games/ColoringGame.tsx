import { useState, useRef, useEffect } from 'react'
import GameLayout from '../components/GameLayout'

interface ColoringGameProps {
  onBack: () => void
}

const colorPalette = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#ffffff' },
]

const brushSizes = [5, 10, 15, 20]

export default function ColoringGame({ onBack }: ColoringGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentColor, setCurrentColor] = useState('#3b82f6')
  const [brushSize, setBrushSize] = useState(10)
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Set canvas size
        canvas.width = canvas.offsetWidth
        canvas.height = canvas.offsetHeight

        // Fill with white background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        setContext(ctx)
      }
    }
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!context) return
    setIsDrawing(true)

    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      context.beginPath()
      context.moveTo(x, y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !context) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      context.strokeStyle = currentColor
      context.lineWidth = brushSize
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.lineTo(x, y)
      context.stroke()
    }
  }

  const stopDrawing = () => {
    if (context) {
      context.closePath()
    }
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    if (context && canvasRef.current) {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  const downloadCanvas = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = 'my-coloring.png'
      link.click()
    }
  }

  return (
    <GameLayout title="Creative Art & Coloring" onBack={onBack}>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Canvas */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full h-96 cursor-crosshair"
              style={{ touchAction: 'none' }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="w-full lg:w-64 flex flex-col gap-6">
          {/* Color Palette */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3 text-sm">Colors</h3>
            <div className="grid grid-cols-5 gap-2">
              {colorPalette.map((color) => (
                <button
                  key={color.hex}
                  onClick={() => setCurrentColor(color.hex)}
                  className={`w-full aspect-square rounded-lg transition-all ${
                    currentColor === color.hex
                      ? 'ring-2 ring-yellow-400 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex, border: color.hex === '#ffffff' ? '2px solid #ccc' : 'none' }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Brush Size */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3 text-sm">Brush Size</h3>
            <div className="space-y-2">
              {brushSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  className={`w-full px-4 py-2 rounded-lg font-semibold transition-all ${
                    brushSize === size
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-slate-700 rounded-lg p-4 space-y-2">
            <button
              onClick={clearCanvas}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
            >
              Clear Canvas
            </button>
            <button
              onClick={downloadCanvas}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              Download Art
            </button>
          </div>

          {/* Tips */}
          <div className="bg-slate-700 rounded-lg p-4">
            <p className="text-xs text-gray-400">
              💡 Tip: Use different brush sizes and colors to create beautiful artwork. Let your creativity flow!
            </p>
          </div>
        </div>
      </div>
    </GameLayout>
  )
}
