import {
  JQLite,
  dealoc,
  kebabToCamel,
  cleanElementData,
  getOrSetCacheData,
  removeElementData,
} from "./jqlite";
import { Angular } from "../../loader";
import { createInjector } from "../../core/di/injector";
import { equals } from "../utils";
import { browserTrigger } from "../test-utils";
import { CACHE, EXPANDO } from "../../core/cache/cache";

describe("jqLite", () => {
  let scope;
  let a;
  let b;
  let c;
  let injector;

  beforeEach(() => {
    a = JQLite("<div>A</div>")[0];
    b = JQLite("<div>B</div>")[0];
    c = JQLite("<div>C</div>")[0];
  });

  beforeEach(() => {
    window.angular = new Angular();
    injector = createInjector(["ng"]);
    scope = injector.get("$rootScope");
    jasmine.addMatchers({
      toJqEqual() {
        return {
          compare(_actual_, expected) {
            let msg = "Unequal length";
            const message = () => {
              return msg;
            };

            let value =
              _actual_ && expected && _actual_.length === expected.length;
            for (let i = 0; value && i < expected.length; i++) {
              const actual = JQLite(_actual_[i])[0];
              const expect = JQLite(expected[i])[0];
              value = value && equals(expect, actual);
              msg = `Not equal at index: ${i} - Expected: ${expect} - Actual: ${actual}`;
            }
            return { pass: value, message };
          },
        };
      },
    });
  });

  afterEach(() => {
    dealoc(a);
    dealoc(b);
    dealoc(c);
  });

  describe("construction", () => {
    it("should allow construction with text node", () => {
      const text = a.firstChild;
      const selected = JQLite(text);
      expect(selected.length).toEqual(1);
      expect(selected[0]).toEqual(text);
    });

    it("should allow construction with html", () => {
      const nodes = JQLite("<div>1</div><span>2</span>");
      expect(nodes[0].parentNode).toBeDefined();
      expect(nodes[0].parentNode.nodeType).toBe(11); /** Document Fragment * */
      expect(nodes[0].parentNode).toBe(nodes[1].parentNode);
      expect(nodes.length).toEqual(2);
      expect(nodes[0].innerHTML).toEqual("1");
      expect(nodes[1].innerHTML).toEqual("2");
    });

    it("should allow construction of html with leading whitespace", () => {
      const nodes = JQLite("  \n\r   \r\n<div>1</div><span>2</span>");
      expect(nodes[0].parentNode).toBeDefined();
      expect(nodes[0].parentNode.nodeType).toBe(11); /** Document Fragment * */
      expect(nodes[0].parentNode).toBe(nodes[1].parentNode);
      expect(nodes.length).toBe(2);
      expect(nodes[0].innerHTML).toBe("1");
      expect(nodes[1].innerHTML).toBe("2");
    });

    // See https://github.com/jquery/jquery/issues/1987 for details.
    it("should properly handle dash-delimited node names", () => {
      const nodeNames =
        "thead tbody tfoot colgroup caption tr th td div kung".split(" ");
      let nodeNamesTested = 0;
      let nodes;
      let customNodeName;

      nodeNames.forEach((nodeName) => {
        customNodeName = `${nodeName}-foo`;
        nodes = JQLite(`<${customNodeName}>Hello, world !</${customNodeName}>`);

        expect(nodes.length).toBe(1);
        expect(nodes[0].nodeName.toLowerCase()).toBe(customNodeName);
        expect(nodes.innerHTML).toBe("Hello, world !");

        nodeNamesTested++;
      });

      expect(nodeNamesTested).toBe(10);
    });

    it("should allow creation of comment tags", () => {
      const nodes = JQLite("<!-- foo -->");
      expect(nodes.length).toBe(1);
      expect(nodes[0].nodeType).toBe(8);
    });

    it("should allow creation of script tags", () => {
      const nodes = JQLite("<script></script>");
      expect(nodes.length).toBe(1);
      expect(nodes[0].tagName.toUpperCase()).toBe("SCRIPT");
    });

    it("should wrap document fragment", () => {
      const fragment = JQLite(document.createDocumentFragment());
      expect(fragment.length).toBe(1);
      expect(fragment[0].nodeType).toBe(11);
    });

    it("should allow construction of <option> elements", () => {
      const nodes = JQLite("<option>");
      expect(nodes.length).toBe(1);
      expect(nodes[0].nodeName.toLowerCase()).toBe("option");
    });

    it("should allow construction of multiple <option> elements", () => {
      const nodes = JQLite("<option></option><option></option>");
      expect(nodes.length).toBe(2);
      expect(nodes[0].nodeName.toLowerCase()).toBe("option");
      expect(nodes[1].nodeName.toLowerCase()).toBe("option");
    });

    // Special tests for the construction of elements which are restricted (in the HTML5 spec) to
    // being children of specific nodes.
    [
      "caption",
      "colgroup",
      "col",
      "optgroup",
      "opt",
      "tbody",
      "td",
      "tfoot",
      "th",
      "thead",
      "tr",
    ].forEach((name) => {
      it(
        "should allow construction of <$NAME$> elements".replace(
          "$NAME$",
          name,
        ),
        () => {
          const nodes = JQLite("<$NAME$>".replace("$NAME$", name));
          expect(nodes.length).toBe(1);
          expect(nodes[0].nodeName.toLowerCase()).toBe(name);
        },
      );
    });

    describe("security", () => {
      it("shouldn't crash at attempts to close the table wrapper", () => {
        expect(() => {
          // This test case attempts to close the tags which wrap input
          // based on matching done in wrapMap, escaping the wrapper & thus
          // triggering an error when descending.
          const el = JQLite("<td></td></tr></tbody></table><td></td>");
          expect(el.length).toBe(2);
          expect(el[0].nodeName.toLowerCase()).toBe("td");
          expect(el[1].nodeName.toLowerCase()).toBe("td");
        }).not.toThrow();
      });

      it("shouldn't unsanitize sanitized code", (done) => {
        let counter = 0;
        const assertCount = 13;
        const container = JQLite("<div></div>");

        function donePartial() {
          counter++;
          if (counter === assertCount) {
            container.remove();
            delete window.xss;
            done();
          }
        }
        JQLite(document.body).append(container);
        window.xss = jasmine.createSpy("xss");

        // Thanks to Masato Kinugawa from Cure53 for providing the following test cases.
        // Note: below test cases need to invoke the xss function with consecutive
        // decimal parameters for the assertions to be correct.
        [
          '<img alt="<x" title="/><img src=url404 onerror=xss(0)>">',
          '<img alt="\n<x" title="/>\n<img src=url404 onerror=xss(1)>">',
          "<style><style/><img src=url404 onerror=xss(2)>",
          "<xmp><xmp/><img src=url404 onerror=xss(3)>",
          "<title><title /><img src=url404 onerror=xss(4)>",
          "<iframe><iframe/><img src=url404 onerror=xss(5)>",
          "<noframes><noframes/><img src=url404 onerror=xss(6)>",
          "<noscript><noscript/><img src=url404 onerror=xss(7)>",
          '<foo" alt="" title="/><img src=url404 onerror=xss(8)>">',
          '<img alt="<x" title="" src="/><img src=url404 onerror=xss(9)>">',
          "<noscript/><img src=url404 onerror=xss(10)>",
          "<noembed><noembed/><img src=url404 onerror=xss(11)>",

          "<option><style></option></select><img src=url404 onerror=xss(12)></style>",
        ].forEach((htmlString, index) => {
          const element = JQLite("<div></div>");

          container.append(element);
          element.append(JQLite(htmlString));

          setTimeout(() => {
            expect(window.xss).not.toHaveBeenCalledWith(index);
            donePartial();
          });
        });
      });
    });
  });

  describe("inheritedData", () => {
    it("should retrieve data attached to the current element", () => {
      const element = JQLite("<i>foo</i>");
      element.data("myData", "abc");
      expect(element.inheritedData("myData")).toBe("abc");
      dealoc(element);
    });

    it("should walk up the dom to find data", () => {
      const element = JQLite("<ul><li><p><b>deep deep</b><p></li></ul>");
      const deepChild = JQLite(element[0].getElementsByTagName("b")[0]);
      element.data("myData", "abc");
      expect(deepChild.inheritedData("myData")).toBe("abc");
      dealoc(element);
    });

    it("should return undefined when no data was found", () => {
      const element = JQLite("<ul><li><p><b>deep deep</b><p></li></ul>");
      const deepChild = JQLite(element[0].getElementsByTagName("b")[0]);
      expect(deepChild.inheritedData("myData")).toBeFalsy();
      dealoc(element);
    });

    it("should work with the child html element instead if the current element is the document obj", () => {
      const item = {};
      const doc = JQLite(window.document);
      const html = doc.find("html");

      html.data("item", item);
      expect(doc.inheritedData("item")).toBe(item);
      expect(html.inheritedData("item")).toBe(item);
      dealoc(doc);
    });

    it("should return null values", () => {
      const ul = JQLite("<ul><li><p><b>deep deep</b><p></li></ul>");
      const li = ul.find("li");
      const b = li.find("b");

      ul.data("foo", "bar");
      li.data("foo", null);
      expect(b.inheritedData("foo")).toBe(null);
      expect(li.inheritedData("foo")).toBe(null);
      expect(ul.inheritedData("foo")).toBe("bar");

      dealoc(ul);
    });

    it("should pass through DocumentFragment boundaries via host", () => {
      const host = JQLite("<div></div>");
      const frag = document.createDocumentFragment();
      const $frag = JQLite(frag);
      frag.host = host[0];
      host.data("foo", 123);
      host.append($frag);
      expect($frag.inheritedData("foo")).toBe(123);

      dealoc(host);
      dealoc($frag);
    });
  });

  describe("scope", () => {
    it("should retrieve scope attached to the current element", () => {
      const element = JQLite("<i>foo</i>");
      element.data("$scope", scope);
      expect(element.scope()).toBe(scope);
      dealoc(element);
    });

    it("should retrieve isolate scope attached to the current element", () => {
      const element = JQLite("<i>foo</i>");
      element.data("$isolateScope", scope);
      expect(element.isolateScope()).toBe(scope);
      dealoc(element);
    });

    it("should retrieve scope attached to the html element if it's requested on the document", () => {
      const doc = JQLite(window.document);
      const html = doc.find("html");
      const scope = {};

      html.data("$scope", scope);

      expect(doc.scope().$id).toBe(scope.$id);
      expect(html.scope().$id).toBe(scope.$id);
      dealoc(doc);
    });

    it("should walk up the dom to find scope", () => {
      const element = JQLite("<ul><li><p><b>deep deep</b><p></li></ul>");
      const deepChild = JQLite(element[0].getElementsByTagName("b")[0]);
      element.data("$scope", scope);
      expect(deepChild.scope()).toBe(scope);
      dealoc(element);
    });

    it("should return undefined when no scope was found", () => {
      const element = JQLite("<ul><li><p><b>deep deep</b><p></li></ul>");
      const deepChild = JQLite(element[0].getElementsByTagName("b")[0]);
      expect(deepChild.scope()).toBeFalsy();
      dealoc(element);
    });
  });

  describe("isolateScope", () => {
    it("should retrieve isolate scope attached to the current element", () => {
      const element = JQLite("<i>foo</i>");
      element.data("$isolateScope", scope);
      expect(element.isolateScope()).toBe(scope);
      dealoc(element);
    });

    it("should not walk up the dom to find scope", () => {
      const element = JQLite("<ul><li><p><b>deep deep</b><p></li></ul>");
      const deepChild = JQLite(element[0].getElementsByTagName("b")[0]);
      element.data("$isolateScope", scope);
      expect(deepChild.isolateScope()).toBeUndefined();
      dealoc(element);
    });

    it("should return undefined when no scope was found", () => {
      const element = JQLite("<div></div>");
      expect(element.isolateScope()).toBeFalsy();
      dealoc(element);
    });
  });

  describe("injector", () => {
    it("should retrieve injector attached to the current element or its parent", () => {
      const template = JQLite("<div><span></span></div>");
      const span = template.children().eq(0);
      const injector = window.angular.init(template[0]);

      expect(span.injector()).toBe(injector);
      dealoc(template);
    });

    it("should retrieve injector attached to the html element if it's requested on document", () => {
      const doc = JQLite(window.document);
      const html = doc.find("html");
      const injector = {};

      html.data("$injector", injector);

      expect(doc.injector()).toBe(injector);
      expect(html.injector()).toBe(injector);
      dealoc(doc);
    });

    it("should do nothing with a noncompiled template", () => {
      const template = JQLite("<div><span></span></div>");
      expect(template.injector()).toBeUndefined();
      dealoc(template);
    });
  });

  describe("controller", () => {
    it("should retrieve controller attached to the current element or its parent", () => {
      const div = JQLite("<div><span></span></div>");
      const span = div.find("span");

      div.data("$ngControllerController", "ngController");
      span.data("$otherController", "other");

      expect(span.controller()).toBe("ngController");
      expect(span.controller("ngController")).toBe("ngController");
      expect(span.controller("other")).toBe("other");

      expect(div.controller()).toBe("ngController");
      expect(div.controller("ngController")).toBe("ngController");
      expect(div.controller("other")).toBeUndefined();

      dealoc(div);
    });
  });

  describe("data", () => {
    it("should set and get and remove data", () => {
      const selected = JQLite([a, b, c]);

      expect(selected.data("prop")).toBeUndefined();
      expect(selected.data("prop", "value")).toBe(selected);
      expect(selected.data("prop")).toBe("value");
      expect(JQLite(a).data("prop")).toBe("value");
      expect(JQLite(b).data("prop")).toBe("value");
      expect(JQLite(c).data("prop")).toBe("value");

      JQLite(a).data("prop", "new value");
      expect(JQLite(a).data("prop")).toBe("new value");
      expect(selected.data("prop")).toBe("new value");
      expect(JQLite(b).data("prop")).toBe("value");
      expect(JQLite(c).data("prop")).toBe("value");

      expect(selected.removeData("prop")).toBe(selected);
      expect(JQLite(a).data("prop")).toBeUndefined();
      expect(JQLite(b).data("prop")).toBeUndefined();
      expect(JQLite(c).data("prop")).toBeUndefined();
    });

    it("should only remove the specified value when providing a property name to removeData", () => {
      const selected = JQLite(a);

      expect(selected.data("prop1")).toBeUndefined();

      selected.data("prop1", "value");
      selected.data("prop2", "doublevalue");

      expect(selected.data("prop1")).toBe("value");
      expect(selected.data("prop2")).toBe("doublevalue");

      selected.removeData("prop1");

      expect(selected.data("prop1")).toBeUndefined();
      expect(selected.data("prop2")).toBe("doublevalue");

      selected.removeData("prop2");
    });

    it("should not remove event handlers on removeData()", () => {
      let log = "";
      const elm = JQLite(a);
      elm.on("click", () => {
        log += "click;";
      });

      elm.removeData();
      browserTrigger(a, "click");
      expect(log).toBe("click;");
    });

    it("should allow to set data after removeData() with event handlers present", () => {
      const elm = JQLite(a);
      elm.on("click", () => {});
      elm.data("key1", "value1");
      elm.removeData();
      elm.data("key2", "value2");
      expect(elm.data("key1")).not.toBeDefined();
      expect(elm.data("key2")).toBe("value2");
    });

    it("should allow to set data after removeData() without event handlers present", () => {
      const elm = JQLite(a);
      elm.data("key1", "value1");
      elm.removeData();
      elm.data("key2", "value2");
      expect(elm.data("key1")).not.toBeDefined();
      expect(elm.data("key2")).toBe("value2");
    });

    describe("cleanElementData helper", () => {
      it("should remove user data on cleanElementData()", () => {
        const selected = JQLite([a, b, c]);

        selected.data("prop", "value");
        JQLite(b).data("prop", "new value");

        cleanElementData(selected);

        expect(JQLite(a).data("prop")).toBeUndefined();
        expect(JQLite(b).data("prop")).toBeUndefined();
        expect(JQLite(c).data("prop")).toBeUndefined();
      });

      it("should remove event handlers on cleanElementData()", () => {
        const selected = JQLite([a, b, c]);

        let log = "";
        const elm = JQLite(b);
        elm.on("click", () => {
          log += "click;";
        });
        cleanElementData(selected);

        browserTrigger(b, "click");
        expect(log).toBe("");
      });

      it("should remove user data & event handlers on cleanElementData()", () => {
        const selected = JQLite([a, b, c]);

        let log = "";
        const elm = JQLite(b);
        elm.on("click", () => {
          log += "click;";
        });

        selected.data("prop", "value");
        JQLite(a).data("prop", "new value");

        cleanElementData(selected);

        browserTrigger(b, "click");
        expect(log).toBe("");

        expect(JQLite(a).data("prop")).toBeUndefined();
        expect(JQLite(b).data("prop")).toBeUndefined();
        expect(JQLite(c).data("prop")).toBeUndefined();
      });

      it("should not break on cleanElementData(), if element has no data", () => {
        const selected = JQLite([a, b, c]);
        spyOn(CACHE, "get").and.returnValue(undefined);
        expect(() => {
          cleanElementData(selected);
        }).not.toThrow();
      });
    });

    it("should add and remove data on SVGs", () => {
      const svg = JQLite("<svg><rect></rect></svg>");

      svg.data("svg-level", 1);
      expect(svg.data("svg-level")).toBe(1);

      svg.children().data("rect-level", 2);
      expect(svg.children().data("rect-level")).toBe(2);

      svg.remove();
    });

    it("should not add to the cache if the node is a comment or text node", () => {
      const initial = CACHE.size;
      const nodes = JQLite("<!-- some comment --> and some text");
      expect(CACHE.size).toEqual(initial);
      nodes.data("someKey");
      expect(CACHE.size).toEqual(initial);
      nodes.data("someKey", "someValue");
      expect(CACHE.size).toEqual(initial);
    });

    describe("removeElementData/getOrSetCacheData helpers", () => {
      it("should provide the non-wrapped data calls", () => {
        const node = document.createElement("div");
        document.body.appendChild(node);

        expect(CACHE.has(node[EXPANDO])).toBe(false);
        expect(getOrSetCacheData(node, "foo")).toBeUndefined();
        expect(CACHE.has(node[EXPANDO])).toBe(false);

        getOrSetCacheData(node, "foo", "bar");

        expect(CACHE.has(node[EXPANDO])).toBe(true);
        expect(getOrSetCacheData(node, "foo")).toBe("bar");
        expect(JQLite(node).data("foo")).toBe("bar");

        expect(getOrSetCacheData(node)).toBe(JQLite(node).data());

        removeElementData(node, "foo");
        expect(getOrSetCacheData(node, "foo")).toBeUndefined();

        getOrSetCacheData(node, "bar", "baz");
        removeElementData(node);
        removeElementData(node);
        expect(getOrSetCacheData(node, "bar")).toBeUndefined();

        JQLite(node).remove();
        expect(CACHE.has(node[EXPANDO])).toBe(false);
      });
    });

    it("should emit $destroy event if element removed via remove()", function () {
      let log = "";
      const element = JQLite(a);
      element.on("$destroy", function () {
        log += "destroy;";
      });
      removeElement(element);
      expect(log).toEqual("destroy;");
    });

    it("should emit $destroy event if an element is removed via html('')", () => {
      let log = [];
      const element = JQLite("<div><span>x</span></div>");
      element.find("span").on("$destroy", () => log.push("destroyed"));
      element.html("");
      expect(element.innerHTML).toBe("");
      expect(log).toEqual(["destroyed"]);
    });

    it("should emit $destroy event if an element is removed via empty()", () => {
      let log = [];
      const element = JQLite("<div><span>x</span></div>");
      element.find("span").on("$destroy", () => log.push("destroyed"));

      element.empty();

      expect(element.innerHTML).toBe("");
      expect(log).toEqual(["destroyed"]);
    });

    it("should keep data if an element is removed via detach()", () => {
      const root = JQLite("<div><span>abc</span></div>");
      const span = root.find("span");
      const data = span.data();

      span.data("foo", "bar");
      span.detach();

      expect(data).toEqual({ foo: "bar" });

      span.remove();
    });

    it("should retrieve all data if called without params", () => {
      const element = JQLite(a);
      expect(element.data()).toEqual({});

      element.data("foo", "bar");
      expect(element.data()).toEqual({ foo: "bar" });

      element.data().baz = "xxx";
      expect(element.data()).toEqual({ foo: "bar", baz: "xxx" });
    });

    it("should create a new data object if called without args", () => {
      const element = JQLite(a);
      const data = element.data();

      expect(data).toEqual({});
      element.data("foo", "bar");
      expect(data).toEqual({ foo: "bar" });
    });

    it("should create a new data object if called with a single object arg", () => {
      const element = JQLite(a);
      const newData = { foo: "bar" };

      element.data(newData);
      expect(element.data()).toEqual({ foo: "bar" });
      expect(element.data()).not.toBe(newData); // create a copy
    });

    it("should merge existing data object with a new one if called with a single object arg", () => {
      const element = JQLite(a);
      element.data("existing", "val");
      expect(element.data()).toEqual({ existing: "val" });

      const oldData = element.data();
      const newData = { meLike: "turtles", youLike: "carrots" };

      expect(element.data(newData)).toBe(element);
      expect(element.data()).toEqual({
        meLike: "turtles",
        youLike: "carrots",
        existing: "val",
      });
      expect(element.data()).toBe(oldData); // merge into the old object
    });

    describe("data cleanup", () => {
      it("should remove data on element removal", () => {
        const div = JQLite("<div><span>text</span></div>");
        const span = div.find("span");

        span.data("name", "AngularJS");
        span.remove();
        expect(span.data("name")).toBeUndefined();
      });

      it("should remove event listeners on element removal", () => {
        const div = JQLite("<div><span>text</span></div>");
        const span = div.find("span");
        let log = "";

        span.on("click", () => {
          log += "click;";
        });
        browserTrigger(span, "click");
        expect(log).toEqual("click;");

        span.remove();

        browserTrigger(span);
        expect(log).toEqual("click;");
      });

      it("should work if the descendants of the element change while it's being removed", () => {
        const div = JQLite("<div><p><span>text</span></p></div>");
        div.find("p").on("$destroy", () => {
          div.find("span").remove();
        });
        expect(() => {
          div.remove();
        }).not.toThrow();
      });
    });

    describe("camelCasing keys", () => {
      it("should camelCase the key in a setter", () => {
        const element = JQLite(a);

        element.data("a-B-c-d-42--e", "z-x");
        expect(element.data()).toEqual({ "a-BCD-42-E": "z-x" });
      });

      it("should camelCase the key in a getter", () => {
        const element = JQLite(a);

        element.data()["a-BCD-42-E"] = "x-c";
        expect(element.data("a-B-c-d-42--e")).toBe("x-c");
      });

      it("should camelCase the key in a mass setter", () => {
        const element = JQLite(a);

        element.data({ "a-B-c-d-42--e": "c-v", "r-t-v": 42 });
        expect(element.data()).toEqual({ "a-BCD-42-E": "c-v", rTV: 42 });
      });

      it("should ignore non-camelCase keys in the data in a getter", () => {
        const element = JQLite(a);

        element.data()["a-b"] = "b-n";
        expect(element.data("a-b")).toBe(undefined);
      });
    });
  });

  describe("attr", () => {
    it("should read, write and remove attr", () => {
      const selector = JQLite([a, b]);

      expect(selector.attr("prop", "value")).toEqual(selector);
      expect(JQLite(a).attr("prop")).toEqual("value");
      expect(JQLite(b).attr("prop")).toEqual("value");
      expect(selector.attr({ prop: "new value" })).toEqual(selector);
      expect(JQLite(a).attr("prop")).toEqual("new value");
      expect(JQLite(b).attr("prop")).toEqual("new value");

      JQLite(b).attr({ prop: "new value 2" });
      expect(JQLite(selector).attr("prop")).toEqual("new value");
      expect(JQLite(b).attr("prop")).toEqual("new value 2");

      selector[0].removeAttribute("prop");
      selector[1].removeAttribute("prop");
      expect(JQLite(a).attr("prop")).toBeFalsy();
      expect(JQLite(b).attr("prop")).toBeFalsy();
    });

    it("should read boolean attributes as strings", () => {
      const select = JQLite("<select>");
      expect(select.attr("multiple")).toBeUndefined();
      expect(JQLite("<select multiple>").attr("multiple")).toBe("multiple");
      expect(JQLite('<select multiple="">').attr("multiple")).toBe("multiple");
      expect(JQLite('<select multiple="x">').attr("multiple")).toBe("multiple");
    });

    it("should add/remove boolean attributes", () => {
      const select = JQLite("<select>");
      select.attr("multiple", false);
      expect(select.attr("multiple")).toBeUndefined();

      select.attr("multiple", true);
      expect(select.attr("multiple")).toBe("multiple");
    });

    it("should not take properties into account when getting respective boolean attributes", () => {
      // Use a div and not a select as the latter would itself reflect the multiple attribute
      // to a property.
      const div = JQLite("<div>");

      div[0].multiple = true;
      expect(div.attr("multiple")).toBe(undefined);

      div.attr("multiple", "multiple");
      div[0].multiple = false;
      expect(div.attr("multiple")).toBe("multiple");
    });

    it("should not set properties when setting respective boolean attributes", () => {
      // Use a div and not a select as the latter would itself reflect the multiple attribute
      // to a property.
      const div = JQLite("<div>");

      // Check the initial state.
      expect(div[0].multiple).toBe(undefined);

      div.attr("multiple", "multiple");
      expect(div[0].multiple).toBe(undefined);

      div.attr("multiple", "");
      expect(div[0].multiple).toBe(undefined);

      div.attr("multiple", false);
      expect(div[0].multiple).toBe(undefined);

      div.attr("multiple", null);
      expect(div[0].multiple).toBe(undefined);
    });

    it("should normalize the case of boolean attributes", () => {
      const input = JQLite("<input readonly>");
      expect(input.attr("readonly")).toBe("readonly");
      expect(input.attr("readOnly")).toBe("readonly");
      expect(input.attr("READONLY")).toBe("readonly");

      input.attr("readonly", false);
      expect(input[0].getAttribute("readonly")).toBe(null);

      input.attr("readOnly", "READonly");
      expect(input.attr("readonly")).toBe("readonly");
      expect(input.attr("readOnly")).toBe("readonly");
    });

    it("should return undefined for non-existing attributes", () => {
      const elm = JQLite('<div class="any">a</div>');
      expect(elm.attr("non-existing")).toBeUndefined();
    });

    it("should return undefined for non-existing attributes on input", () => {
      const elm = JQLite("<input>");
      expect(elm.attr("readonly")).toBeUndefined();
      expect(elm.attr("readOnly")).toBeUndefined();
      expect(elm.attr("disabled")).toBeUndefined();
    });

    it("should do nothing when setting or getting on attribute nodes", () => {
      const attrNode = JQLite(document.createAttribute("myattr"));
      expect(attrNode).toBeDefined();
      expect(attrNode[0].nodeType).toEqual(2);
      expect(attrNode.attr("some-attribute", "somevalue")).toEqual(attrNode);
      expect(attrNode.attr("some-attribute")).toBeUndefined();
    });

    it("should do nothing when setting or getting on text nodes", () => {
      const textNode = JQLite(document.createTextNode("some text"));
      expect(textNode).toBeDefined();
      expect(textNode[0].nodeType).toEqual(3);
      expect(textNode.attr("some-attribute", "somevalue")).toEqual(textNode);
      expect(textNode.attr("some-attribute")).toBeUndefined();
    });

    it("should do nothing when setting or getting on comment nodes", () => {
      const comment = JQLite(document.createComment("some comment"));
      expect(comment).toBeDefined();
      expect(comment[0].nodeType).toEqual(8);
      expect(comment.attr("some-attribute", "somevalue")).toEqual(comment);
      expect(comment.attr("some-attribute")).toBeUndefined();
    });

    it("should remove the attribute for a null value", () => {
      const elm = JQLite('<div attribute="value">a</div>');
      elm.attr("attribute", null);
      expect(elm[0].hasAttribute("attribute")).toBe(false);
    });

    it("should not remove the attribute for an empty string as a value", () => {
      const elm = JQLite('<div attribute="value">a</div>');
      elm.attr("attribute", "");
      expect(elm[0].getAttribute("attribute")).toBe("");
    });

    it("should remove the boolean attribute for a false value", () => {
      const elm = JQLite("<select multiple>");
      elm.attr("multiple", false);
      expect(elm[0].hasAttribute("multiple")).toBe(false);
    });

    it("should remove the boolean attribute for a null value", () => {
      const elm = JQLite("<select multiple>");
      elm.attr("multiple", null);
      expect(elm[0].hasAttribute("multiple")).toBe(false);
    });

    it("should not remove the boolean attribute for an empty string as a value", () => {
      const elm = JQLite("<select multiple>");
      elm.attr("multiple", "");
      expect(elm[0].getAttribute("multiple")).toBe("multiple");
    });

    it("should not fail on elements without the getAttribute method", () => {
      [window, document].forEach((node) => {
        expect(() => {
          const elem = JQLite(node);
          elem.attr("foo");
          elem.attr("bar", "baz");
          elem.attr("bar");
        }).not.toThrow();
      });
    });
  });

  describe("text", () => {
    it('should return `""` on empty', () => {
      expect(JQLite().length).toEqual(0);
      expect(JQLite().text()).toEqual("");
    });

    it("should read/write value", () => {
      const element = JQLite("<div>ab</div><span>c</span>");
      expect(element.length).toEqual(2);
      expect(element[0].innerHTML).toEqual("ab");
      expect(element[1].innerHTML).toEqual("c");
      expect(element.text()).toEqual("abc");
      expect(element.text("xyz") === element).toBeTruthy();
      expect(element.text()).toEqual("xyzxyz");
    });

    it("should return text only for element or text nodes", () => {
      expect(JQLite("<div>foo</div>").text()).toBe("foo");
      expect(JQLite(document.createComment("foo")).text()).toBe("");
    });
  });

  describe("html", () => {
    it("should return `undefined` on empty", () => {
      expect(JQLite().length).toEqual(0);
      expect(JQLite().innerHTML).toEqual(undefined);
    });

    it("should read/write a value", () => {
      const element = JQLite("<div>abc</div>");
      expect(element.length).toEqual(1);
      expect(element[0].innerHTML).toEqual("abc");
      expect(element.innerHTML).toEqual("abc");
      expect(element.html("xyz") === element).toBeTruthy();
      expect(element.innerHTML).toEqual("xyz");
    });
  });

  describe("empty", () => {
    it("should write a value", () => {
      const element = JQLite("<div>abc</div>");
      expect(element.length).toEqual(1);
      expect(element.empty() === element).toBeTruthy();
      expect(element.innerHTML).toEqual("");
    });
  });

  describe("on", () => {
    it("should bind to window on hashchange", () => {
      let eventFn;
      const window = {
        document: {},
        location: {},
        alert: () => {},
        setInterval: () => {},
        length: 10, // pretend you are an array
        addEventListener(type, fn) {
          expect(type).toEqual("hashchange");
          eventFn = fn;
        },
        removeEventListener: () => {},
      };
      window.window = window;

      let log;
      const jWindow = JQLite(window).on("hashchange", () => {
        log = "works!";
      });
      eventFn({ type: "hashchange" });
      expect(log).toEqual("works!");
      dealoc(jWindow);
    });

    it("should bind to all elements and return functions", () => {
      const selected = JQLite([a, b]);
      let log = "";
      expect(
        selected.on("click", function () {
          log += `click on: ${JQLite(this).text()};`;
        }),
      ).toEqual(selected);
      browserTrigger(a, "click");
      expect(log).toEqual("click on: A;");
      browserTrigger(b, "click");
      expect(log).toEqual("click on: A;click on: B;");
    });

    it("should not bind to comment or text nodes", () => {
      const nodes = JQLite("<!-- some comment -->Some text");
      const someEventHandler = jasmine.createSpy("someEventHandler");

      nodes.on("someEvent", someEventHandler);
      nodes.triggerHandler("someEvent");

      expect(someEventHandler).not.toHaveBeenCalled();
    });

    it("should bind to all events separated by space", () => {
      const elm = JQLite(a);
      const callback = jasmine.createSpy("callback");

      elm.on("click keypress", callback);
      elm.on("click", callback);

      browserTrigger(a, "click");
      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledTimes(2);

      callback.calls.reset();
      browserTrigger(a, "keypress");
      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should set event.target", () => {
      const elm = JQLite(a);
      elm.on("click", (event) => {
        expect(event.target).toBe(a);
      });

      browserTrigger(a, "click");
    });

    it("should have event.isDefaultPrevented method", () => {
      const element = JQLite(a);

      element.on("click", (e) => {
        expect(e.isDefaultPrevented()).toBe(false);
        e.preventDefault();
        expect(e.isDefaultPrevented()).toBe(true);
      });

      browserTrigger(a, "click");
    });

    it("should stop triggering handlers when stopImmediatePropagation is called", () => {
      const element = JQLite(a);
      const clickSpy1 = jasmine.createSpy("clickSpy1");
      const clickSpy2 = jasmine.createSpy("clickSpy2").and.callFake((event) => {
        event.stopImmediatePropagation();
      });
      const clickSpy3 = jasmine.createSpy("clickSpy3");
      const clickSpy4 = jasmine.createSpy("clickSpy4");

      element.on("click", clickSpy1);
      element.on("click", clickSpy2);
      element.on("click", clickSpy3);
      element[0].addEventListener("click", clickSpy4);

      browserTrigger(element, "click");

      expect(clickSpy1).toHaveBeenCalled();
      expect(clickSpy2).toHaveBeenCalled();
      expect(clickSpy3).not.toHaveBeenCalled();
      expect(clickSpy4).not.toHaveBeenCalled();
    });

    it("should execute stopPropagation when stopImmediatePropagation is called", () => {
      const element = JQLite(a);
      const clickSpy = jasmine.createSpy("clickSpy");

      clickSpy.and.callFake((event) => {
        spyOn(event, "stopPropagation");
        event.stopImmediatePropagation();
        expect(event.stopPropagation).toHaveBeenCalled();
      });

      element.on("click", clickSpy);

      browserTrigger(element, "click");
      expect(clickSpy).toHaveBeenCalled();
    });

    it("should have event.isImmediatePropagationStopped method", () => {
      const element = JQLite(a);
      const clickSpy = jasmine.createSpy("clickSpy");

      clickSpy.and.callFake((event) => {
        expect(event.isImmediatePropagationStopped()).toBe(false);
        event.stopImmediatePropagation();
        expect(event.isImmediatePropagationStopped()).toBe(true);
      });

      element.on("click", clickSpy);

      browserTrigger(element, "click");
      expect(clickSpy).toHaveBeenCalled();
    });

    describe("mouseenter-mouseleave", () => {
      let root;
      let parent;
      let child;
      let log;

      function setup(html, parentNode, childNode) {
        log = "";
        root = JQLite(html);
        parent = root.find(parentNode);
        child = parent.find(childNode);

        parent.on("mouseenter", () => {
          log += "parentEnter;";
        });
        parent.on("mouseleave", () => {
          log += "parentLeave;";
        });

        child.on("mouseenter", () => {
          log += "childEnter;";
        });
        child.on("mouseleave", () => {
          log += "childLeave;";
        });
      }

      function browserMoveTrigger(from, to) {
        const fireEvent = function (type, element, relatedTarget) {
          let evnt;
          evnt = document.createEvent("MouseEvents");

          const originalPreventDefault = evnt.preventDefault;

          evnt.preventDefault = () => {
            fakeProcessDefault = false;
            return originalPreventDefault.apply(evnt, arguments);
          };

          const x = 0;
          const y = 0;
          evnt.initMouseEvent(
            type,
            true,
            true,
            window,
            0,
            x,
            y,
            x,
            y,
            false,
            false,
            false,
            false,
            0,
            relatedTarget,
          );

          element.dispatchEvent(evnt);
        };
        fireEvent("mouseout", from[0], to[0]);
        fireEvent("mouseover", to[0], from[0]);
      }

      afterEach(() => {
        dealoc(root);
      });

      it("should fire mouseenter when coming from outside the browser window", () => {
        setup(
          "<div>root<p>parent<span>child</span></p><ul></ul></div>",
          "p",
          "span",
        );

        browserMoveTrigger(root, parent);
        expect(log).toEqual("parentEnter;");

        browserMoveTrigger(parent, child);
        expect(log).toEqual("parentEnter;childEnter;");

        browserMoveTrigger(child, parent);
        expect(log).toEqual("parentEnter;childEnter;childLeave;");

        browserMoveTrigger(parent, root);
        expect(log).toEqual("parentEnter;childEnter;childLeave;parentLeave;");
      });

      it("should fire the mousenter on SVG elements", () => {
        setup(
          "<div>" +
            '<svg xmlns="http://www.w3.org/2000/svg"' +
            '     viewBox="0 0 18.75 18.75"' +
            '     width="18.75"' +
            '     height="18.75"' +
            '     version="1.1">' +
            '       <path d="M0,0c0,4.142,3.358,7.5,7.5,7.5s7.5-3.358,7.5-7.5-3.358-7.5-7.5-7.5-7.5,3.358-7.5,7.5"' +
            '             fill-rule="nonzero"' +
            '             fill="#CCC"' +
            "             ng-attr-fill=\"{{data.color || '#CCC'}}\"/>" +
            "</svg>" +
            "</div>",
          "svg",
          "path",
        );

        browserMoveTrigger(parent, child);
        expect(log).toEqual("childEnter;");
      });
    });
  });

  describe("off", () => {
    it("should do nothing when no listener was registered with bound", () => {
      const aElem = JQLite(a);

      aElem.off();
      aElem.off("click");
      aElem.off("click", () => {});
    });

    it("should do nothing when a specific listener was not registered", () => {
      const aElem = JQLite(a);
      aElem.on("click", () => {});

      aElem.off("mouseenter", () => {});
    });

    it("should deregister all listeners", () => {
      const aElem = JQLite(a);
      const clickSpy = jasmine.createSpy("click");
      const mouseoverSpy = jasmine.createSpy("mouseover");

      aElem.on("click", clickSpy);
      aElem.on("mouseover", mouseoverSpy);

      browserTrigger(a, "click");
      expect(clickSpy).toHaveBeenCalled();
      browserTrigger(a, "mouseover");
      expect(mouseoverSpy).toHaveBeenCalled();

      clickSpy.calls.reset();
      mouseoverSpy.calls.reset();

      aElem.off();

      browserTrigger(a, "click");
      expect(clickSpy).not.toHaveBeenCalled();
      browserTrigger(a, "mouseover");
      expect(mouseoverSpy).not.toHaveBeenCalled();
    });

    it("should deregister listeners for specific type", () => {
      const aElem = JQLite(a);
      const clickSpy = jasmine.createSpy("click");
      const mouseoverSpy = jasmine.createSpy("mouseover");

      aElem.on("click", clickSpy);
      aElem.on("mouseover", mouseoverSpy);

      browserTrigger(a, "click");
      expect(clickSpy).toHaveBeenCalled();
      browserTrigger(a, "mouseover");
      expect(mouseoverSpy).toHaveBeenCalled();

      clickSpy.calls.reset();
      mouseoverSpy.calls.reset();

      aElem.off("click");

      browserTrigger(a, "click");
      expect(clickSpy).not.toHaveBeenCalled();
      browserTrigger(a, "mouseover");
      expect(mouseoverSpy).toHaveBeenCalled();

      mouseoverSpy.calls.reset();

      aElem.off("mouseover");
      browserTrigger(a, "mouseover");
      expect(mouseoverSpy).not.toHaveBeenCalled();
    });

    it("should deregister all listeners for types separated by spaces", () => {
      const aElem = JQLite(a);
      const clickSpy = jasmine.createSpy("click");
      const mouseoverSpy = jasmine.createSpy("mouseover");

      aElem.on("click", clickSpy);
      aElem.on("mouseover", mouseoverSpy);

      browserTrigger(a, "click");
      expect(clickSpy).toHaveBeenCalled();
      browserTrigger(a, "mouseover");
      expect(mouseoverSpy).toHaveBeenCalled();

      clickSpy.calls.reset();
      mouseoverSpy.calls.reset();

      aElem.off("click mouseover");

      browserTrigger(a, "click");
      expect(clickSpy).not.toHaveBeenCalled();
      browserTrigger(a, "mouseover");
      expect(mouseoverSpy).not.toHaveBeenCalled();
    });

    it("should deregister specific listener", () => {
      const aElem = JQLite(a);
      const clickSpy1 = jasmine.createSpy("click1");
      const clickSpy2 = jasmine.createSpy("click2");

      aElem.on("click", clickSpy1);
      aElem.on("click", clickSpy2);

      browserTrigger(a, "click");
      expect(clickSpy1).toHaveBeenCalled();
      expect(clickSpy2).toHaveBeenCalled();

      clickSpy1.calls.reset();
      clickSpy2.calls.reset();

      aElem.off("click", clickSpy1);

      browserTrigger(a, "click");
      expect(clickSpy1).not.toHaveBeenCalled();
      expect(clickSpy2).toHaveBeenCalled();

      clickSpy2.calls.reset();

      aElem.off("click", clickSpy2);
      browserTrigger(a, "click");
      expect(clickSpy2).not.toHaveBeenCalled();
    });

    it("should correctly deregister the mouseenter/mouseleave listeners", () => {
      const aElem = JQLite(a);
      const onMouseenter = jasmine.createSpy("onMouseenter");
      const onMouseleave = jasmine.createSpy("onMouseleave");

      aElem.on("mouseenter", onMouseenter);
      aElem.on("mouseleave", onMouseleave);
      aElem.off("mouseenter", onMouseenter);
      aElem.off("mouseleave", onMouseleave);
      aElem.on("mouseenter", onMouseenter);
      aElem.on("mouseleave", onMouseleave);

      browserTrigger(a, "mouseover");
      expect(onMouseenter).toHaveBeenCalled();

      browserTrigger(a, "mouseout");
      expect(onMouseleave).toHaveBeenCalled();
    });

    it(
      "should call a `mouseenter/leave` listener only once when `mouseenter/leave` and `mouseover/out` " +
        "are triggered simultaneously",
      () => {
        const aElem = JQLite(a);
        const onMouseenter = jasmine.createSpy("mouseenter");
        const onMouseleave = jasmine.createSpy("mouseleave");

        aElem.on("mouseenter", onMouseenter);
        aElem.on("mouseleave", onMouseleave);

        browserTrigger(a, "mouseenter");
        browserTrigger(a, "mouseover");
        expect(onMouseenter).toHaveBeenCalled();

        browserTrigger(a, "mouseleave");
        browserTrigger(a, "mouseout");
        expect(onMouseleave).toHaveBeenCalled();
      },
    );

    it("should call a `mouseenter/leave` listener when manually triggering the event", () => {
      const aElem = JQLite(a);
      const onMouseenter = jasmine.createSpy("mouseenter");
      const onMouseleave = jasmine.createSpy("mouseleave");

      aElem.on("mouseenter", onMouseenter);
      aElem.on("mouseleave", onMouseleave);

      aElem.triggerHandler("mouseenter");
      expect(onMouseenter).toHaveBeenCalled();

      aElem.triggerHandler("mouseleave");
      expect(onMouseleave).toHaveBeenCalled();
    });

    it("should deregister specific listener within the listener and call subsequent listeners", () => {
      const aElem = JQLite(a);
      const clickSpy = jasmine.createSpy("click");
      const clickOnceSpy = jasmine.createSpy("clickOnce").and.callFake(() => {
        aElem.off("click", clickOnceSpy);
      });

      aElem.on("click", clickOnceSpy);
      aElem.on("click", clickSpy);

      browserTrigger(a, "click");
      expect(clickOnceSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();

      browserTrigger(a, "click");
      expect(clickOnceSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalledTimes(2);
    });

    it("should deregister specific listener for multiple types separated by spaces", () => {
      const aElem = JQLite(a);
      const leaderSpy = jasmine.createSpy("leader");
      const extraSpy = jasmine.createSpy("extra");

      aElem.on("click", leaderSpy);
      aElem.on("click", extraSpy);
      aElem.on("mouseover", leaderSpy);

      browserTrigger(a, "click");
      browserTrigger(a, "mouseover");
      expect(leaderSpy).toHaveBeenCalledTimes(2);
      expect(extraSpy).toHaveBeenCalled();

      leaderSpy.calls.reset();
      extraSpy.calls.reset();

      aElem.off("click mouseover", leaderSpy);

      browserTrigger(a, "click");
      browserTrigger(a, "mouseover");
      expect(leaderSpy).not.toHaveBeenCalled();
      expect(extraSpy).toHaveBeenCalled();
    });

    describe("native listener deregistration", () => {
      it(
        "should deregister the native listener when all JQLite listeners for given type are gone " +
          'after off("eventName", listener) call',
        () => {
          const aElem = JQLite(a);
          const addEventListenerSpy = spyOn(
            aElem[0],
            "addEventListener",
          ).and.callThrough();
          const removeEventListenerSpy = spyOn(
            aElem[0],
            "removeEventListener",
          ).and.callThrough();
          let nativeListenerFn;

          const JQLiteListener = () => {};
          aElem.on("click", JQLiteListener);

          expect(addEventListenerSpy).toHaveBeenCalledOnceWith(
            "click",
            jasmine.any(Function),
          );
          nativeListenerFn = addEventListenerSpy.calls.mostRecent().args[1];
          expect(removeEventListenerSpy).not.toHaveBeenCalled();

          aElem.off("click", JQLiteListener);
          expect(removeEventListenerSpy).toHaveBeenCalledOnceWith(
            "click",
            nativeListenerFn,
          );
        },
      );

      it(
        "should deregister the native listener when all JQLite listeners for given type are gone " +
          'after off("eventName") call',
        () => {
          const aElem = JQLite(a);
          const addEventListenerSpy = spyOn(
            aElem[0],
            "addEventListener",
          ).and.callThrough();
          const removeEventListenerSpy = spyOn(
            aElem[0],
            "removeEventListener",
          ).and.callThrough();
          let nativeListenerFn;

          aElem.on("click", () => {});
          expect(addEventListenerSpy).toHaveBeenCalledOnceWith(
            "click",
            jasmine.any(Function),
          );
          nativeListenerFn = addEventListenerSpy.calls.mostRecent().args[1];
          expect(removeEventListenerSpy).not.toHaveBeenCalled();

          aElem.off("click");
          expect(removeEventListenerSpy).toHaveBeenCalledOnceWith(
            "click",
            nativeListenerFn,
          );
        },
      );

      it(
        "should deregister the native listener when all JQLite listeners for given type are gone " +
          'after off("eventName1 eventName2") call',
        () => {
          const aElem = JQLite(a);
          const addEventListenerSpy = spyOn(
            aElem[0],
            "addEventListener",
          ).and.callThrough();
          const removeEventListenerSpy = spyOn(
            aElem[0],
            "removeEventListener",
          ).and.callThrough();
          let nativeListenerFn;

          aElem.on("click", () => {});
          expect(addEventListenerSpy).toHaveBeenCalledOnceWith(
            "click",
            jasmine.any(Function),
          );
          nativeListenerFn = addEventListenerSpy.calls.mostRecent().args[1];
          addEventListenerSpy.calls.reset();

          aElem.on("dblclick", () => {});
          expect(addEventListenerSpy).toHaveBeenCalledOnceWith(
            "dblclick",
            nativeListenerFn,
          );

          expect(removeEventListenerSpy).not.toHaveBeenCalled();

          aElem.off("click dblclick");

          expect(removeEventListenerSpy).toHaveBeenCalledWith(
            "click",
            nativeListenerFn,
          );
          expect(removeEventListenerSpy).toHaveBeenCalledWith(
            "dblclick",
            nativeListenerFn,
          );
          expect(removeEventListenerSpy).toHaveBeenCalledTimes(2);
        },
      );

      it(
        "should deregister the native listener when all JQLite listeners for given type are gone " +
          "after off() call",
        () => {
          const aElem = JQLite(a);
          const addEventListenerSpy = spyOn(
            aElem[0],
            "addEventListener",
          ).and.callThrough();
          const removeEventListenerSpy = spyOn(
            aElem[0],
            "removeEventListener",
          ).and.callThrough();
          let nativeListenerFn;

          aElem.on("click", () => {});
          expect(addEventListenerSpy).toHaveBeenCalledOnceWith(
            "click",
            jasmine.any(Function),
          );
          nativeListenerFn = addEventListenerSpy.calls.mostRecent().args[1];
          addEventListenerSpy.calls.reset();

          aElem.on("dblclick", () => {});
          expect(addEventListenerSpy).toHaveBeenCalledOnceWith(
            "dblclick",
            nativeListenerFn,
          );

          aElem.off();

          expect(removeEventListenerSpy).toHaveBeenCalledWith(
            "click",
            nativeListenerFn,
          );
          expect(removeEventListenerSpy).toHaveBeenCalledWith(
            "dblclick",
            nativeListenerFn,
          );
          expect(removeEventListenerSpy).toHaveBeenCalledTimes(2);
        },
      );
    });
  });

  describe("replaceWith", () => {
    it("should replaceWith", () => {
      const root = JQLite("<div>").html("before-<div></div>after");
      const div = root.find("div");
      expect(div.replaceWith("<span>span-</span><b>bold-</b>")).toEqual(div);
      expect(root.text()).toEqual("before-span-bold-after");
    });

    it("should replaceWith text", () => {
      const root = JQLite("<div>").html("before-<div></div>after");
      const div = root.find("div");
      expect(div.replaceWith("text-")).toEqual(div);
      expect(root.text()).toEqual("before-text-after");
    });
  });

  describe("children", () => {
    it("should only select element nodes", () => {
      const root = JQLite(
        "<div><!-- some comment -->before-<div></div>after-<span></span>",
      );
      const div = root.find("div");
      const span = root.find("span");
      expect(root.children()).toJqEqual([div, span]);
    });
  });

  describe("append", () => {
    it("should append", () => {
      const root = JQLite("<div>");
      expect(root.append("<span>abc</span>")).toEqual(root);
      expect(root.innerHTML.toLowerCase()).toEqual("<span>abc</span>");
    });
    it("should append text", () => {
      const root = JQLite("<div>");
      expect(root.append("text")).toEqual(root);
      expect(root.innerHTML).toEqual("text");
    });
    it("should append to document fragment", () => {
      const root = JQLite(document.createDocumentFragment());
      expect(root.append("<p>foo</p>")).toBe(root);
      expect(root.children().length).toBe(1);
    });
    it("should not append anything if parent node is not of type element or docfrag", () => {
      const root = JQLite(JQLite("<p>some text node</p>")[0].childNodes);
      expect(root.append("<p>foo</p>")).toBe(root);
      expect(root.children().length).toBe(0);
    });
  });

  describe("prepend", () => {
    it("should prepend to empty", () => {
      const root = JQLite("<div>");
      expect(root.prepend("<span>abc</span>")).toEqual(root);
      expect(root.innerHTML.toLowerCase()).toEqual("<span>abc</span>");
    });
    it("should prepend to content", () => {
      const root = JQLite("<div>text</div>");
      expect(root.prepend("<span>abc</span>")).toEqual(root);
      expect(root.innerHTML.toLowerCase()).toEqual("<span>abc</span>text");
    });
    it("should prepend text to content", () => {
      const root = JQLite("<div>text</div>");
      expect(root.prepend("abc")).toEqual(root);
      expect(root.innerHTML.toLowerCase()).toEqual("abctext");
    });
    it("should prepend array to empty in the right order", () => {
      const root = JQLite("<div>");
      expect(root.prepend([a, b, c])).toBe(root);
      expect(root.innerHTML).toEqual("<div>A</div><div>B</div><div>C</div>");
    });
    it("should prepend array to content in the right order", () => {
      const root = JQLite("<div>text</div>");
      expect(root.prepend([a, b, c])).toBe(root);
      expect(root.innerHTML).toBe("<div>A</div><div>B</div><div>C</div>text");
    });
  });

  describe("remove", () => {
    it("should remove", () => {
      const root = JQLite("<div><span>abc</span></div>");
      const span = root.find("span");
      expect(span.remove()).toEqual(span);
      expect(root.innerHTML).toEqual("");
    });
  });

  describe("detach", () => {
    it("should detach", () => {
      const root = JQLite("<div><span>abc</span></div>");
      const span = root.find("span");
      expect(span.detach()).toEqual(span);
      expect(root.innerHTML).toEqual("");
    });
  });

  describe("after", () => {
    it("should after", () => {
      const root = JQLite("<div><span></span></div>");
      const span = root.find("span");
      expect(span.after("<i></i><b></b>")).toEqual(span);
      expect(root.innerHTML.toLowerCase()).toEqual("<span></span><i></i><b></b>");
    });

    it("should allow taking text", () => {
      const root = JQLite("<div><span></span></div>");
      const span = root.find("span");
      span.after("abc");
      expect(root.innerHTML.toLowerCase()).toEqual("<span></span>abc");
    });

    it("should not throw when the element has no parent", () => {
      const span = JQLite("<span></span>");
      expect(() => {
        span.after("abc");
      }).not.toThrow();
      expect(span.length).toBe(1);
      expect(span[0].outerHTML).toBe("<span></span>");
    });
  });

  describe("parent", () => {
    it("should return parent or an empty set when no parent", () => {
      const parent = JQLite("<div><p>abc</p></div>");
      const child = parent.find("p");

      expect(parent.parent()).toBeTruthy();
      expect(parent.parent().length).toEqual(0);

      expect(child.parent().length).toBe(1);
      expect(child.parent()[0]).toBe(parent[0]);
    });

    it("should return empty set when no parent", () => {
      const element = JQLite("<div>abc</div>");
      expect(element.parent()).toBeTruthy();
      expect(element.parent().length).toEqual(0);
    });

    it("should return empty JQLite object when parent is a document fragment", () => {
      // this is quite unfortunate but jQuery 1.5.1 behaves this way
      const fragment = document.createDocumentFragment();
      const child = JQLite("<p>foo</p>");

      fragment.appendChild(child[0]);
      expect(child[0].parentNode).toBe(fragment);
      expect(child.parent().length).toBe(0);
    });
  });

  describe("find", () => {
    it("should find child by name", () => {
      const root = JQLite("<div><div>text</div></div>");
      const innerDiv = root.find("div");
      expect(innerDiv.length).toEqual(1);
      expect(innerDiv.innerHTML).toEqual("text");
    });

    it("should find child by name and not care about text nodes", () => {
      const divs = JQLite(
        "<div><span>aa</span></div>text<div><span>bb</span></div>",
      );
      const innerSpan = divs.find("span");
      expect(innerSpan.length).toEqual(2);
    });
  });

  describe("eq", () => {
    it("should select the nth element ", () => {
      const element = JQLite(
        "<div><span>aa</span></div><div><span>bb</span></div>",
      );
      expect(element.find("span").eq(0).innerHTML).toBe("aa");
      expect(element.find("span").eq(-1).innerHTML).toBe("bb");
      expect(element.find("span").eq(20).length).toBe(0);
    });
  });

  describe("triggerHandler", () => {
    it("should trigger all registered handlers for an event", () => {
      const element = JQLite("<span>poke</span>");
      const pokeSpy = jasmine.createSpy("poke");
      const clickSpy1 = jasmine.createSpy("clickSpy1");
      const clickSpy2 = jasmine.createSpy("clickSpy2");

      element.on("poke", pokeSpy);
      element.on("click", clickSpy1);
      element.on("click", clickSpy2);

      expect(pokeSpy).not.toHaveBeenCalled();
      expect(clickSpy1).not.toHaveBeenCalled();
      expect(clickSpy2).not.toHaveBeenCalled();

      element.triggerHandler("poke");
      expect(pokeSpy).toHaveBeenCalled();
      expect(clickSpy1).not.toHaveBeenCalled();
      expect(clickSpy2).not.toHaveBeenCalled();

      element.triggerHandler("click");
      expect(clickSpy1).toHaveBeenCalled();
      expect(clickSpy2).toHaveBeenCalled();
    });

    it("should pass in a dummy event", () => {
      // we need the event to have at least preventDefault because AngularJS will call it on
      // all anchors with no href automatically

      const element = JQLite("<a>poke</a>");
      const pokeSpy = jasmine.createSpy("poke");
      let event;

      element.on("click", pokeSpy);

      element.triggerHandler("click");
      event = pokeSpy.calls.mostRecent().args[0];
      expect(event.preventDefault).toBeDefined();
      expect(event.target).toEqual(element[0]);
      expect(event.type).toEqual("click");
    });

    it("should pass extra parameters as an additional argument", () => {
      const element = JQLite("<a>poke</a>");
      const pokeSpy = jasmine.createSpy("poke");
      let data;

      element.on("click", pokeSpy);

      element.triggerHandler("click", [{ hello: "world" }]);
      data = pokeSpy.calls.mostRecent().args[1];
      expect(data.hello).toBe("world");
    });

    it("should mark event as prevented if preventDefault is called", () => {
      const element = JQLite("<a>poke</a>");
      const pokeSpy = jasmine.createSpy("poke");
      let event;

      element.on("click", pokeSpy);
      element.triggerHandler("click");
      event = pokeSpy.calls.mostRecent().args[0];

      expect(event.isDefaultPrevented()).toBe(false);
      event.preventDefault();
      expect(event.isDefaultPrevented()).toBe(true);
    });

    it("should support handlers that deregister themselves", () => {
      const element = JQLite("<a>poke</a>");
      const clickSpy = jasmine.createSpy("click");
      const clickOnceSpy = jasmine.createSpy("clickOnce").and.callFake(() => {
        element.off("click", clickOnceSpy);
      });

      element.on("click", clickOnceSpy);
      element.on("click", clickSpy);

      element.triggerHandler("click");
      expect(clickOnceSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();

      element.triggerHandler("click");
      expect(clickOnceSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalledTimes(2);
    });

    it("should accept a custom event instead of eventName", () => {
      const element = JQLite("<a>poke</a>");
      const pokeSpy = jasmine.createSpy("poke");
      const customEvent = {
        type: "click",
        someProp: "someValue",
      };
      let actualEvent;

      element.on("click", pokeSpy);
      element.triggerHandler(customEvent);
      actualEvent = pokeSpy.calls.mostRecent().args[0];
      expect(actualEvent.preventDefault).toBeDefined();
      expect(actualEvent.someProp).toEqual("someValue");
      expect(actualEvent.target).toEqual(element[0]);
      expect(actualEvent.type).toEqual("click");
    });

    it("should stop triggering handlers when stopImmediatePropagation is called", () => {
      const element = JQLite(a);
      const clickSpy1 = jasmine.createSpy("clickSpy1");
      const clickSpy2 = jasmine.createSpy("clickSpy2").and.callFake((event) => {
        event.stopImmediatePropagation();
      });
      const clickSpy3 = jasmine.createSpy("clickSpy3");

      element.on("click", clickSpy1);
      element.on("click", clickSpy2);
      element.on("click", clickSpy3);

      element.triggerHandler("click");

      expect(clickSpy1).toHaveBeenCalled();
      expect(clickSpy2).toHaveBeenCalled();
      expect(clickSpy3).not.toHaveBeenCalled();
    });

    it("should have event.isImmediatePropagationStopped method", () => {
      const element = JQLite(a);
      const clickSpy = jasmine.createSpy("clickSpy");
      let event;

      element.on("click", clickSpy);
      element.triggerHandler("click");
      event = clickSpy.calls.mostRecent().args[0];

      expect(event.isImmediatePropagationStopped()).toBe(false);
      event.stopImmediatePropagation();
      expect(event.isImmediatePropagationStopped()).toBe(true);
    });
  });

  describe("kebabToCamel", () => {
    it("should leave non-dashed strings alone", () => {
      expect(kebabToCamel("foo")).toBe("foo");
      expect(kebabToCamel("")).toBe("");
      expect(kebabToCamel("fooBar")).toBe("fooBar");
    });

    it("should convert dash-separated strings to camelCase", () => {
      expect(kebabToCamel("foo-bar")).toBe("fooBar");
      expect(kebabToCamel("foo-bar-baz")).toBe("fooBarBaz");
      expect(kebabToCamel("foo:bar_baz")).toBe("foo:bar_baz");
    });

    it("should convert leading dashes followed by a lowercase letter", () => {
      expect(kebabToCamel("-foo-bar")).toBe("FooBar");
    });

    it("should not convert dashes followed by a non-letter", () => {
      expect(kebabToCamel("foo-42- -a-B")).toBe("foo-42- A-B");
    });

    it("should not convert browser specific css properties in a special way", () => {
      expect(kebabToCamel("-ms-foo-bar")).toBe("MsFooBar");
      expect(kebabToCamel("-moz-foo-bar")).toBe("MozFooBar");
      expect(kebabToCamel("-webkit-foo-bar")).toBe("WebkitFooBar");
    });

    it("should not collapse sequences of dashes", () => {
      expect(kebabToCamel("foo---bar-baz--qaz")).toBe("foo--BarBaz-Qaz");
    });
  });
});
