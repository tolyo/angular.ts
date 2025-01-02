import { JQLite, dealoc } from "../shared/jqlite/jqlite.js";
import { Angular } from "../loader";

describe("$rootElement", () => {
  let angular = new Angular();

  it("should publish the bootstrap element into $rootElement", () => {
    const element = JQLite("<div></div>");
    const injector = angular.bootstrap(element);

    expect(injector.get("$rootElement")[0]).toBe(element[0]);
    dealoc(element);
  });
});
