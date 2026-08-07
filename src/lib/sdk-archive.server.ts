/**
 * Packages the real SDK projects in `sdk-source/` into ZIP archives on demand.
 *
 * Every SDK file is inlined into the server bundle at build time, so the
 * download endpoint works in the edge runtime with no filesystem access. The
 * archive uses the ZIP "stored" method (no compression) so no dependency and
 * no native binding is required, and output is byte-for-byte deterministic.
 */

const SDK_FILES = import.meta.glob("../../sdk-source/**/*", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** All SDK ids that have real source available for download. */
export function availableSdkIds(): string[] {
  const ids = new Set<string>();
  for (const path of Object.keys(SDK_FILES)) {
    const id = path.split("sdk-source/")[1]?.split("/")[0];
    if (id) ids.add(id);
  }
  return [...ids].sort();
}

/** Files belonging to one SDK, keyed by their path inside the archive. */
function filesFor(id: string): Map<string, string> {
  const prefix = `sdk-source/${id}/`;
  const files = new Map<string, string>();
  for (const [path, content] of Object.entries(SDK_FILES)) {
    const index = path.indexOf(prefix);
    if (index === -1) continue;
    files.set(path.slice(index + prefix.length), content);
  }
  return new Map([...files.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

type Chunk = { name: Uint8Array; data: Uint8Array; crc: number; offset: number };

/**
 * Builds a ZIP archive for one SDK.
 *
 * @param id SDK folder name inside `sdk-source/`.
 * @param rootFolder Top-level folder name inside the archive.
 * @returns The archive bytes, or `null` when the SDK does not exist.
 */
export function buildSdkArchive(id: string, rootFolder: string): Uint8Array | null {
  const files = filesFor(id);
  if (files.size === 0) return null;

  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const chunks: Chunk[] = [];
  let offset = 0;

  for (const [path, content] of files) {
    const name = encoder.encode(`${rootFolder}/${path}`);
    const data = encoder.encode(content);
    const crc = crc32(data);

    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); // local file header signature
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0x0800, true); // UTF-8 names
    view.setUint16(8, 0, true); // stored
    view.setUint16(10, 0, true); // time (fixed for determinism)
    view.setUint16(12, 0x2921, true); // date: 2020-09-01
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, name.length, true);
    view.setUint16(28, 0, true);
    header.set(name, 30);

    locals.push(header, data);
    chunks.push({ name, data, crc, offset });
    offset += header.length + data.length;
  }

  const centrals: Uint8Array[] = [];
  let centralSize = 0;
  for (const chunk of chunks) {
    const entry = new Uint8Array(46 + chunk.name.length);
    const view = new DataView(entry.buffer);
    view.setUint32(0, 0x02014b50, true); // central directory signature
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, 0x0800, true);
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint16(14, 0x2921, true);
    view.setUint32(16, chunk.crc, true);
    view.setUint32(20, chunk.data.length, true);
    view.setUint32(24, chunk.data.length, true);
    view.setUint16(28, chunk.name.length, true);
    view.setUint32(42, chunk.offset, true);
    entry.set(chunk.name, 46);

    centrals.push(entry);
    centralSize += entry.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true); // end of central directory
  endView.setUint16(8, chunks.length, true);
  endView.setUint16(10, chunks.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const total = offset + centralSize + end.length;
  const archive = new Uint8Array(total);
  let cursor = 0;
  for (const part of [...locals, ...centrals, end]) {
    archive.set(part, cursor);
    cursor += part.length;
  }
  return archive;
}