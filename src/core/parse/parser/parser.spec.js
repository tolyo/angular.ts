import { Parser } from "./parser.js";

describe("Parser", () => {
  it("can be contructed", () => {
    const parser = new Parser();
    expect(parser).toBeDefined();
  });
});
