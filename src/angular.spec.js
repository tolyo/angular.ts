import {
  lowercase,
  uppercase,
  extend,
  isDefined,
  merge,
  isDate,
  isRegExp,
  isElement,
  shallowCopy,
  equals,
  isWindow,
  hashKey,
  toKeyValue,
  parseKeyValue,
  isError,
  isArrayLike,
  encodeUriSegment,
  encodeUriQuery,
  toJson,
  fromJson,
  nextUid,
  getNodeName,
  snakeCase,
} from "./shared/utils";
import { dealoc, JQLite, startingTag } from "./shared/jqlite/jqlite";
import { Angular } from "./loader";
import { createInjector } from "./core/di/injector";
import { wait } from "./shared/test-utils";

describe("angular", () => {
  let element, document, module, injector, $rootScope, $compile;

  beforeEach(() => {
    window.angular = new Angular();
    module = window.angular.module("defaultModule", ["ng"]);
    injector = createInjector(["ng", "defaultModule"]);
    $rootScope = injector.get("$rootScope");
    $compile = injector.get("$compile");
  });

  beforeEach(() => {
    document = window.document;
  });

  afterEach(() => {
    dealoc(element);
  });

  describe("case", () => {
    it("should change case", () => {
      expect(lowercase("ABC90")).toEqual("abc90");
      expect(uppercase("abc90")).toEqual("ABC90");
    });

    it("should change case of non-ASCII letters", () => {
      expect(lowercase("Ω")).toEqual("ω");
      expect(uppercase("ω")).toEqual("Ω");
    });
  });

  // describe("copy", () => {
  //   it("should return same object", () => {
  //     const obj = {};
  //     const arr = [];
  //     expect(copy({}, obj)).toBe(obj);
  //     expect(copy([], arr)).toBe(arr);
  //   });

  //   it("should preserve prototype chaining", () => {
  //     const GrandParentProto = {};
  //     const ParentProto = Object.create(GrandParentProto);
  //     const obj = Object.create(ParentProto);
  //     expect(ParentProto.isPrototypeOf(copy(obj))).toBe(true);
  //     expect(GrandParentProto.isPrototypeOf(copy(obj))).toBe(true);
  //     const Foo = function () {};
  //     expect(copy(new Foo()) instanceof Foo).toBe(true);
  //   });

  //   it("should copy Date", () => {
  //     const date = new Date(123);
  //     expect(copy(date) instanceof Date).toBeTruthy();
  //     expect(copy(date).getTime()).toEqual(123);
  //     expect(copy(date) === date).toBeFalsy();
  //   });

  //   it("should copy RegExp", () => {
  //     const re = new RegExp(".*");
  //     expect(copy(re) instanceof RegExp).toBeTruthy();
  //     expect(copy(re).source).toBe(".*");
  //     expect(copy(re) === re).toBe(false);
  //   });

  //   it("should copy literal RegExp", () => {
  //     const re = /.*/;
  //     expect(copy(re) instanceof RegExp).toBeTruthy();
  //     expect(copy(re).source).toEqual(".*");
  //     expect(copy(re) === re).toBeFalsy();
  //   });

  //   it("should copy RegExp with flags", () => {
  //     const re = new RegExp(".*", "gim");
  //     expect(copy(re).global).toBe(true);
  //     expect(copy(re).ignoreCase).toBe(true);
  //     expect(copy(re).multiline).toBe(true);
  //   });

  //   it("should copy RegExp with lastIndex", () => {
  //     const re = /a+b+/g;
  //     const str = "ab aabb";
  //     expect(re.exec(str)[0]).toEqual("ab");
  //     expect(copy(re).exec(str)[0]).toEqual("aabb");
  //   });

  //   it("should deeply copy literal RegExp", () => {
  //     const objWithRegExp = {
  //       re: /.*/,
  //     };
  //     expect(copy(objWithRegExp).re instanceof RegExp).toBeTruthy();
  //     expect(copy(objWithRegExp).re.source).toEqual(".*");
  //     expect(copy(objWithRegExp.re) === objWithRegExp.re).toBeFalsy();
  //   });

  //   it("should copy a Uint8Array with no destination", () => {
  //     if (typeof Uint8Array !== "undefined") {
  //       const src = new Uint8Array(2);
  //       src[1] = 1;
  //       const dst = copy(src);
  //       expect(copy(src) instanceof Uint8Array).toBeTruthy();
  //       expect(dst).toEqual(src);
  //       expect(dst).not.toBe(src);
  //       expect(dst.buffer).not.toBe(src.buffer);
  //     }
  //   });

  //   it("should copy a Uint8ClampedArray with no destination", () => {
  //     if (typeof Uint8ClampedArray !== "undefined") {
  //       const src = new Uint8ClampedArray(2);
  //       src[1] = 1;
  //       const dst = copy(src);
  //       expect(copy(src) instanceof Uint8ClampedArray).toBeTruthy();
  //       expect(dst).toEqual(src);
  //       expect(dst).not.toBe(src);
  //       expect(dst.buffer).not.toBe(src.buffer);
  //     }
  //   });

  //   it("should copy a Uint16Array with no destination", () => {
  //     if (typeof Uint16Array !== "undefined") {
  //       const src = new Uint16Array(2);
  //       src[1] = 1;
  //       const dst = copy(src);
  //       expect(copy(src) instanceof Uint16Array).toBeTruthy();
  //       expect(dst).toEqual(src);
  //       expect(dst).not.toBe(src);
  //       expect(dst.buffer).not.toBe(src.buffer);
  //     }
  //   });

  //   it("should copy a Uint32Array with no destination", () => {
  //     if (typeof Uint32Array !== "undefined") {
  //       const src = new Uint32Array(2);
  //       src[1] = 1;
  //       const dst = copy(src);
  //       expect(copy(src) instanceof Uint32Array).toBeTruthy();
  //       expect(dst).toEqual(src);
  //       expect(dst).not.toBe(src);
  //       expect(dst.buffer).not.toBe(src.buffer);
  //     }
  //   });

  //   it("should copy a Int8Array with no destination", () => {
  //     if (typeof Int8Array !== "undefined") {
  //       const src = new Int8Array(2);
  //       src[1] = 1;
  //       const dst = copy(src);
  //       expect(copy(src) instanceof Int8Array).toBeTruthy();
  //       expect(dst).toEqual(src);
  //       expect(dst).not.toBe(src);
  //       expect(dst.buffer).not.toBe(src.buffer);
  //     }
  //   });

  //   it("should copy a Int16Array with no destination", () => {
  //     if (typeof Int16Array !== "undefined") {
  //       const src = new Int16Array(2);
  //       src[1] = 1;
  //       const dst = copy(src);
  //       expect(copy(src) instanceof Int16Array).toBeTruthy();
  //       expect(dst).toEqual(src);
  //       expect(dst).not.toBe(src);
  //       expect(dst.buffer).not.toBe(src.buffer);
  //     }
  //   });

  //   it("should copy a Int32Array with no destination", () => {
  //     if (typeof Int32Array !== "undefined") {
  //       const src = new Int32Array(2);
  //       src[1] = 1;
  //       const dst = copy(src);
  //       expect(copy(src) instanceof Int32Array).toBeTruthy();
  //       expect(dst).toEqual(src);
  //       expect(dst).not.toBe(src);
  //       expect(dst.buffer).not.toBe(src.buffer);
  //     }
  //   });

  //   it("should copy a Float32Array with no destination", () => {
  //     if (typeof Float32Array !== "undefined") {
  //       const src = new Float32Array(2);
  //       src[1] = 1;
  //       const dst = copy(src);
  //       expect(copy(src) instanceof Float32Array).toBeTruthy();
  //       expect(dst).toEqual(src);
  //       expect(dst).not.toBe(src);
  //       expect(dst.buffer).not.toBe(src.buffer);
  //     }
  //   });

  //   it("should copy a Float64Array with no destination", () => {
  //     if (typeof Float64Array !== "undefined") {
  //       const src = new Float64Array(2);
  //       src[1] = 1;
  //       const dst = copy(src);
  //       expect(copy(src) instanceof Float64Array).toBeTruthy();
  //       expect(dst).toEqual(src);
  //       expect(dst).not.toBe(src);
  //       expect(dst.buffer).not.toBe(src.buffer);
  //     }
  //   });

  //   it("should copy an ArrayBuffer with no destination", () => {
  //     if (typeof ArrayBuffer !== "undefined") {
  //       const src = new ArrayBuffer(8);
  //       new Int32Array(src).set([1, 2]);

  //       const dst = copy(src);
  //       expect(dst instanceof ArrayBuffer).toBeTruthy();
  //       expect(dst).toEqual(src);
  //       expect(dst).not.toBe(src);
  //     }
  //   });

  //   it("should handle ArrayBuffer objects with multiple references", () => {
  //     if (typeof ArrayBuffer !== "undefined") {
  //       const buffer = new ArrayBuffer(8);
  //       const src = [new Int32Array(buffer), new Float32Array(buffer)];
  //       src[0].set([1, 2]);

  //       const dst = copy(src);
  //       expect(dst).toEqual(src);
  //       expect(dst[0]).not.toBe(src[0]);
  //       expect(dst[1]).not.toBe(src[1]);
  //       expect(dst[0].buffer).toBe(dst[1].buffer);
  //       expect(dst[0].buffer).not.toBe(buffer);
  //     }
  //   });

  //   it("should handle Int32Array objects with multiple references", () => {
  //     if (typeof Int32Array !== "undefined") {
  //       const arr = new Int32Array(2);
  //       const src = [arr, arr];
  //       arr.set([1, 2]);

  //       const dst = copy(src);
  //       expect(dst).toEqual(src);
  //       expect(dst).not.toBe(src);
  //       expect(dst[0]).not.toBe(src[0]);
  //       expect(dst[0]).toBe(dst[1]);
  //       expect(dst[0].buffer).toBe(dst[1].buffer);
  //     }
  //   });

  //   it("should handle Blob objects", () => {
  //     if (typeof Blob !== "undefined") {
  //       const src = new Blob(["foo"], { type: "bar" });
  //       const dst = copy(src);

  //       expect(dst).not.toBe(src);
  //       expect(dst.size).toBe(3);
  //       expect(dst.type).toBe("bar");
  //       expect(isBlob(dst)).toBe(true);
  //     }
  //   });

  //   it("should handle Uint16Array subarray", () => {
  //     if (typeof Uint16Array !== "undefined") {
  //       const arr = new Uint16Array(4);
  //       arr[1] = 1;
  //       const src = arr.subarray(1, 2);
  //       const dst = copy(src);
  //       expect(dst instanceof Uint16Array).toBeTruthy();
  //       expect(dst.length).toEqual(1);
  //       expect(dst[0]).toEqual(1);
  //       expect(dst).not.toBe(src);
  //       expect(dst.buffer).not.toBe(src.buffer);
  //     }
  //   });

  //   it("should throw an exception if a Uint8Array is the destination", () => {
  //     if (typeof Uint8Array !== "undefined") {
  //       const src = new Uint8Array();
  //       const dst = new Uint8Array(5);
  //       expect(() => {
  //         copy(src, dst);
  //       }).toThrowError();
  //     }
  //   });

  //   it("should throw an exception if a Uint8ClampedArray is the destination", () => {
  //     if (typeof Uint8ClampedArray !== "undefined") {
  //       const src = new Uint8ClampedArray();
  //       const dst = new Uint8ClampedArray(5);
  //       expect(() => {
  //         copy(src, dst);
  //       }).toThrowError();
  //     }
  //   });

  //   it("should throw an exception if a Uint16Array is the destination", () => {
  //     if (typeof Uint16Array !== "undefined") {
  //       const src = new Uint16Array();
  //       const dst = new Uint16Array(5);
  //       expect(() => {
  //         copy(src, dst);
  //       }).toThrowError();
  //     }
  //   });

  //   it("should throw an exception if a Uint32Array is the destination", () => {
  //     if (typeof Uint32Array !== "undefined") {
  //       const src = new Uint32Array();
  //       const dst = new Uint32Array(5);
  //       expect(() => {
  //         copy(src, dst);
  //       }).toThrowError();
  //     }
  //   });

  //   it("should throw an exception if a Int8Array is the destination", () => {
  //     if (typeof Int8Array !== "undefined") {
  //       const src = new Int8Array();
  //       const dst = new Int8Array(5);
  //       expect(() => {
  //         copy(src, dst);
  //       }).toThrowError();
  //     }
  //   });

  //   it("should throw an exception if a Int16Array is the destination", () => {
  //     if (typeof Int16Array !== "undefined") {
  //       const src = new Int16Array();
  //       const dst = new Int16Array(5);
  //       expect(() => {
  //         copy(src, dst);
  //       }).toThrowError();
  //     }
  //   });

  //   it("should throw an exception if a Int32Array is the destination", () => {
  //     if (typeof Int32Array !== "undefined") {
  //       const src = new Int32Array();
  //       const dst = new Int32Array(5);
  //       expect(() => {
  //         copy(src, dst);
  //       }).toThrowError();
  //     }
  //   });

  //   it("should throw an exception if a Float32Array is the destination", () => {
  //     if (typeof Float32Array !== "undefined") {
  //       const src = new Float32Array();
  //       const dst = new Float32Array(5);
  //       expect(() => {
  //         copy(src, dst);
  //       }).toThrowError();
  //     }
  //   });

  //   it("should throw an exception if a Float64Array is the destination", () => {
  //     if (typeof Float64Array !== "undefined") {
  //       const src = new Float64Array();
  //       const dst = new Float64Array(5);
  //       expect(() => {
  //         copy(src, dst);
  //       }).toThrowError();
  //     }
  //   });

  //   it("should throw an exception if an ArrayBuffer is the destination", () => {
  //     if (typeof ArrayBuffer !== "undefined") {
  //       const src = new ArrayBuffer(5);
  //       const dst = new ArrayBuffer(5);
  //       expect(() => {
  //         copy(src, dst);
  //       }).toThrowError();
  //     }
  //   });

  //   it("should deeply copy an array into an existing array", () => {
  //     const src = [1, { name: "value" }];
  //     const dst = [{ key: "v" }];
  //     expect(copy(src, dst)).toBe(dst);
  //     expect(dst).toEqual([1, { name: "value" }]);
  //     expect(dst[1]).toEqual({ name: "value" });
  //     expect(dst[1]).not.toBe(src[1]);
  //   });

  //   it("should deeply copy an array into a new array", () => {
  //     const src = [1, { name: "value" }];
  //     const dst = copy(src);
  //     expect(src).toEqual([1, { name: "value" }]);
  //     expect(dst).toEqual(src);
  //     expect(dst).not.toBe(src);
  //     expect(dst[1]).not.toBe(src[1]);
  //   });

  //   it("should copy empty array", () => {
  //     const src = [];
  //     const dst = [{ key: "v" }];
  //     expect(copy(src, dst)).toEqual([]);
  //     expect(dst).toEqual([]);
  //   });

  //   it("should deeply copy an object into an existing object", () => {
  //     const src = { a: { name: "value" } };
  //     const dst = { b: { key: "v" } };
  //     expect(copy(src, dst)).toBe(dst);
  //     expect(dst).toEqual({ a: { name: "value" } });
  //     expect(dst.a).toEqual(src.a);
  //     expect(dst.a).not.toBe(src.a);
  //   });

  //   it("should deeply copy an object into a non-existing object", () => {
  //     const src = { a: { name: "value" } };
  //     const dst = copy(src, undefined);
  //     expect(src).toEqual({ a: { name: "value" } });
  //     expect(dst).toEqual(src);
  //     expect(dst).not.toBe(src);
  //     expect(dst.a).toEqual(src.a);
  //     expect(dst.a).not.toBe(src.a);
  //   });

  //   it("should copy primitives", () => {
  //     expect(copy(null)).toEqual(null);
  //     expect(copy("")).toBe("");
  //     expect(copy("lala")).toBe("lala");
  //     expect(copy(123)).toEqual(123);
  //     expect(copy([{ key: null }])).toEqual([{ key: null }]);
  //   });

  //   it("should throw an exception if a Scope is being copied", () => {
  //     expect(() => {
  //       copy($rootScope.$new());
  //     }).toThrowError(/cpws/);
  //     expect(() => {
  //       copy({ child: $rootScope.$new() }, {});
  //     }).toThrowError(/cpws/);
  //     expect(() => {
  //       copy([$rootScope.$new()]);
  //     }).toThrowError(/cpws/);
  //   });

  //   it("should throw an exception if a Window is being copied", () => {
  //     expect(() => {
  //       copy(window);
  //     }).toThrowError();
  //     expect(() => {
  //       copy({ child: window });
  //     }).toThrowError();
  //     expect(() => {
  //       copy([window], []);
  //     }).toThrowError();
  //   });

  //   it("should throw an exception when source and destination are equivalent", () => {
  //     let src;
  //     let dst;
  //     src = dst = { key: "value" };
  //     expect(() => {
  //       copy(src, dst);
  //     }).toThrowError();
  //     src = dst = [2, 4];
  //     expect(() => {
  //       copy(src, dst);
  //     }).toThrowError();
  //   });

  //   it("should not copy the private $$hashKey", () => {
  //     let src;
  //     let dst;
  //     src = {};
  //     hashKey(src);
  //     dst = copy(src);
  //     expect(hashKey(dst)).not.toEqual(hashKey(src));

  //     src = { foo: {} };
  //     hashKey(src.foo);
  //     dst = copy(src);
  //     expect(hashKey(src.foo)).not.toEqual(hashKey(dst.foo));
  //   });

  //   it("should retain the previous $$hashKey when copying object with hashKey", () => {
  //     let src;
  //     let dst;
  //     let h;
  //     src = {};
  //     dst = {};
  //     // force creation of a hashkey
  //     h = hashKey(dst);
  //     hashKey(src);
  //     dst = copy(src, dst);

  //     // make sure we don't copy the key
  //     expect(hashKey(dst)).not.toEqual(hashKey(src));
  //     // make sure we retain the old key
  //     expect(hashKey(dst)).toEqual(h);
  //   });

  //   it("should retain the previous $$hashKey when copying non-object", () => {
  //     const dst = {};
  //     const h = hashKey(dst);

  //     copy(null, dst);
  //     expect(hashKey(dst)).toEqual(h);

  //     copy(42, dst);
  //     expect(hashKey(dst)).toEqual(h);

  //     copy(new Date(), dst);
  //     expect(hashKey(dst)).toEqual(h);
  //   });

  //   it("should handle circular references", () => {
  //     const a = { b: { a: null }, self: null, selfs: [null, null, [null]] };
  //     a.b.a = a;
  //     a.self = a;
  //     a.selfs = [a, a.b, [a]];

  //     let aCopy = copy(a, null);
  //     expect(aCopy).toEqual(a);

  //     expect(aCopy).not.toBe(a);
  //     expect(aCopy).toBe(aCopy.self);
  //     expect(aCopy).toBe(aCopy.selfs[2][0]);
  //     expect(aCopy.selfs[2]).not.toBe(a.selfs[2]);

  //     const copyTo = [];
  //     aCopy = copy(a, copyTo);
  //     expect(aCopy).toBe(copyTo);
  //     expect(aCopy).not.toBe(a);
  //     expect(aCopy).toBe(aCopy.self);
  //   });

  //   it("should deeply copy XML nodes", () => {
  //     const anElement = document.createElement("foo");
  //     anElement.appendChild(document.createElement("bar"));
  //     const theCopy = anElement.cloneNode(true);
  //     expect(copy(anElement).outerHTML).toEqual(theCopy.outerHTML);
  //     expect(copy(anElement)).not.toBe(anElement);
  //   });

  //   it("should not try to call a non-function called `cloneNode`", () => {
  //     expect(copy.bind(null, { cloneNode: 100 })).not.toThrow();
  //   });

  //   it("should handle objects with multiple references", () => {
  //     const b = {};
  //     const a = [b, -1, b];

  //     let aCopy = copy(a);
  //     expect(aCopy[0]).not.toBe(a[0]);
  //     expect(aCopy[0]).toBe(aCopy[2]);

  //     const copyTo = [];
  //     aCopy = copy(a, copyTo);
  //     expect(aCopy).toBe(copyTo);
  //     expect(aCopy[0]).not.toBe(a[0]);
  //     expect(aCopy[0]).toBe(aCopy[2]);
  //   });

  //   it("should handle date/regex objects with multiple references", () => {
  //     const re = /foo/;
  //     const d = new Date();
  //     const o = { re, re2: re, d, d2: d };

  //     let oCopy = copy(o);
  //     expect(oCopy.re).toBe(oCopy.re2);
  //     expect(oCopy.d).toBe(oCopy.d2);

  //     oCopy = copy(o, {});
  //     expect(oCopy.re).toBe(oCopy.re2);
  //     expect(oCopy.d).toBe(oCopy.d2);
  //   });

  //   it("should clear destination arrays correctly when source is non-array", () => {
  //     expect(copy(null, [1, 2, 3])).toEqual([]);
  //     expect(copy(undefined, [1, 2, 3])).toEqual([]);
  //     expect(copy({ 0: 1, 1: 2 }, [1, 2, 3])).toEqual([1, 2]);
  //     expect(copy(new Date(), [1, 2, 3])).toEqual([]);
  //     expect(copy(/a/, [1, 2, 3])).toEqual([]);
  //     expect(copy(true, [1, 2, 3])).toEqual([]);
  //   });

  //   it("should clear destination objects correctly when source is non-array", () => {
  //     expect(copy(null, { 0: 1, 1: 2, 2: 3 })).toEqual({});
  //     expect(copy(undefined, { 0: 1, 1: 2, 2: 3 })).toEqual({});
  //     expect(copy(new Date(), { 0: 1, 1: 2, 2: 3 })).toEqual({});
  //     expect(copy(/a/, { 0: 1, 1: 2, 2: 3 })).toEqual({});
  //     expect(copy(true, { 0: 1, 1: 2, 2: 3 })).toEqual({});
  //   });

  //   it("should copy objects with no prototype parent", () => {
  //     const obj = extend(Object.create(null), {
  //       a: 1,
  //       b: 2,
  //       c: 3,
  //     });
  //     const dest = copy(obj);

  //     expect(Object.getPrototypeOf(dest)).toBe(null);
  //     expect(dest.a).toBe(1);
  //     expect(dest.b).toBe(2);
  //     expect(dest.c).toBe(3);
  //     expect(Object.keys(dest)).toEqual(["a", "b", "c"]);
  //   });

  //   it("should copy String() objects", () => {
  //     const obj = new String("foo");
  //     const dest = copy(obj);
  //     expect(dest).not.toBe(obj);
  //     expect(isObject(dest)).toBe(true);
  //     expect(dest.valueOf()).toBe(obj.valueOf());
  //   });

  //   it("should copy Boolean() objects", () => {
  //     const obj = new Boolean(true);
  //     const dest = copy(obj);
  //     expect(dest).not.toBe(obj);
  //     expect(isObject(dest)).toBe(true);
  //     expect(dest.valueOf()).toBe(obj.valueOf());
  //   });

  //   it("should copy Number() objects", () => {
  //     const obj = new Number(42);
  //     const dest = copy(obj);
  //     expect(dest).not.toBe(obj);
  //     expect(isObject(dest)).toBe(true);
  //     expect(dest.valueOf()).toBe(obj.valueOf());
  //   });

  //   it("should copy falsy String/Boolean/Number objects", () => {
  //     expect(copy(new String("")).valueOf()).toBe("");
  //     expect(copy(new Boolean(false)).valueOf()).toBe(false);
  //     expect(copy(new Number(0)).valueOf()).toBe(0);
  //     expect(copy(new Number(NaN)).valueOf()).toBeNaN();
  //   });

  //   it("should copy source until reaching a given max depth", () => {
  //     const source = {
  //       a1: 1,
  //       b1: { b2: { b3: 1 } },
  //       c1: [1, { c2: 1 }],
  //       d1: { d2: 1 },
  //     };
  //     let dest;

  //     dest = copy(source, {}, 1);
  //     expect(dest).toEqual({ a1: 1, b1: "...", c1: "...", d1: "..." });

  //     dest = copy(source, {}, 2);
  //     expect(dest).toEqual({
  //       a1: 1,
  //       b1: { b2: "..." },
  //       c1: [1, "..."],
  //       d1: { d2: 1 },
  //     });

  //     dest = copy(source, {}, 3);
  //     expect(dest).toEqual({
  //       a1: 1,
  //       b1: { b2: { b3: 1 } },
  //       c1: [1, { c2: 1 }],
  //       d1: { d2: 1 },
  //     });

  //     dest = copy(source, {}, 4);
  //     expect(dest).toEqual({
  //       a1: 1,
  //       b1: { b2: { b3: 1 } },
  //       c1: [1, { c2: 1 }],
  //       d1: { d2: 1 },
  //     });
  //   });

  //   it("should copy source and ignore max depth when maxDepth = $prop", () => {
  //     [NaN, null, undefined, true, false, -1, 0].forEach((maxDepth) => {
  //       const source = {
  //         a1: 1,
  //         b1: { b2: { b3: 1 } },
  //         c1: [1, { c2: 1 }],
  //         d1: { d2: 1 },
  //       };
  //       const dest = copy(source, {}, maxDepth);
  //       expect(dest).toEqual({
  //         a1: 1,
  //         b1: { b2: { b3: 1 } },
  //         c1: [1, { c2: 1 }],
  //         d1: { d2: 1 },
  //       });
  //     });
  //   });
  // });

  describe("extend", () => {
    it("should not copy the private $$hashKey", () => {
      let src;
      let dst;
      src = {};
      dst = {};
      hashKey(src);
      dst = extend(dst, src);
      expect(hashKey(dst)).not.toEqual(hashKey(src));
    });

    it("should copy the properties of the source object onto the destination object", () => {
      let destination;
      let source;
      destination = {};
      source = { foo: true };
      destination = extend(destination, source);
      expect(isDefined(destination.foo)).toBe(true);
    });

    it("ISSUE #4751 - should copy the length property of an object source to the destination object", () => {
      let destination;
      let source;
      destination = {};
      source = { radius: 30, length: 0 };
      destination = extend(destination, source);
      expect(isDefined(destination.length)).toBe(true);
      expect(isDefined(destination.radius)).toBe(true);
    });

    it("should retain the previous $$hashKey", () => {
      let src;
      let dst;
      let h;
      src = {};
      dst = {};
      h = hashKey(dst);
      hashKey(src);
      dst = extend(dst, src);
      // make sure we don't copy the key
      expect(hashKey(dst)).not.toEqual(hashKey(src));
      // make sure we retain the old key
      expect(hashKey(dst)).toEqual(h);
    });

    it("should work when extending with itself", () => {
      let src;
      let dst;
      let h;
      dst = src = {};
      h = hashKey(dst);
      dst = extend(dst, src);
      // make sure we retain the old key
      expect(hashKey(dst)).toEqual(h);
    });

    it("should copy dates by reference", () => {
      const src = { date: new Date() };
      const dst = {};

      extend(dst, src);

      expect(dst.date).toBe(src.date);
    });

    it("should copy elements by reference", () => {
      const src = {
        element: document.createElement("div"),
        jqObject: JQLite("<p><span>s1</span><span>s2</span></p>").find("span"),
      };
      const dst = {};

      extend(dst, src);

      expect(dst.element).toBe(src.element);
      expect(dst.jqObject).toBe(src.jqObject);
    });
  });

  describe("merge", () => {
    it("should recursively copy objects into dst from left to right", () => {
      const dst = { foo: { bar: "foobar" } };
      const src1 = { foo: { bazz: "foobazz" } };
      const src2 = { foo: { bozz: "foobozz" } };
      merge(dst, src1, src2);
      expect(dst).toEqual({
        foo: {
          bar: "foobar",
          bazz: "foobazz",
          bozz: "foobozz",
        },
      });
    });

    it("should replace primitives with objects", () => {
      const dst = { foo: "bloop" };
      const src = { foo: { bar: { baz: "bloop" } } };
      merge(dst, src);
      expect(dst).toEqual({
        foo: {
          bar: {
            baz: "bloop",
          },
        },
      });
    });

    it("should replace null values in destination with objects", () => {
      const dst = { foo: null };
      const src = { foo: { bar: { baz: "bloop" } } };
      merge(dst, src);
      expect(dst).toEqual({
        foo: {
          bar: {
            baz: "bloop",
          },
        },
      });
    });

    it("should copy references to functions by value rather than merging", () => {
      function fn() {}
      const dst = { foo: 1 };
      const src = { foo: fn };
      merge(dst, src);
      expect(dst).toEqual({
        foo: fn,
      });
    });

    it("should create a new array if destination property is a non-object and source property is an array", () => {
      const dst = { foo: NaN };
      const src = { foo: [1, 2, 3] };
      merge(dst, src);
      expect(dst).toEqual({
        foo: [1, 2, 3],
      });
      expect(dst.foo).not.toBe(src.foo);
    });

    it("should copy dates by value", () => {
      const src = { date: new Date() };
      const dst = {};

      merge(dst, src);

      expect(dst.date).not.toBe(src.date);
      expect(isDate(dst.date)).toBeTruthy();
      expect(dst.date.valueOf()).toEqual(src.date.valueOf());
    });

    it("should copy regexp by value", () => {
      const src = { regexp: /blah/ };
      const dst = {};

      merge(dst, src);

      expect(dst.regexp).not.toBe(src.regexp);
      expect(isRegExp(dst.regexp)).toBe(true);
      expect(dst.regexp.toString()).toBe(src.regexp.toString());
    });

    it("should not merge the __proto__ property", () => {
      const src = JSON.parse('{ "__proto__": { "xxx": "polluted" } }');
      const dst = {};

      merge(dst, src);

      if (typeof dst.__proto__ !== "undefined") {
        // Should not overwrite the __proto__ property or pollute the Object prototype
        expect(dst.__proto__).toBe(Object.prototype);
      }
      expect({}.xxx).toBeUndefined();
    });
  });

  describe("shallow copy", () => {
    it("should make a copy", () => {
      const original = { key: {} };
      const copy = shallowCopy(original);
      expect(copy).toEqual(original);
      expect(copy.key).toBe(original.key);
    });

    it('should omit "$$"-prefixed properties', () => {
      const original = { $$some: true, $$: true };
      const clone = {};

      expect(shallowCopy(original, clone)).toBe(clone);
      expect(clone.$$some).toBeUndefined();
      expect(clone.$$).toBeUndefined();
    });

    it('should copy "$"-prefixed properties from copy', () => {
      const original = { $some: true };
      const clone = {};

      expect(shallowCopy(original, clone)).toBe(clone);
      expect(clone.$some).toBe(original.$some);
    });

    it("should handle arrays", () => {
      const original = [{}, 1];
      const clone = [];

      const aCopy = shallowCopy(original);
      expect(aCopy).not.toBe(original);
      expect(aCopy).toEqual(original);
      expect(aCopy[0]).toBe(original[0]);

      expect(shallowCopy(original, clone)).toBe(clone);
      expect(clone).toEqual(original);
    });

    it("should handle primitives", () => {
      expect(shallowCopy("test")).toBe("test");
      expect(shallowCopy(3)).toBe(3);
      expect(shallowCopy(true)).toBe(true);
    });
  });

  describe("elementHTML", () => {
    it("should dump element", () => {
      expect(
        startingTag('<div attr="123">something<span></span></div>'),
      ).toEqual('<div attr="123">');
    });
  });

  describe("equals", () => {
    it("should return true if same object", () => {
      const o = {};
      expect(equals(o, o)).toEqual(true);
      expect(equals(o, {})).toEqual(true);
      expect(equals(1, "1")).toEqual(false);
      expect(equals(1, "2")).toEqual(false);
    });

    it("should recurse into object", () => {
      expect(equals({}, {})).toEqual(true);
      expect(equals({ name: "misko" }, { name: "misko" })).toEqual(true);
      expect(equals({ name: "misko", age: 1 }, { name: "misko" })).toEqual(
        false,
      );
      expect(equals({ name: "misko" }, { name: "misko", age: 1 })).toEqual(
        false,
      );
      expect(equals({ name: "misko" }, { name: "adam" })).toEqual(false);
      expect(equals(["misko"], ["misko"])).toEqual(true);
      expect(equals(["misko"], ["adam"])).toEqual(false);
      expect(equals(["misko"], ["misko", "adam"])).toEqual(false);
    });

    it("should ignore undefined member variables during comparison", () => {
      const obj1 = { name: "misko" };
      const obj2 = { name: "misko", undefinedvar: undefined };

      expect(equals(obj1, obj2)).toBe(true);
      expect(equals(obj2, obj1)).toBe(true);
    });

    it("should ignore $ member variables", () => {
      expect(
        equals({ name: "misko", $id: 1 }, { name: "misko", $id: 2 }),
      ).toEqual(true);
      expect(equals({ name: "misko" }, { name: "misko", $id: 2 })).toEqual(
        true,
      );
      expect(equals({ name: "misko", $id: 1 }, { name: "misko" })).toEqual(
        true,
      );
    });

    it("should ignore functions", () => {
      expect(equals({ func() {} }, { bar() {} })).toEqual(true);
    });

    it("should work well with nulls", () => {
      expect(equals(null, "123")).toBe(false);
      expect(equals("123", null)).toBe(false);

      const obj = { foo: "bar" };
      expect(equals(null, obj)).toBe(false);
      expect(equals(obj, null)).toBe(false);

      expect(equals(null, null)).toBe(true);
    });

    it("should work well with undefined", () => {
      expect(equals(undefined, "123")).toBe(false);
      expect(equals("123", undefined)).toBe(false);

      const obj = { foo: "bar" };
      expect(equals(undefined, obj)).toBe(false);
      expect(equals(obj, undefined)).toBe(false);

      expect(equals(undefined, undefined)).toBe(true);
    });

    it("should treat two NaNs as equal", () => {
      expect(equals(NaN, NaN)).toBe(true);
    });

    it("should compare Scope instances only by identity", () => {
      const scope1 = $rootScope.$new();
      const scope2 = $rootScope.$new();

      expect(equals(scope1, scope1)).toBe(true);
      expect(equals(scope1, scope2)).toBe(false);
      expect(equals($rootScope, scope1)).toBe(false);
      expect(equals(undefined, scope1)).toBe(false);
    });

    it("should compare Window instances only by identity", () => {
      expect(equals(window, window)).toBe(true);
      expect(equals(window, window.document)).toBe(false);
      expect(equals(window, undefined)).toBe(false);
    });

    it("should compare dates", () => {
      expect(equals(new Date(0), new Date(0))).toBe(true);
      expect(equals(new Date(0), new Date(1))).toBe(false);
      expect(equals(new Date(0), 0)).toBe(false);
      expect(equals(0, new Date(0))).toBe(false);

      expect(equals(new Date(undefined), new Date(undefined))).toBe(true);
      expect(equals(new Date(undefined), new Date(0))).toBe(false);
      expect(equals(new Date(undefined), new Date(null))).toBe(false);
      expect(equals(new Date(undefined), new Date("wrong"))).toBe(true);
      expect(equals(new Date(), /abc/)).toBe(false);
    });

    it("should correctly test for keys that are present on Object.prototype", () => {
      expect(equals({}, { hasOwnProperty: 1 })).toBe(false);
      expect(equals({}, { toString: null })).toBe(false);
    });

    it("should compare regular expressions", () => {
      expect(equals(/abc/, /abc/)).toBe(true);
      expect(equals(/abc/i, new RegExp("abc", "i"))).toBe(true);
      expect(equals(new RegExp("abc", "i"), new RegExp("abc", "i"))).toBe(true);
      expect(equals(new RegExp("abc", "i"), new RegExp("abc"))).toBe(false);
      expect(equals(/abc/i, /abc/)).toBe(false);
      expect(equals(/abc/, /def/)).toBe(false);
      expect(equals(/^abc/, /abc/)).toBe(false);
      expect(equals(/^abc/, "/^abc/")).toBe(false);
      expect(equals(/abc/, new Date())).toBe(false);
    });

    it("should return false when comparing an object and an array", () => {
      expect(equals({}, [])).toBe(false);
      expect(equals([], {})).toBe(false);
    });

    it("should return false when comparing an object and a RegExp", () => {
      expect(equals({}, /abc/)).toBe(false);
      expect(equals({}, new RegExp("abc", "i"))).toBe(false);
    });

    it("should return false when comparing an object and a Date", () => {
      expect(equals({}, new Date())).toBe(false);
    });

    it("should safely compare objects with no prototype parent", () => {
      const o1 = extend(Object.create(null), {
        a: 1,
        b: 2,
        c: 3,
      });
      const o2 = extend(Object.create(null), {
        a: 1,
        b: 2,
        c: 3,
      });
      expect(equals(o1, o2)).toBe(true);
      o2.c = 2;
      expect(equals(o1, o2)).toBe(false);
    });

    it("should safely compare objects which shadow Object.prototype.hasOwnProperty", () => {
      const o1 = {
        hasOwnProperty: true,
        a: 1,
        b: 2,
        c: 3,
      };
      const o2 = {
        hasOwnProperty: true,
        a: 1,
        b: 2,
        c: 3,
      };
      expect(equals(o1, o2)).toBe(true);
      o1.hasOwnProperty = function () {};
      expect(equals(o1, o2)).toBe(false);
    });
  });

  describe("parseKeyValue", () => {
    it("should parse a string into key-value pairs", () => {
      expect(parseKeyValue("")).toEqual({});
      expect(parseKeyValue("simple=pair")).toEqual({ simple: "pair" });
      expect(parseKeyValue("first=1&second=2")).toEqual({
        first: "1",
        second: "2",
      });
      expect(parseKeyValue("escaped%20key=escaped%20value")).toEqual({
        "escaped key": "escaped value",
      });
      expect(parseKeyValue("emptyKey=")).toEqual({ emptyKey: "" });
      expect(parseKeyValue("flag1&key=value&flag2")).toEqual({
        flag1: true,
        key: "value",
        flag2: true,
      });
    });
    it("should ignore key values that are not valid URI components", () => {
      expect(() => {
        parseKeyValue("%");
      }).not.toThrow();
      expect(parseKeyValue("%")).toEqual({});
      expect(parseKeyValue("invalid=%")).toEqual({ invalid: undefined });
      expect(parseKeyValue("invalid=%&valid=good")).toEqual({
        invalid: undefined,
        valid: "good",
      });
    });
    it("should parse a string into key-value pairs with duplicates grouped in an array", () => {
      expect(parseKeyValue("")).toEqual({});
      expect(parseKeyValue("duplicate=pair")).toEqual({ duplicate: "pair" });
      expect(parseKeyValue("first=1&first=2")).toEqual({ first: ["1", "2"] });
      expect(
        parseKeyValue(
          "escaped%20key=escaped%20value&&escaped%20key=escaped%20value2",
        ),
      ).toEqual({ "escaped key": ["escaped value", "escaped value2"] });
      expect(parseKeyValue("flag1&key=value&flag1")).toEqual({
        flag1: [true, true],
        key: "value",
      });
      expect(parseKeyValue("flag1&flag1=value&flag1=value2&flag1")).toEqual({
        flag1: [true, "value", "value2", true],
      });
    });

    it("should ignore properties higher in the prototype chain", () => {
      expect(parseKeyValue("toString=123")).toEqual({
        toString: "123",
      });
    });

    it("should ignore badly escaped = characters", () => {
      expect(parseKeyValue("test=a=b")).toEqual({
        test: "a=b",
      });
    });
  });

  describe("toKeyValue", () => {
    it("should serialize key-value pairs into string", () => {
      expect(toKeyValue({})).toEqual("");
      expect(toKeyValue({ simple: "pair" })).toEqual("simple=pair");
      expect(toKeyValue({ first: "1", second: "2" })).toEqual(
        "first=1&second=2",
      );
      expect(toKeyValue({ "escaped key": "escaped value" })).toEqual(
        "escaped%20key=escaped%20value",
      );
      expect(toKeyValue({ emptyKey: "" })).toEqual("emptyKey=");
    });

    it("should serialize true values into flags", () => {
      expect(toKeyValue({ flag1: true, key: "value", flag2: true })).toEqual(
        "flag1&key=value&flag2",
      );
    });

    it("should serialize duplicates into duplicate param strings", () => {
      expect(toKeyValue({ key: [323, "value", true] })).toEqual(
        "key=323&key=value&key",
      );
      expect(toKeyValue({ key: [323, "value", true, 1234] })).toEqual(
        "key=323&key=value&key&key=1234",
      );
    });
  });

  describe("isArrayLike", () => {
    it("should return false if passed a number", () => {
      expect(isArrayLike(10)).toBe(false);
    });

    it("should return true if passed an array", () => {
      expect(isArrayLike([1, 2, 3, 4])).toBe(true);
    });

    it("should return true if passed an object", () => {
      expect(isArrayLike({ 0: "test", 1: "bob", 2: "tree", length: 3 })).toBe(
        true,
      );
    });

    it("should return true if passed arguments object", () => {
      function test(a, b, c) {
        expect(isArrayLike(arguments)).toBe(true);
      }
      test(1, 2, 3);
    });

    it("should return true if passed a nodelist", () => {
      const nodes1 = document.body.childNodes;
      expect(isArrayLike(nodes1)).toBe(true);

      const nodes2 = document.getElementsByTagName("nonExistingTagName");
      expect(isArrayLike(nodes2)).toBe(true);
    });

    it("should return false for objects with `length` but no matching indexable items", () => {
      const obj1 = {
        a: "a",
        b: "b",
        length: 10,
      };
      expect(isArrayLike(obj1)).toBe(false);

      const obj2 = {
        length: 0,
      };
      expect(isArrayLike(obj2)).toBe(false);
    });

    it("should return true for empty instances of an Array subclass", () => {
      function ArrayLike() {}
      ArrayLike.prototype = Array.prototype;

      const arrLike = new ArrayLike();
      expect(arrLike.length).toBe(0);
      expect(isArrayLike(arrLike)).toBe(true);

      arrLike.push(1, 2, 3);
      expect(arrLike.length).toBe(3);
      expect(isArrayLike(arrLike)).toBe(true);
    });
  });

  describe("encodeUriSegment", () => {
    it("should correctly encode uri segment and not encode chars defined as pchar set in rfc3986", () => {
      // don't encode alphanum
      expect(encodeUriSegment("asdf1234asdf")).toEqual("asdf1234asdf");

      // don't encode unreserved'
      expect(encodeUriSegment("-_.!~*'(); -_.!~*'();")).toEqual(
        "-_.!~*'();%20-_.!~*'();",
      );

      // don't encode the rest of pchar'
      expect(encodeUriSegment(":@&=+$, :@&=+$,")).toEqual(":@&=+$,%20:@&=+$,");

      // encode '/' and ' ''
      expect(encodeUriSegment("/; /;")).toEqual("%2F;%20%2F;");
    });
  });

  describe("encodeUriQuery", () => {
    it("should correctly encode uri query and not encode chars defined as pchar set in rfc3986", () => {
      // don't encode alphanum
      expect(encodeUriQuery("asdf1234asdf")).toEqual("asdf1234asdf");

      // don't encode unreserved
      expect(encodeUriQuery("-_.!~*'() -_.!~*'()")).toEqual(
        "-_.!~*'()+-_.!~*'()",
      );

      // don't encode the rest of pchar
      expect(encodeUriQuery(":@$, :@$,")).toEqual(":@$,+:@$,");

      // encode '&', ';', '=', '+', and '#'
      expect(encodeUriQuery("&;=+# &;=+#")).toEqual(
        "%26;%3D%2B%23+%26;%3D%2B%23",
      );

      // encode ' ' as '+'
      expect(encodeUriQuery("  ")).toEqual("++");

      // encode ' ' as '%20' when a flag is used
      expect(encodeUriQuery("  ", true)).toEqual("%20%20");

      // do not encode `null` as '+' when flag is used
      expect(encodeUriQuery("null", true)).toEqual("null");

      // do not encode `null` with no flag
      expect(encodeUriQuery("null")).toEqual("null");
    });
  });

  describe("angular.init", () => {
    let bootstrapSpy;
    let element;

    beforeEach(() => {
      element = {
        hasAttribute(name) {
          return !!element[name];
        },

        querySelector(arg) {
          return element.querySelector[arg] || null;
        },

        getAttribute(name) {
          return element[name];
        },
      };
      bootstrapSpy = spyOn(window.angular, "bootstrap").and.callThrough();
    });

    it("should do nothing when not found", () => {
      window.angular.init(element);
      expect(bootstrapSpy).not.toHaveBeenCalled();
    });

    it("should look for ngApp directive as attr", () => {
      window.angular.module("ABC", []);
      const appElement = JQLite('<div ng-app="ABC"></div>')[0];

      window.angular.init(appElement);
      expect(bootstrapSpy).toHaveBeenCalled();
    });

    it("should look for ngApp directive using querySelectorAll", () => {
      window.angular.module("ABC", []);
      const appElement = JQLite('<div ng-app="ABC"></div>')[0];
      element.querySelector["[ng-app]"] = appElement;
      window.angular.init(element);
      expect(bootstrapSpy).toHaveBeenCalled();
    });

    it("should bootstrap anonymously", () => {
      const appElement = JQLite("<div ng-app></div>")[0];
      element.querySelector["[ng-app]"] = appElement;
      window.angular.init(element);
      expect(bootstrapSpy).toHaveBeenCalled();
    });

    it("should bootstrap if the annotation is on the root element", () => {
      const appElement = JQLite('<div ng-app=""></div>')[0];
      window.angular.init(appElement);
      expect(bootstrapSpy).toHaveBeenCalled();
    });

    it("should complain if app module cannot be found", () => {
      const appElement = JQLite('<div ng-app="doesntexist"></div>')[0];
      expect(() => {
        window.angular.init(appElement);
      }).toThrowError(/modulerr/);
    });

    it("should complain if an element has already been bootstrapped", () => {
      const element = JQLite("<div>bootstrap me!</div>");
      angular.bootstrap(element);

      expect(() => {
        angular.bootstrap(element);
      }).toThrowError(/btstrpd/);

      dealoc(element);
    });

    it("should complain if manually bootstrapping a document whose <html> element has already been bootstrapped", () => {
      angular.bootstrap(document.getElementsByTagName("html")[0]);
      expect(() => {
        angular.bootstrap(document);
      }).toThrowError(/btstrpd/);

      dealoc(document);
    });

    it("should bootstrap in strict mode when ng-strict-di attribute is specified", () => {
      const appElement = JQLite('<div ng-app="" ng-strict-di></div>');
      window.angular.init(JQLite("<div></div>").append(appElement[0])[0]);
      expect(bootstrapSpy).toHaveBeenCalled();
      expect(bootstrapSpy.calls.mostRecent().args[2].strictDi).toBe(true);

      const injector = appElement.injector();
      function testFactory($rootScope) {}
      expect(() => {
        injector.instantiate(testFactory);
      }).toThrowError(/strictdi/);

      dealoc(appElement);
    });
  });

  describe("AngularJS service", () => {
    it("should override services", () => {
      injector = createInjector([
        function ($provide) {
          $provide.value("fake", "old");
          $provide.value("fake", "new");
        },
      ]);
      expect(injector.get("fake")).toEqual("new");
    });

    it("should inject dependencies specified by $inject and ignore function argument name", () => {
      expect(
        angular
          .injector([
            function ($provide) {
              $provide.factory("svc1", () => "svc1");
              $provide.factory("svc2", [
                "svc1",
                function (s) {
                  return `svc2-${s}`;
                },
              ]);
            },
          ])
          .get("svc2"),
      ).toEqual("svc2-svc1");
    });
  });

  describe("isDate", () => {
    it("should return true for Date object", () => {
      expect(isDate(new Date())).toBe(true);
    });

    it("should return false for non Date objects", () => {
      expect(isDate([])).toBe(false);
      expect(isDate("")).toBe(false);
      expect(isDate(23)).toBe(false);
      expect(isDate({})).toBe(false);
    });
  });

  describe("isError", () => {
    function testErrorFromDifferentContext(createError) {
      const iframe = document.createElement("iframe");
      document.getElementById("dummy").appendChild(iframe);
      try {
        const error = createError(iframe.contentWindow);
        expect(isError(error)).toBe(true);
      } finally {
        iframe.parentElement.removeChild(iframe);
      }
    }

    it("should not assume objects are errors", () => {
      const fakeError = { message: "A fake error", stack: "no stack here" };
      expect(isError(fakeError)).toBe(false);
    });

    it("should detect simple error instances", () => {
      expect(isError(new Error())).toBe(true);
    });

    it("should detect errors from another context", () => {
      testErrorFromDifferentContext((win) => new win.Error());
    });

    it("should detect DOMException errors from another context", () => {
      testErrorFromDifferentContext((win) => {
        try {
          win.document.querySelectorAll("");
        } catch (e) {
          return e;
        }
      });
    });
  });

  describe("isRegExp", () => {
    it("should return true for RegExp object", () => {
      expect(isRegExp(/^foobar$/)).toBe(true);
      expect(isRegExp(new RegExp("^foobar$/"))).toBe(true);
    });

    it("should return false for non RegExp objects", () => {
      expect(isRegExp([])).toBe(false);
      expect(isRegExp("")).toBe(false);
      expect(isRegExp(23)).toBe(false);
      expect(isRegExp({})).toBe(false);
      expect(isRegExp(new Date())).toBe(false);
    });
  });

  describe("isWindow", () => {
    it("should return true for the Window object", () => {
      expect(isWindow(window)).toBe(true);
    });

    it("should return false for any object that is not a Window", () => {
      expect(isWindow([])).toBe(false);
      expect(isWindow("")).toBeFalsy();
      expect(isWindow(23)).toBe(false);
      expect(isWindow({})).toBe(false);
      expect(isWindow(new Date())).toBe(false);
      expect(isWindow(document)).toBe(false);
    });
  });

  describe("compile", () => {
    it("should link to existing node and create scope", async () => {
      const template = angular.element(
        '<div>{{greeting = "hello world"}}</div>',
      );
      element = $compile(template)($rootScope);
      await wait();
      expect(template.text()).toEqual("hello world");
      expect($rootScope.greeting).toEqual("hello world");
    });

    it("should link to existing node and given scope", async () => {
      const template = angular.element(
        '<div>{{greeting = "hello world"}}</div>',
      );
      element = $compile(template)($rootScope);
      await wait();
      expect(template.text()).toEqual("hello world");
    });

    it("should link to new node and given scope", async () => {
      const template = JQLite('<div>{{greeting = "hello world"}}</div>');

      const compile = $compile(template);
      let templateClone = template[0].cloneNode(true);

      element = compile($rootScope, (clone) => {
        templateClone = clone;
      });
      await wait();
      expect(template.text()).toEqual('{{greeting = "hello world"}}');
      expect(element.text()).toEqual("hello world");
      expect(element).toEqual(templateClone);
      expect($rootScope.greeting).toEqual("hello world");
    });

    it("should link to cloned node and create scope", async () => {
      const template = JQLite('<div>{{greeting = "hello world"}}</div>');
      element = $compile(template)($rootScope, () => {});
      await wait();
      expect(template.text()).toEqual('{{greeting = "hello world"}}');
      expect(element.text()).toEqual("hello world");
      expect($rootScope.greeting).toEqual("hello world");
    });
  });

  describe("getNodeName", () => {
    it('should correctly detect node name with "namespace" when xmlns is defined', () => {
      const div = JQLite(
        '<div xmlns:ngtest="http://angularjs.org/">' +
          '<ngtest:foo ngtest:attr="bar"></ngtest:foo>' +
          "</div>",
      )[0];
      expect(getNodeName(div.childNodes[0])).toBe("ngtest:foo");
      expect(div.childNodes[0].getAttribute("ngtest:attr")).toBe("bar");
    });

    it('should correctly detect node name with "namespace" when xmlns is NOT defined', () => {
      const div = JQLite(
        '<div xmlns:ngtest="http://angularjs.org/">' +
          '<ngtest:foo ngtest:attr="bar"></ng-test>' +
          "</div>",
      )[0];
      expect(getNodeName(div.childNodes[0])).toBe("ngtest:foo");
      expect(div.childNodes[0].getAttribute("ngtest:attr")).toBe("bar");
    });

    it("should return undefined for elements without the .nodeName property", () => {
      // some elements, like SVGElementInstance don't have .nodeName property
      expect(getNodeName({})).toBeUndefined();
    });
  });

  describe("nextUid()", () => {
    it("should return new id per call", () => {
      const seen = {};
      let count = 100;

      while (count--) {
        const current = nextUid();
        expect(typeof current).toBe("number");
        expect(seen[current]).toBeFalsy();
        seen[current] = true;
      }
    });
  });

  describe("bootstrap", () => {
    let module, injector, $rootScope, $compile, angular;

    beforeEach(() => {
      angular = new Angular();
      module = angular.module("defaultModule", ["ng"]);
      injector = createInjector(["defaultModule"]);
      $rootScope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should bootstrap app", () => {
      const element = JQLite("<div>{{1+2}}</div>");
      const injector = angular.bootstrap(element);
      expect(injector).toBeDefined();
      expect(element.injector()).toBe(injector);
      dealoc(element);
    });

    it("should complain if app module can't be found", () => {
      const element = JQLite("<div>{{1+2}}</div>");

      expect(() => {
        angular.bootstrap(element, ["doesntexist"]);
      }).toThrowError(/modulerr/);

      expect(element.html()).toBe("{{1+2}}");
      dealoc(element);
    });
  });

  describe("startingElementHtml", () => {
    it("should show starting element tag only", () => {
      expect(startingTag('<ng-abc x="2A"><div>text</div></ng-abc>')).toBe(
        '<ng-abc x="2A">',
      );
    });
  });

  describe("startingTag", () => {
    it("should allow passing in Nodes instead of Elements", () => {
      const txtNode = document.createTextNode("some text");
      expect(startingTag(txtNode)).toBe("some text");
    });
  });

  describe("snakeCase", () => {
    it("should convert to snakeCase", () => {
      expect(snakeCase("ABC")).toEqual("a_b_c");
      expect(snakeCase("alanBobCharles")).toEqual("alan_bob_charles");
    });

    it("should allow separator to be overridden", () => {
      expect(snakeCase("ABC", "&")).toEqual("a&b&c");
      expect(snakeCase("alanBobCharles", "&")).toEqual("alan&bob&charles");
    });
  });

  describe("fromJson", () => {
    it("should delegate to JSON.parse", () => {
      const spy = spyOn(JSON, "parse").and.callThrough();

      expect(fromJson("{}")).toEqual({});
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("toJson", () => {
    it("should delegate to JSON.stringify", () => {
      const spy = spyOn(JSON, "stringify").and.callThrough();

      expect(toJson({})).toEqual("{}");
      expect(spy).toHaveBeenCalled();
    });

    it("should format objects pretty", () => {
      expect(toJson({ a: 1, b: 2 }, true)).toBe('{\n  "a": 1,\n  "b": 2\n}');
      expect(toJson({ a: { b: 2 } }, true)).toBe(
        '{\n  "a": {\n    "b": 2\n  }\n}',
      );
      expect(toJson({ a: 1, b: 2 }, false)).toBe('{"a":1,"b":2}');
      expect(toJson({ a: 1, b: 2 }, 0)).toBe('{"a":1,"b":2}');
      expect(toJson({ a: 1, b: 2 }, 1)).toBe('{\n "a": 1,\n "b": 2\n}');
      expect(toJson({ a: 1, b: 2 }, {})).toBe('{\n  "a": 1,\n  "b": 2\n}');
    });

    it("should not serialize properties starting with $$", () => {
      expect(toJson({ $$some: "value" }, false)).toEqual("{}");
    });

    it("should serialize properties starting with $", () => {
      expect(toJson({ $few: "v" }, false)).toEqual('{"$few":"v"}');
    });

    it("should not serialize scope instances", () => {
      expect(toJson({ key: $rootScope })).toEqual('{"key":"$SCOPE"}');
    });

    it("should serialize undefined as undefined", () => {
      expect(toJson(undefined)).toEqual(undefined);
    });
  });

  describe("isElement", () => {
    it("should return a boolean value", () => {
      const element = $compile("<p>Hello, world!</p>")($rootScope);
      const body = document.body;
      const expected = [
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
        true,
      ];
      const tests = [
        null,
        undefined,
        "string",
        1001,
        {},
        0,
        false,
        body,
        element,
      ];
      Object.entries(tests).forEach(([idx, value]) => {
        const result = isElement(value);
        expect(typeof result).toEqual("boolean");
        expect(result).toEqual(expected[idx]);
      });
    });

    // Issue #4805
    it("should return false for objects resembling a Backbone Collection", () => {
      // Backbone stuff is sort of hard to mock, if you have a better way of doing this,
      // please fix this.
      const fakeBackboneCollection = {
        children: [{}, {}, {}],
        find() {},
        on() {},
        off() {},
        bind() {},
      };
      expect(isElement(fakeBackboneCollection)).toBe(false);
    });

    it("should return false for arrays with node-like properties", () => {
      const array = [1, 2, 3];
      array.on = true;
      expect(isElement(array)).toBe(false);
    });
  });
});
