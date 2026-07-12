import type {
  ProposalCanvasArrowElement,
  ProposalCanvasBlock,
  ProposalCanvasDrawElement,
  ProposalCanvasElement,
  ProposalCanvasImageElement,
  ProposalCanvasShapeElement,
  ProposalCanvasTextElement,
} from "@/lib/types"

// ---------------------------------------------------------------------------
// Flatten a free-form canvas block into a single raster image.
//
// The proposal editor lets users stack any number of images/text/shapes/arrows/
// drawings on one canvas. Rather than uploading every image individually, we
// composite the whole canvas into ONE bitmap here and upload only that. The
// drawing mirrors the DOM/SVG rendering in canvas-block-editor.tsx so the saved
// image matches what the user built. All element geometry is normalized 0–1
// relative to the canvas, with `block.width`/`block.height` as the design
// dimensions (the coordinate space we rasterize in).
// ---------------------------------------------------------------------------

const DEFAULT_FONT_FAMILY = "Inter, system-ui, -apple-system, sans-serif"

type Box = { x: number; y: number; w: number; h: number }

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Remote images (e.g. Cloudinary library photos) must be requested with CORS
    // so the resulting canvas isn't tainted and `toBlob` can read it back.
    if (/^https?:/i.test(url)) img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

function roundRectPath(ctx: CanvasRenderingContext2D, box: Box, radius: number) {
  const r = Math.max(0, Math.min(radius, box.w / 2, box.h / 2))
  ctx.beginPath()
  if (typeof ctx.roundRect === "function" && r > 0) {
    ctx.roundRect(box.x, box.y, box.w, box.h, r)
    return
  }
  if (r <= 0) {
    ctx.rect(box.x, box.y, box.w, box.h)
    return
  }
  ctx.moveTo(box.x + r, box.y)
  ctx.arcTo(box.x + box.w, box.y, box.x + box.w, box.y + box.h, r)
  ctx.arcTo(box.x + box.w, box.y + box.h, box.x, box.y + box.h, r)
  ctx.arcTo(box.x, box.y + box.h, box.x, box.y, r)
  ctx.arcTo(box.x, box.y, box.x + box.w, box.y, r)
  ctx.closePath()
}

function boxOf(el: ProposalCanvasElement, W: number, H: number): Box {
  return { x: el.x * W, y: el.y * H, w: el.w * W, h: el.h * H }
}

