import { dealoc, JQLite } from "../../shared/jqlite/jqlite.js";
import { Angular } from "../../loader";
import { createInjector } from "../../core/di/injector";

describe("ngCloak", () => {
  let element;
  let $compile;
  let $rootScope;
  let injector;

  beforeEach(() => {
    window.angular = new Angular();
    injector = createInjector(["ng"]);
    $compile = injector.get("$compile");
    $rootScope = injector.get("$rootScope");
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should get removed when an element is compiled", () => {
    element = JQLite("<div ng-cloak></div>");
    expect(element.attr("ng-cloak")).toBe("");
    $compile(element);
    expect(element.attr("ng-cloak")).toBeUndefined();
  });

  it("should remove ngCloak class from a compiled element with attribute", () => {
    element = JQLite('<div ng-cloak class="foo ng-cloak bar"></div>');

    expect(element.classList.contains("foo")).toBe(true);
    expect(element.classList.contains("ng-cloak")).toBe(true);
    expect(element.classList.contains("bar")).toBe(true);

    $compile(element);

    expect(element.classList.contains("foo")).toBe(true);
    expect(element.classList.contains("ng-cloak")).toBe(false);
    expect(element.classList.contains("bar")).toBe(true);
  });
});
