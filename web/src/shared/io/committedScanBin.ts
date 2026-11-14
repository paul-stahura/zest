/** Little-endian packed harvest: magic `ZOF1`, count, then σ / T / |f|. */

const MAGIC = 0x31464f5a;

export type CommittedScanPoints = {
  sigma: Float64Array;
  t: Float64Array;
  yVal: Float64Array;
};

/**
 * Parse a committed-scan binary. `t` is spiral index T, not Im(s).
 *
 * @throws if the buffer is truncated or the magic/count is invalid.
 */
/** Pack σ / T / |f| into the committed-scan binary (tests and rebuilds). */
export function encodeCommittedScanBin(points: CommittedScanPoints): ArrayBuffer {
  const count = points.sigma.length;
  if (points.t.length !== count || points.yVal.length !== count) {
    throw new Error("encodeCommittedScanBin: sigma/t/yVal length mismatch");
  }
  const buffer = new ArrayBuffer(8 + count * 8 * 3);
  const header = new DataView(buffer);
  header.setUint32(0, MAGIC, true);
  header.setUint32(4, count, true);
  const body = new Float64Array(buffer, 8, count * 3);
  body.set(points.sigma, 0);
  body.set(points.t, count);
  body.set(points.yVal, count * 2);
  return buffer;
}

export function parseCommittedScanBin(buffer: ArrayBuffer): CommittedScanPoints {
  if (buffer.byteLength < 8) {
    throw new Error("committed scan bin is too short");
  }
  const header = new DataView(buffer);
  const magic = header.getUint32(0, true);
  if (magic !== MAGIC) {
    throw new Error(`committed scan bin magic mismatch: ${magic.toString(16)}`);
  }
  const count = header.getUint32(4, true);
  const expected = 8 + count * 8 * 3;
  if (buffer.byteLength !== expected) {
    throw new Error(`committed scan bin size ${String(buffer.byteLength)} != ${String(expected)}`);
  }
  const body = new Float64Array(buffer, 8, count * 3);
  return {
    sigma: body.subarray(0, count),
    t: body.subarray(count, count * 2),
    yVal: body.subarray(count * 2, count * 3),
  };
}
