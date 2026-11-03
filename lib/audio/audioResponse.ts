/** Safari and iOS only seek audio when the server answers byte ranges. */
export function audioResponse(data: Buffer, range: string | null, extraHeaders: Record<string, string> = {}) {
  const total = data.byteLength;
  const shared = {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    ...extraHeaders,
  };
  if (!range) {
    return new Response(new Uint8Array(data), { headers: { ...shared, "Content-Length": String(total) } });
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let start = match?.[1] ? Number(match[1]) : 0;
  let end = match?.[2] ? Number(match[2]) : total - 1;
  if (match && !match[1] && match[2]) {
    // "bytes=-500" asks for the last 500 bytes.
    start = Math.max(0, total - Number(match[2]));
    end = total - 1;
  }
  if (!match || !Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
    return new Response(null, { status: 416, headers: { ...shared, "Content-Range": `bytes */${total}` } });
  }
  const safeEnd = Math.min(end, total - 1);
  const slice = data.subarray(start, safeEnd + 1);
  return new Response(new Uint8Array(slice), {
    status: 206,
    headers: {
      ...shared,
      "Content-Length": String(slice.byteLength),
      "Content-Range": `bytes ${start}-${safeEnd}/${total}`,
    },
  });
}
