import { createHash } from 'node:crypto'
import { deflateSync } from 'node:zlib'

export type AstraVisionBenchmarkMedia = {
  mediaType: 'image/png'
  base64: string
  digest: string
}

export type AstraVisionBenchmarkGroundTruth = {
  barCount: number
  leftMostBarColor: 'red' | 'blue' | 'green' | 'gold' | 'purple'
  markerHalf: 'left' | 'right'
  shortestToTallestPositions: number[]
}

type RGB = readonly [number, number, number]
const WHITE: RGB = [255, 255, 255]
const BLACK: RGB = [20, 20, 24]
const RED: RGB = [220, 50, 60]
const BLUE: RGB = [45, 105, 220]
const GREEN: RGB = [45, 170, 90]
const GOLD: RGB = [225, 170, 35]
const PURPLE: RGB = [135, 70, 200]
const COLORS = [RED, BLUE, GREEN, GOLD, PURPLE] as const
const COLOR_NAMES = ['red', 'blue', 'green', 'gold', 'purple'] as const

function benchmarkIndex(caseId: string): number {
  const match = /^v1-(\d{2})-/.exec(caseId)
  if (!match) throw new Error('Unknown Astra vision benchmark case.')
  const index = Number(match[1]) - 1
  if (!Number.isInteger(index) || index < 0 || index >= 20) throw new Error('Unknown Astra vision benchmark case.')
  return index
}

function barHeights(index: number): number[] {
  const count = 2 + (index % 5)
  return Array.from({ length: count }, (_, i) => 18 + ((index * 11 + i * 17) % 58))
}

export function getAstraVisionBenchmarkGroundTruth(caseId: string): AstraVisionBenchmarkGroundTruth {
  const index = benchmarkIndex(caseId)
  const heights = barHeights(index)
  return {
    barCount: heights.length,
    leftMostBarColor: COLOR_NAMES[index % COLOR_NAMES.length]!,
    markerHalf: index % 2 === 0 ? 'left' : 'right',
    shortestToTallestPositions: heights
      .map((height, position) => ({ height, position: position + 1 }))
      .sort((a, b) => a.height - b.height)
      .map((entry) => entry.position),
  }
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([typeBytes, Buffer.from(data)])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([length, typeBytes, Buffer.from(data), crc])
}

function encodePng(width: number, height: number, pixels: Uint8Array): Buffer {
  const rows = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1)
    rows[rowOffset] = 0
    Buffer.from(pixels.subarray(y * width * 4, (y + 1) * width * 4)).copy(rows, rowOffset + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function setPixel(pixels: Uint8Array, width: number, x: number, y: number, color: RGB) {
  if (x < 0 || y < 0 || x >= width) return
  const offset = (y * width + x) * 4
  pixels[offset] = color[0]
  pixels[offset + 1] = color[1]
  pixels[offset + 2] = color[2]
  pixels[offset + 3] = 255
}

function rect(pixels: Uint8Array, width: number, height: number, x: number, y: number, w: number, h: number, color: RGB) {
  for (let yy = Math.max(0, y); yy < Math.min(height, y + h); yy += 1) {
    for (let xx = Math.max(0, x); xx < Math.min(width, x + w); xx += 1) setPixel(pixels, width, xx, yy, color)
  }
}

function line(pixels: Uint8Array, width: number, height: number, x1: number, y1: number, x2: number, y2: number, color: RGB) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))
  for (let i = 0; i <= steps; i += 1) {
    const x = Math.round(x1 + ((x2 - x1) * i) / Math.max(1, steps))
    const y = Math.round(y1 + ((y2 - y1) * i) / Math.max(1, steps))
    if (y >= 0 && y < height) setPixel(pixels, width, x, y, color)
  }
}

export function renderAstraVisionBenchmarkMedia(caseId: string): AstraVisionBenchmarkMedia {
  const index = benchmarkIndex(caseId)
  const width = 160
  const height = 120
  const pixels = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) setPixel(pixels, width, x, y, WHITE)

  const heights = barHeights(index)
  const primary = COLORS[index % COLORS.length]!
  const secondary = COLORS[(index + 2) % COLORS.length]!
  rect(pixels, width, height, 8, 8, 144, 104, [245, 245, 247])
  line(pixels, width, height, 16, 96, 144, 96, BLACK)
  line(pixels, width, height, 16, 20, 16, 96, BLACK)

  for (let i = 0; i < heights.length; i += 1) {
    const barWidth = 14
    const barHeight = heights[i]!
    const x = 25 + i * 22
    rect(pixels, width, height, x, 95 - barHeight, barWidth, barHeight, i % 2 === 0 ? primary : secondary)
  }
  const markerLeft = index % 2 === 0
  rect(pixels, width, height, markerLeft ? 24 : 126, 16 + (index % 3) * 9, 10, 10, GOLD)

  const png = encodePng(width, height, pixels)
  return {
    mediaType: 'image/png',
    base64: png.toString('base64'),
    digest: createHash('sha256').update(png).digest('hex'),
  }
}
