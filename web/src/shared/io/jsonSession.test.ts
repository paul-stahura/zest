import { parseSessionEnvelopeJson, serializeSessionEnvelope } from "@/shared/io/jsonSession";
import { IoError } from "@/shared/io/errors";

describe("parseSessionEnvelopeJson", () => {
  it("round-trips a valid envelope", () => {
    const envelope = {
      version: 1 as const,
      visualizationId: "main-workspace",
      state: { hello: "world" },
    };
    const text = serializeSessionEnvelope(envelope);
    const parsed = parseSessionEnvelopeJson("cid", text);
    expect(parsed).toEqual(envelope);
  });

  it("wraps invalid JSON in IoError", () => {
    expect(() => parseSessionEnvelopeJson("cid", "{")).toThrow(IoError);
  });
});
