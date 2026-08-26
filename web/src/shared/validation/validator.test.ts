import { validate, ValidationError } from "@/shared/validation/types";
import { number, object, string } from "@/shared/validation/validator";

describe("object validator", () => {
  it("returns typed objects for valid input", () => {
    const valid = (data: unknown) =>
      object(data, () => ({
        name: string,
        age: number,
      }));

    const result = validate({ name: "Ada", age: 36 }, valid);
    expect(result.name).toBe("Ada");
    expect(result.age).toBe(36);
  });

  it("throws when a required field is missing", () => {
    const valid = (data: unknown) =>
      object(data, () => ({
        name: string,
      }));

    expect(() => validate({}, valid)).toThrow(ValidationError);
  });
});
