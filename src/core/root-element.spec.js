import { createElementFromHTML, dealoc } from "../shared/jqlite/jqlite.js";
import { Angular } from "../loader";

describe("$rootElement", () => {
  let angular = new Angular();

  it("should publish the bootstrap element into $rootElement", () => {
    const element = createElementFromHTML("<div></div>");
    const injector = angular.bootstrap(element, []);

    expect(injector.get("$rootElement")).toBe(element);
    dealoc(element);
  });
});
