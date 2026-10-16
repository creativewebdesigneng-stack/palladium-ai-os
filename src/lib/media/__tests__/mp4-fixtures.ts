export function mp4BoxFixture(type: string, payload: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(8 + payload.length);
  new DataView(bytes.buffer).setUint32(0, bytes.length);
  bytes.set([...type].map(c => c.charCodeAt(0)), 4); bytes.set(payload, 8); return bytes;
}
export function joinMp4Bytes(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0;
  for (const part of parts) { result.set(part, at); at += part.length; } return result;
}
export function mp4Fixture(options: { version?: number; handler?: string; movieAtEnd?: boolean; mediaBytes?: number } = {}): Uint8Array {
  const version = options.version ?? 0, header = new Uint8Array(version === 1 ? 112 : 100), view = new DataView(header.buffer);
  header[0] = version; view.setUint32(version === 1 ? 20 : 12, 1000);
  if (version === 1) view.setBigUint64(24, 2000n); else view.setUint32(16, 2000);
  const handler = new Uint8Array(24);handler.set([...(options.handler ?? 'vide')].map(c => c.charCodeAt(0)),8);
  const movie=mp4BoxFixture('moov',joinMp4Bytes(mp4BoxFixture('mvhd',header),mp4BoxFixture('trak',mp4BoxFixture('mdia',mp4BoxFixture('hdlr',handler)))));
  const brands=new Uint8Array(16);brands.set([...'isom'].map(c=>c.charCodeAt(0)),0);brands.set([...'isommp42'].map(c=>c.charCodeAt(0)),8);
  const ftyp=mp4BoxFixture('ftyp',brands),media=mp4BoxFixture('mdat',new Uint8Array(options.mediaBytes ?? 32));
  return options.movieAtEnd?joinMp4Bytes(ftyp,media,movie):joinMp4Bytes(ftyp,movie,media);
}