function drawImageElement(
  ctx: CanvasRenderingContext2D,
  el: ProposalCanvasImageElement,
  img: HTMLImageElement,
  W: number,
  H: number,
) {
  const box = boxOf(el, W, H)
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (!iw || !ih || box.w <= 0 || box.h <= 0) return

  ctx.save()
  roundRectPath(ctx, box, el.radius ?? 0)
  ctx.clip()

  const fit = el.objectFit ?? "cover"
  const scale = fit === "contain" ? Math.min(box.w / iw, box.h / ih) : Math.max(box.w / iw, box.h / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(img, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh)
  ctx.restore()
}

/** Word-wrap text within a max width, honoring explicit newlines. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split("\n")) {
    if (paragraph === "") {
      lines.push("")
      continue
    }
    const words = paragraph.split(/(\s+)/)
    let current = ""
    for (const word of words) {
      const candidate = current + word
      if (current && ctx.measureText(candidate).width > maxWidth) {
        lines.push(current.trimEnd())
        current = word.trimStart()
      } else {
        current = candidate
      }
    }
    if (current.trim() || current === "") lines.push(current.trimEnd())
  }
  return lines
}

function drawTextElement(
  ctx: CanvasRenderingContext2D,
  el: ProposalCanvasTextElement,
  W: number,
  H: number,
  fontFamily: string,
) {
  const box = boxOf(el, W, H)
  const padX = 4
  const padY = 3
  const lineHeight = el.fontSize * 1.25

  ctx.save()
  const weight = el.bold ? "700" : "400"
  const style = el.italic ? "italic" : "normal"
  ctx.font = `${style} ${weight} ${el.fontSize}px ${fontFamily}`
  ctx.textBaseline = "top"

  const maxWidth = Math.max(1, box.w - padX * 2)
  const lines = wrapText(ctx, el.text, maxWidth)

  if (el.background) {
    ctx.fillStyle = el.background
    roundRectPath(ctx, box, 6)
    ctx.fill()
  }

  ctx.fillStyle = el.color
  const align = el.align ?? "left"
  ctx.textAlign = align === "center" ? "center" : align === "right" ? "right" : "left"
  const textX = align === "center" ? box.x + box.w / 2 : align === "right" ? box.x + box.w - padX : box.x + padX

  // Clip to the box so overflow behaves like the on-screen `overflow-hidden`.
  roundRectPath(ctx, box, el.background ? 6 : 0)
  ctx.clip()

  lines.forEach((line, i) => {
    ctx.fillText(line, textX, box.y + padY + i * lineHeight)
  })
  ctx.restore()
}

function drawShapeElement(ctx: CanvasRenderingContext2D, el: ProposalCanvasShapeElement, W: number, H: number) {
  const box = boxOf(el, W, H)
  ctx.save()
  if (el.shape === "ellipse") {
    ctx.beginPath()
    ctx.ellipse(box.x + box.w / 2, box.y + box.h / 2, box.w / 2, box.h / 2, 0, 0, Math.PI * 2)
  } else {
    roundRectPath(ctx, box, el.radius ?? 0)
  }
  if (el.fill) {
    ctx.globalAlpha = el.fillOpacity ?? 1
    ctx.fillStyle = el.fill
    ctx.fill()
    ctx.globalAlpha = 1
  }
  if (el.strokeWidth > 0) {
    ctx.lineJoin = "round"
    ctx.lineWidth = el.strokeWidth
    ctx.strokeStyle = el.stroke
    ctx.stroke()
  }
  ctx.restore()
}

function drawArrowElement(ctx: CanvasRenderingContext2D, el: ProposalCanvasArrowElement, W: number, H: number) {
  const [p0, p1] = el.points
  const x1 = (el.x + p0.x * el.w) * W
  const y1 = (el.y + p0.y * el.h) * H
  const x2 = (el.x + p1.x * el.w) * W
  const y2 = (el.y + p1.y * el.h) * H

  ctx.save()
  ctx.strokeStyle = el.color
  ctx.fillStyle = el.color
  ctx.lineWidth = el.width
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()

  if (el.variant !== "line") {
    // Arrowhead sized in stroke-width units, matching the SVG marker geometry.
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const headLen = Math.max(el.width * 4, 8)
    const headHalf = Math.max(el.width * 2, 4)
    ctx.beginPath()
    ctx.moveTo(x2, y2)
    ctx.lineTo(
      x2 - headLen * Math.cos(angle) + headHalf * Math.sin(angle),
      y2 - headLen * Math.sin(angle) - headHalf * Math.cos(angle),
    )
    ctx.lineTo(
      x2 - headLen * Math.cos(angle) - headHalf * Math.sin(angle),
      y2 - headLen * Math.sin(angle) + headHalf * Math.cos(angle),
    )
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

function drawDrawElement(ctx: CanvasRenderingContext2D, el: ProposalCanvasDrawElement, W: number, H: number) {
  if (el.points.length < 2) return
  ctx.save()
  ctx.strokeStyle = el.color
  ctx.lineWidth = el.width
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  ctx.beginPath()
  el.points.forEach((p, i) => {
    const px = (el.x + p.x * el.w) * W
    const py = (el.y + p.y * el.h) * H
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.stroke()
  ctx.restore()
}

export type RasterizeResult = { blob: Blob; width: number; height: number }

/**
 * Composite a canvas block into a single image Blob. `scale` upsamples for
 * crispness (2 ≈ retina). Throws if the resulting canvas is tainted by a
 * cross-origin image that could not be read back.
 */
export async function rasterizeCanvasBlock(
  block: ProposalCanvasBlock,
  opts?: { scale?: number; fontFamily?: string; mimeType?: string; quality?: number },
): Promise<RasterizeResult> {
  const scale = opts?.scale ?? 2
  const fontFamily = opts?.fontFamily || DEFAULT_FONT_FAMILY
  const mimeType = opts?.mimeType || "image/jpeg"
  const quality = opts?.quality ?? 0.92
  const W = block.width
  const H = block.height

  const canvas = document.createElement("canvas")
  canvas.width = Math.round(W * scale)
  canvas.height = Math.round(H * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context unavailable")
  ctx.scale(scale, scale)

  // Background (JPEG has no alpha, so always paint a base color).
  ctx.fillStyle = block.background ?? "#ffffff"
  ctx.fillRect(0, 0, W, H)

  const sorted = [...block.elements].sort((a, b) => a.z - b.z)

  // Preload image sources up front so draw order stays synchronous. A failed
  // load is skipped rather than aborting the whole flatten.
  const imageCache = new Map<string, HTMLImageElement>()
  await Promise.all(
    sorted
      .filter((el): el is ProposalCanvasImageElement => el.kind === "image")
      .map(async (el) => {
        if (imageCache.has(el.url)) return
        try {
          imageCache.set(el.url, await loadImage(el.url))
        } catch {
          /* skip broken image */
        }
      }),
  )

  for (const el of sorted) {
    ctx.save()
    if (el.rotation) {
      const box = boxOf(el, W, H)
      const cx = box.x + box.w / 2
      const cy = box.y + box.h / 2
      ctx.translate(cx, cy)
      ctx.rotate((el.rotation * Math.PI) / 180)
      ctx.translate(-cx, -cy)
    }
    switch (el.kind) {
      case "image": {
        const img = imageCache.get(el.url)
        if (img) drawImageElement(ctx, el, img, W, H)
        break
      }
      case "text":
        drawTextElement(ctx, el, W, H, fontFamily)
        break
      case "shape":
        drawShapeElement(ctx, el, W, H)
        break
      case "arrow":
        drawArrowElement(ctx, el, W, H)
        break
      case "draw":
        drawDrawElement(ctx, el, W, H)
        break
    }
    ctx.restore()
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality))
  if (!blob) {
    throw new Error("Could not export the canvas image. A cross-origin image may have blocked it.")
  }
  return { blob, width: canvas.width, height: canvas.height }
}
