/** @license
 * Copyright 2018 Esri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Provides tests for general helper functions.
 */

import * as generalHelpers from "../src/generalHelpers";
import * as hubCommon from "@esri/hub-common";
import * as interfaces from "../src/interfaces";
import * as mockItems from "../test/mocks/agolItems";
import * as serviceAdmin from "@esri/arcgis-rest-service-admin";

describe("Module `generalHelpers`: common utility functions shared across packages", () => {
  describe("blobToJson", () => {
    it("extracts JSON from a blob", async () => {
      const srcJson: any = {
        a: "b",
        c: 4,
      };
      const blob: Blob = new Blob([JSON.stringify(srcJson)], {
        type: "application/json",
      });

      const extractedJson = await generalHelpers.blobToJson(blob);
      expect(extractedJson).toEqual(srcJson);
    });

    it("fails to extract JSON from a blob 1", async () => {
      const blob: Blob = new Blob([], { type: "application/json" });

      const extractedJson = await generalHelpers.blobToJson(blob);
      expect(extractedJson).toBeNull();
    });

    it("fails to extract JSON from a blob 2", async () => {
      const blob: Blob = new Blob(["a"], { type: "application/json" });

      const extractedJson = await generalHelpers.blobToJson(blob);
      expect(extractedJson).toBeNull();
    });
  });

  describe("blobToFile", () => {
    it("converts a blob to a file", () => {
      const blob: Blob = new Blob(["a"], { type: "application/json" });
      const file: File = generalHelpers.blobToFile(blob, "test.json");
      expect(file).toBeDefined();
      expect(file.name).toEqual("test.json");
      expect(file.type).toEqual("application/json");
    });

    it("handles a typeless blob", () => {
      const blob: Blob = new Blob(["a"]);
      const file: File = generalHelpers.blobToFile(blob, "test.json");
      expect(file).toBeDefined();
      expect(file.name).toEqual("test.json");
      expect(file.type).toEqual("");
    });

    it("handles an empty blob", () => {
      const blob: Blob = new Blob([]);
      const file: File = generalHelpers.blobToFile(blob, "test.json");
      expect(file).toBeDefined();
      expect(file.name).toEqual("test.json");
      expect(file.type).toEqual("");
    });
  });

  interface ITestCompareJSONProperties {
    isInvitationOnly: boolean;
    views: number;
    id: string;
    tags: string[];
    phone: string;
    extent: number[][];
    spatialReference: serviceAdmin.ISpatialReference;
  }

  describe("checkUrlPathTermination", () => {
    it("doesn't change terminated URL", () => {
      const url = "https://myOrg.arcgis.com/a/path/";
      expect(generalHelpers.checkUrlPathTermination(url)).toEqual(url);
    });

    it("changes unterminated URL", () => {
      const url = "https://myOrg.arcgis.com/a/path";
      expect(generalHelpers.checkUrlPathTermination(url)).toEqual(url + "/");
    });
  });

  describe("cleanItemId", () => {
    it("should handle empty id", () => {
      expect(generalHelpers.cleanItemId(null)).toBeNull();
      expect(generalHelpers.cleanItemId(undefined)).toBeUndefined();
      expect(generalHelpers.cleanItemId("")).toEqual("");
    });

    it("should remove template braces and itemId property", () => {
      expect(generalHelpers.cleanItemId("{{itm1234567890.itemId}}")).toEqual("itm1234567890");
    });
  });

  describe("cleanLayerBasedItemId", () => {
    it("should handle empty id", () => {
      expect(generalHelpers.cleanLayerBasedItemId(null)).toEqual(null);
      expect(generalHelpers.cleanLayerBasedItemId(undefined)).toBeUndefined();
      expect(generalHelpers.cleanLayerBasedItemId("")).toEqual("");
    });

    it("handles a layer-templatized item id", () => {
      expect(generalHelpers.cleanLayerBasedItemId("{{934a9ef8efa7448fa8ddf7b13cef0240.layer0.itemId}}")).toEqual(
        "934a9ef8efa7448fa8ddf7b13cef0240",
      );
    });
  });

  describe("cleanLayerId", () => {
    it("should handle empty id", () => {
      expect(generalHelpers.cleanLayerId(null)).toEqual(null);
      expect(generalHelpers.cleanLayerId(undefined)).toBeUndefined();
      expect(generalHelpers.cleanLayerId("")).toEqual("");
    });

    it("handles a templatized layer id", () => {
      expect(generalHelpers.cleanLayerId("{{934a9ef8efa7448fa8ddf7b13cef0240.layer0.layerId}}")).toEqual(0);
      expect(generalHelpers.cleanLayerId("{{934a9ef8efa7448fa8ddf7b13cef0240.layer5.layerId}}")).toEqual(5);
      expect(generalHelpers.cleanLayerId("{{934a9ef8efa7448fa8ddf7b13cef0240.layer12.layerId}}")).toEqual(12);
    });
  });

  describe("cloneObject", () => {
    it("can clone a typed File", () => {
      const obj = new File(["dancer"], "fred", { type: "text/plain" });
      const c = generalHelpers.cloneObject(obj);
      expect(c).not.toBe(obj);
      expect(c.name).toBe("fred");
      expect(c.type).toBe("text/plain");
    });

    it("can clone an untyped File", () => {
      const obj = new File(["dancer"], "ginger");
      const c = generalHelpers.cloneObject(obj);
      expect(c).not.toBe(obj);
      expect(c.name).toBe("ginger");
      expect(c.type).toBe("");
    });

    it("can clone a shallow object", () => {
      const obj = {
        color: "red",
        length: 12,
      } as any;
      const c = generalHelpers.cloneObject(obj);
      expect(c).not.toBe(obj);

      ["color", "length"].map((prop) => {
        expect(c[prop]).toEqual(obj[prop]);
      });
    });

    it("can clone a deep object", () => {
      const obj = {
        color: "red",
        length: 12,
        field: {
          name: "origin",
          type: "string",
        },
      } as any;
      const c = generalHelpers.cloneObject(obj);
      expect(c).not.toBe(obj);
      expect(c.field).not.toBe(obj.field);

      ["color", "length"].map((prop) => {
        expect(c[prop]).toEqual(obj[prop]);
      });
      ["name", "type"].map((prop) => {
        expect(c.field[prop]).toEqual(obj.field[prop]);
      });
    });

    it("does not stringify null", () => {
      const obj = {
        color: "red",
        length: 12,
        field: {
          name: "origin",
          type: null,
        },
      } as any;
      const c = generalHelpers.cloneObject(obj);
      expect(c).not.toBe(obj);
      expect(c.field).not.toBe(obj.field);
      expect(c.field.type).toBe(null);

      ["color", "length"].map((prop) => {
        expect(c[prop]).toEqual(obj[prop]);
      });
      ["name", "type"].map((prop) => {
        expect(c.field[prop]).toEqual(obj.field[prop]);
      });
    });

    it("can clone a deep object with an array", () => {
      const obj = {
        color: "red",
        length: 12,
        field: {
          name: "origin",
          type: "string",
        },
        names: ["steve", "james", "bob"],
        deep: [
          {
            things: ["one", "two", "red", "blue"],
          },
        ],
        addresses: [
          {
            street: "123 main",
            city: "anytown",
            zip: 82729,
          },
          {
            street: "876 main",
            city: "anytown",
            zip: 123992,
          },
        ],
      } as any;

      const c = generalHelpers.cloneObject(obj);
      expect(c).not.toBe(obj);
      expect(c.field).not.toBe(obj.field);
      expect(c.names).not.toBe(obj.names);
      expect(c.names.length).toEqual(obj.names.length);
      expect(Array.isArray(c.deep)).toBeTruthy();
      expect(c.deep[0].things.length).toBe(4);
      ["color", "length"].map((prop) => {
        expect(c[prop]).toEqual(obj[prop]);
      });
      ["name", "type"].map((prop) => {
        expect(c.field[prop]).toEqual(obj.field[prop]);
      });
      // deep array...
      expect(Array.isArray(c.addresses)).toBeTruthy();
      expect(c.addresses.length).toEqual(obj.addresses.length);

      c.addresses.forEach((entry: any, idx: number) => {
        const orig = obj.addresses[idx];
        expect(entry).not.toBe(orig);
        ["street", "city", "zip"].map((prop) => {
          expect(entry[prop]).toBe(orig[prop]);
        });
      });
    });
  });

  describe("compareJSON", () => {
    let sampleItemTemplate: any;
    beforeEach(() => {
      sampleItemTemplate = {
        item: {
          name: null,
          title: "z2g9f4nv",
          type: "Solution",
          typeKeywords: ["Solution", "Deployed"],
          description: null,
          tags: [],
          snippet: null,
          thumbnail: null,
          documentation: null,
          extent: "{{solutionItemExtent}}",
          categories: [],
          spatialReference: null,
          accessInformation: null,
          licenseInfo: null,
          culture: "english (united states)",
          properties: null,
          url: null,
          proxyFilter: null,
          access: "private",
          appCategories: [],
          industries: [],
          languages: [],
          largeThumbnail: null,
          banner: null,
          screenshots: [],
          listed: false,
          groupDesignations: null,
          id: "itm1234567890",
        },
        data: {
          metadata: {},
          templates: [
            {
              itemId: "geo1234567890",
              type: "GeoJson",
              dependencies: [],
            },
          ],
        },
      };
    });

    it("empty objects", () => {
      expect(generalHelpers.compareJSON({}, {})).toBeTruthy();
    });

    it("one empty object", () => {
      expect(generalHelpers.compareJSON({ a: 1 }, {})).toBeFalsy();
      expect(generalHelpers.compareJSON({}, { a: 1 })).toBeFalsy();
    });

    it("two single-level objects", () => {
      expect(generalHelpers.compareJSON({ a: 1, b: 2, c: "3" }, { a: 1, b: 2, c: "3" })).toBeTruthy();
      expect(generalHelpers.compareJSON({ a: 1, b: 2, c: "3" }, { a: 1 })).toBeFalsy();
    });

    it("multiple-level objects", () => {
      expect(generalHelpers.compareJSON(sampleItemTemplate, sampleItemTemplate))
        .withContext("compare sampleItemTemplate, sampleItemTemplate")
        .toBeTruthy();

      let clone = generalHelpers.cloneObject(sampleItemTemplate);
      expect(generalHelpers.compareJSON(sampleItemTemplate, clone))
        .withContext("compare sampleItemTemplate, clone")
        .toBeTruthy();

      generalHelpers.deleteItemProps(clone);
      expect(generalHelpers.compareJSON({}, clone)).withContext("compare {}, clone").toBeTruthy();
      expect(generalHelpers.compareJSON(sampleItemTemplate, clone))
        .withContext("compare sampleItemTemplate, clone")
        .toBeFalsy();

      clone = generalHelpers.deleteItemProps(generalHelpers.cloneObject(sampleItemTemplate.item));
      const sampleItemBase = generalHelpers.deleteItemProps(generalHelpers.cloneObject(sampleItemTemplate.item));
      expect(generalHelpers.compareJSON(sampleItemBase, clone))
        .withContext("compare sampleItemBase, clone")
        .toBeTruthy();
    });
  });

  describe("compareJSONNoEmptyStrings", () => {
    it("converts empty strings to null", () => {
      expect(generalHelpers.compareJSONNoEmptyStrings({ a: 1, b: 2, c: "" }, { a: 1, b: 2, c: null })).toBeTruthy();
    });
  });

  describe("compareJSONProperties", () => {
    it("should not report if no property changed", () => {
      const json1: ITestCompareJSONProperties = {
        isInvitationOnly: true,
        views: 5,
        id: "{{grp1234567890.itemId}}",
        tags: ["JavaScript"],
        phone: "",
        extent: [
          [-111.299, 43.4327],
          [-109.7829, 44.1159],
        ],
        spatialReference: {
          wkid: 102100,
          latestWkid: 3857,
        },
      };
      const json2: ITestCompareJSONProperties = {
        isInvitationOnly: true,
        views: 5,
        id: "{{grp1234567890.itemId}}",
        tags: ["JavaScript"],
        phone: "",
        extent: [
          [-111.299, 43.4327],
          [-109.7829, 44.1159],
        ],
        spatialReference: {
          wkid: 102100,
          latestWkid: 3857,
        },
      };

      const messages = generalHelpers.compareJSONProperties(json1, json2);
      expect(messages.length).toEqual(0);
    });

    it("should compare different property types", () => {
      const json1: ITestCompareJSONProperties = {
        isInvitationOnly: true,
        views: 5,
        id: "{{grp1234567890.itemId}}",
        tags: ["JavaScript"],
        phone: "",
        extent: [
          [-111.299, 43.4327],
          [-109.7829, 44.1159],
        ],
        spatialReference: {
          wkid: 102100,
          latestWkid: 3857,
        },
      };
      const json2: ITestCompareJSONProperties = {
        isInvitationOnly: false,
        views: 6,
        id: "{{grp1234567890.name}}",
        tags: ["JavaScript", "Group"],
        phone: "555-1212",
        extent: [
          [-111.299, 53],
          [-109.7829, 44.1159],
        ],
        spatialReference: {
          wkid: 4326,
        },
      };

      const messages = generalHelpers.compareJSONProperties(json1, json2);
      expect(messages.length).toEqual(7);
      expect(messages).toEqual([
        "Value difference: true vs. false",
        "Value difference: 5 vs. 6",
        'String difference: "{{grp1234567890.itemId}}" vs. "{{grp1234567890.name}}"',
        "Array length difference: [1] vs. [2]",
        'String difference: "" vs. "555-1212"',
        "Value difference: 43.4327 vs. 53",
        'Props difference: ["wkid","latestWkid"] vs. ["wkid"]',
      ]);
    });

    it("should handle comparison with null", () => {
      const json1: ITestCompareJSONProperties = {
        isInvitationOnly: true,
        views: 5,
        id: "{{grp1234567890.itemId}}",
        tags: ["JavaScript"],
        phone: "",
        extent: [
          [-111.299, 43.4327],
          [-109.7829, 44.1159],
        ],
        spatialReference: {
          wkid: 102100,
          latestWkid: 3857,
        },
      };

      const messages = generalHelpers.compareJSONProperties(json1, null);
      expect(messages.length).toEqual(1);
      expect(messages).toEqual(["Type difference: object vs. null"]);
    });

    it("should handle comparison with undefined", () => {
      const json1: ITestCompareJSONProperties = {
        isInvitationOnly: true,
        views: 5,
        id: "{{grp1234567890.itemId}}",
        tags: ["JavaScript"],
        phone: "",
        extent: [
          [-111.299, 43.4327],
          [-109.7829, 44.1159],
        ],
        spatialReference: {
          wkid: 102100,
          latestWkid: 3857,
        },
      };

      const messages = generalHelpers.compareJSONProperties(json1, undefined);
      expect(messages.length).toEqual(1);
      expect(messages).toEqual(["Type difference: object vs. undefined"]);
    });

    it("should ignore undefined vs. null", () => {
      const messages = generalHelpers.compareJSONProperties(null, undefined);
      expect(messages.length).toEqual(0);
    });
  });

  describe("convertIModel", () => {
    it("handles hub IModel without resources", () => {
      const model = {
        item: {
          id: "FAKE3ef",
        },
      } as unknown as hubCommon.IModel;

      const result: interfaces.IItemTemplate = generalHelpers.convertIModel(model);

      expect(result.resources).toEqual([], "should convert resources to array");
    });

    it("handles hub IModel with resources", () => {
      const model = {
        item: {
          id: "FAKE3ef",
        },
        resources: {
          a: "abc",
          d: "def",
        },
      } as unknown as hubCommon.IModel;

      const result: interfaces.IItemTemplate = generalHelpers.convertIModel(model);

      expect(result.resources).toEqual(["abc", "def"], "should convert resources to array");
    });

    it("handles undefined hub IModel", () => {
      const result: interfaces.IItemTemplate = generalHelpers.convertIModel(undefined);

      expect(result.resources).toEqual([], "should convert resources to array");
    });
  });

  describe("createLongId", () => {
    it("has exactly 32 alphanumeric characters", () => {
      const id = generalHelpers.createLongId();
      expect(id.length).toEqual(32);
      expect(id.match(/[^a-z0-9]/)).toBeNull();
    });
  });

  describe("dedupe", () => {
    it("should handle undefined list", () => {
      expect(generalHelpers.dedupe()).toEqual([]);
    });

    it("should handle empty list", () => {
      expect(generalHelpers.dedupe([])).toEqual([]);
    });

    it("should handle list with no duplicates", () => {
      expect(generalHelpers.dedupe(["a", "b", "c", "d"])).toEqual(["a", "b", "c", "d"]);
    });

    it("should handle list with duplicates", () => {
      expect(generalHelpers.dedupe(["a", "d", "c", "d"])).toEqual(["a", "d", "c"]);
    });
  });

  describe("delay", () => {
    it("should delay", async () => {
      const start = Date.now();
      await generalHelpers.delay(1000);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(1000);
    });
  });

  describe("deleteProp", () => {
    it("should handle missing prop", () => {
      const testObject: any = {};
      generalHelpers.deleteProp(testObject, "prop1");
      expect(testObject).toEqual({});
    });

    it("should delete a prop", () => {
      const testObject: any = {
        prop1: true,
        prop2: true,
      };
      const expected: any = {
        prop2: true,
      };
      generalHelpers.deleteProp(testObject, "prop1");
      expect(testObject).toEqual(expected);
    });

    it("handles empty path", () => {
      const obj: any = {
        child: 1,
      };
      generalHelpers.deleteProp(obj, "");
      expect(obj).toEqual({
        child: 1,
      });
    });

    it("handles non-existent property", () => {
      const obj: any = {
        child: 1,
      };
      generalHelpers.deleteProp(obj, "nephew");
      expect(obj).toEqual({
        child: 1,
      });
    });

    it("handles single-level property", () => {
      const obj: any = {
        child: 1,
      };
      generalHelpers.deleteProp(obj, "child");
      expect(obj).toEqual({});
    });

    it("handles double-level property", () => {
      const obj: any = {
        child: {
          grandchildA: "a",
          grandchildB: "b",
        },
      };
      generalHelpers.deleteProp(obj, "child.grandchildB");
      expect(obj).toEqual({
        child: {
          grandchildA: "a",
        },
      });
    });

    it("handles second-level delete of triple-level property", () => {
      const obj: any = {
        child: {
          grandchildA: "a",
          grandchildB: {
            greatGrandchildC: {
              greatGreatGrandchildD: 4,
            },
          },
        },
      };
      generalHelpers.deleteProp(obj, "child.grandchildB");
      expect(obj).toEqual({
        child: {
          grandchildA: "a",
        },
      });
    });

    it("handles triple-level property", () => {
      const obj: any = {
        child: {
          grandchildA: "a",
          grandchildB: {
            greatGrandchildC: {
              greatGreatGrandchildD: 4,
            },
          },
        },
      };
      generalHelpers.deleteProp(obj, "child.grandchildB.greatGrandchildC");
      expect(obj).toEqual({
        child: {
          grandchildA: "a",
          grandchildB: {},
        },
      });
    });

    it("doesn't skip levels", () => {
      const obj: any = {
        child: {
          grandchildA: "a",
          grandchildB: "b",
        },
      };
      generalHelpers.deleteProp(obj, "grandchildB");
      expect(obj).toEqual({
        child: {
          grandchildA: "a",
          grandchildB: "b",
        },
      });
    });

    it("handles level-one array", () => {
      const obj: any = {
        child: ["a", "b"],
      };
      generalHelpers.deleteProp(obj, "child");
      expect(obj).toEqual({});
    });

    it("handles second-level array", () => {
      const obj: any = {
        child: {
          grandchildA: ["a", "b"],
          grandchildB: ["a", "b"],
        },
      };
      generalHelpers.deleteProp(obj, "child.grandchildA");
      expect(obj).toEqual({
        child: {
          grandchildB: ["a", "b"],
        },
      });
    });

    it("handles third-level array", () => {
      const obj: any = {
        child: {
          grandchildA: [
            {
              greatGrandchildC: ["a", "b"],
              greatGrandchildD: ["a", "b"],
            },
            {
              greatGrandchildE: ["a", "b"],
              greatGrandchildF: ["a", "b"],
            },
          ],
          grandchildB: ["a", "b"],
        },
      };
      generalHelpers.deleteProp(obj, "child.grandchildA.greatGrandchildD");
      expect(obj).toEqual({
        child: {
          grandchildA: [
            {
              greatGrandchildC: ["a", "b"],
            },
            {
              greatGrandchildE: ["a", "b"],
              greatGrandchildF: ["a", "b"],
            },
          ],
          grandchildB: ["a", "b"],
        },
      });
    });

    it("handles third-level array property", () => {
      const obj: any = {
        child: {
          grandchildA: [
            {
              greatGrandchildC: [
                {
                  greatGreatGrandchildG: 10,
                },
              ],
              greatGrandchildD: ["a", "b"],
            },
            {
              greatGrandchildE: ["a", "b"],
              greatGrandchildF: [
                {
                  greatGreatGrandchildG: 10,
                  greatGreatGrandchildH: 15,
                  greatGreatGrandchildI: 20,
                },
              ],
            },
          ],
          grandchildB: ["a", "b"],
        },
      };
      generalHelpers.deleteProp(obj, "child.grandchildA.greatGrandchildF.greatGreatGrandchildH");
      expect(obj).toEqual({
        child: {
          grandchildA: [
            {
              greatGrandchildC: [
                {
                  greatGreatGrandchildG: 10,
                },
              ],
              greatGrandchildD: ["a", "b"],
            },
            {
              greatGrandchildE: ["a", "b"],
              greatGrandchildF: [
                {
                  greatGreatGrandchildG: 10,
                  greatGreatGrandchildI: 20,
                },
              ],
            },
          ],
          grandchildB: ["a", "b"],
        },
      });
    });

    it("handles third-level array solo property", () => {
      const obj: any = {
        child: {
          grandchildA: [
            {
              greatGrandchildC: [
                {
                  greatGreatGrandchildG: 10,
                },
              ],
              greatGrandchildD: ["a", "b"],
            },
            {
              greatGrandchildE: ["a", "b"],
              greatGrandchildF: [
                {
                  greatGreatGrandchildG: 10,
                  greatGreatGrandchildH: 15,
                  greatGreatGrandchildI: 20,
                },
              ],
            },
          ],
          grandchildB: ["a", "b"],
        },
      };
      generalHelpers.deleteProp(obj, "child.grandchildA.greatGrandchildC.greatGreatGrandchildG");
      expect(obj).toEqual({
        child: {
          grandchildA: [
            {
              greatGrandchildC: [{}],
              greatGrandchildD: ["a", "b"],
            },
            {
              greatGrandchildE: ["a", "b"],
              greatGrandchildF: [
                {
                  greatGreatGrandchildG: 10,
                  greatGreatGrandchildH: 15,
                  greatGreatGrandchildI: 20,
                },
              ],
            },
          ],
          grandchildB: ["a", "b"],
        },
      });
    });

    it("doesn't skip array levels", () => {
      const obj: any = {
        child: {
          grandchildA: ["a", "b"],
          grandchildB: ["a", "b"],
        },
      };
      generalHelpers.deleteProp(obj, "grandchildA");
      expect(obj).toEqual({
        child: {
          grandchildA: ["a", "b"],
          grandchildB: ["a", "b"],
        },
      });
    });

    it("handles same property in multiple array items", () => {
      const obj: any = {
        total: 29,
        start: 1,
        num: 2,
        nextStart: 3,
        items: [
          {
            documentation: null,
            screenshots: [],
            listed: false,
            numComments: 0,
            numRatings: 0,
            groupDesignations: null,
          },
          {
            documentation: null,
            screenshots: [],
            listed: false,
            numComments: 0,
            numRatings: 0,
            groupDesignations: null,
          },
        ],
      };
      generalHelpers.deleteProp(obj, "items.numComments");
      expect(obj).toEqual({
        total: 29,
        start: 1,
        num: 2,
        nextStart: 3,
        items: [
          {
            documentation: null,
            screenshots: [],
            listed: false,
            numRatings: 0,
            groupDesignations: null,
          },
          {
            documentation: null,
            screenshots: [],
            listed: false,
            numRatings: 0,
            groupDesignations: null,
          },
        ],
      });
    });
  });

  describe("deleteProps", () => {
    it("should handle missing props", () => {
      const testObject: any = {};
      generalHelpers.deleteProps(testObject, ["prop1", "prop2"]);
      expect(testObject).toEqual({});
    });

    it("should delete props", () => {
      const testObject: any = {
        prop1: true,
        prop2: true,
        prop3: true,
      };
      const expected: any = {
        prop2: true,
      };
      generalHelpers.deleteProps(testObject, ["prop1", "prop3"]);
      expect(testObject).toEqual(expected);
    });
  });

  describe("fail", () => {
    it("can return failure with no error argument", () => {
      const error: any = undefined;
      const expected: any = { success: false };
      expect(generalHelpers.fail(error)).toEqual(expected);
    });

    it("can return failure with no error property on error argument", () => {
      const error: any = "Error";
      const expected: any = { success: false, error: "Error" };
      expect(generalHelpers.fail(error)).toEqual(expected);
    });

    it("can return failure with error property on error argument", () => {
      const error: any = { error: "Error" };
      const expected: any = { success: false, error: "Error" };
      expect(generalHelpers.fail(error)).toEqual(expected);
    });
  });

  describe("failWithIds", () => {
    it("can return failure with no item ids", () => {
      const itemIds: string[] = [];
      const error: any = "Error";
      const expected: any = {
        success: false,
        itemIds,
        error: "Error",
      };
      expect(generalHelpers.failWithIds(itemIds, error)).toEqual(expected);
    });

    it("can return failure with no error argument", () => {
      const itemIds: string[] = ["abc", "def"];
      const error: any = undefined;
      const expected: any = {
        success: false,
        itemIds,
      };
      expect(generalHelpers.failWithIds(itemIds, error)).toEqual(expected);
    });
  });

  describe("getSubgroupIds", () => {
    it("handles no tags", () => {
      const tags: string[] = [];
      const expectedIds: string[] = [];
      expect(generalHelpers.getSubgroupIds(tags)).toEqual(expectedIds);
    });

    it("handles tags without group ids", () => {
      const tags: string[] = ["3D City", "3D", "ArcGIS Solutions", "Buildings", "Floors", "Lidar"];
      const expectedIds: string[] = [];
      expect(generalHelpers.getSubgroupIds(tags)).toEqual(expectedIds);
    });

    it("handles tags with group ids", () => {
      const tags: string[] = [
        "3D City",
        "3D",
        "ArcGIS Solutions",
        "Buildings",
        "Floors",
        "group.8d515625ee9f49d7b4f6c6cb2a389151",
        "Lidar",
      ];
      const expectedIds: string[] = ["8d515625ee9f49d7b4f6c6cb2a389151"];
      expect(generalHelpers.getSubgroupIds(tags)).toEqual(expectedIds);
    });
  });

  describe("generateEmptyCreationResponse", () => {
    it("returns an empty response", () => {
      const chk = generalHelpers.generateEmptyCreationResponse("Some Type");
      expect(chk.id).withContext("id should be empty").toBe("");
      expect(chk.type).withContext("type should be set").toBe("Some Type");
      expect(chk.postProcess).withContext("postProcess set to false").toBe(false);
    });

    it("returns an empty response with id", () => {
      const chk = generalHelpers.generateEmptyCreationResponse("Some Type", "Some Id");
      expect(chk.id).withContext("id should be empty").toBe("Some Id");
      expect(chk.type).withContext("type should be set").toBe("Some Type");
      expect(chk.postProcess).withContext("postProcess set to false").toBe(false);
    });
  });

  describe("getAgoIdRegEx", () => {
    it("matches an id 1", () => {
      const id = "bad3483e025c47338d43df308c117308";
      const match = id.match(generalHelpers.getAgoIdRegEx());
      expect(match).not.toBeNull();
    });

    it("matches an id 2", () => {
      const id = '"bad3483e025c47338d43df308c117308"';
      const match = id.match(generalHelpers.getAgoIdRegEx());
      expect(match).not.toBeNull();
    });

    it("matches an id 3", () => {
      const id = ",bad3483e025c47338d43df308c117308,";
      const match = id.match(generalHelpers.getAgoIdRegEx());
      expect(match).not.toBeNull();
    });

    it("doesn't match a string that's not an id: too short", () => {
      const id = "bad3483e025c47338d43df308c11730";
      const match = id.match(generalHelpers.getAgoIdRegEx());
      expect(match).toBeNull();
    });

    it("doesn't match a string that's not an id: too long", () => {
      const id = "bad3483e025c47338d43df308c117308a";
      const match = id.match(generalHelpers.getAgoIdRegEx());
      expect(match).toBeNull();
    });

    it("matches multiple instances of ids", () => {
      const id = "bad3483e025c47338d43df308c117308, bad3483e025c47338d43df308c117309";
      const match = id.match(generalHelpers.getAgoIdRegEx());
      expect(match).not.toBeNull();
      expect(match?.length).toEqual(2);
    });
  });

  describe("getAgoIdTemplateRegEx", () => {
    it("matches a templatized id 1", () => {
      const id = "{{bad3483e025c47338d43df308c117308}}";
      const match = id.match(generalHelpers.getAgoIdTemplateRegEx());
      expect(match).not.toBeNull();
    });

    it("matches a templatized id 2", () => {
      const id = '"{{bad3483e025c47338d43df308c117308}}"';
      const match = id.match(generalHelpers.getAgoIdTemplateRegEx());
      expect(match).not.toBeNull();
    });

    it("matches a templatized id 3", () => {
      const id = ",{{bad3483e025c47338d43df308c117308}},";
      const match = id.match(generalHelpers.getAgoIdTemplateRegEx());
      expect(match).not.toBeNull();
    });

    it("doesn't match a string that's not a templatized id 1", () => {
      const id = "{{bad3483e025c47338d43df308c11730}}";
      const match = id.match(generalHelpers.getAgoIdTemplateRegEx());
      expect(match).toBeNull();
    });

    it("doesn't match a string that's not a templatized id 2", () => {
      const id = "{{bad3483e025c47338d43df308c117308a}}";
      const match = id.match(generalHelpers.getAgoIdTemplateRegEx());
      expect(match).toBeNull();
    });

    it("doesn't match a string that's not a templatized id 3", () => {
      const id = "bad3483e025c47338d43df308c117308"; // not templatized
      const match = id.match(generalHelpers.getAgoIdTemplateRegEx());
      expect(match).toBeNull();
    });

    it("matches multiple instances of templatized ids", () => {
      const id = "{{bad3483e025c47338d43df308c117308}}, {{bad3483e025c47338d43df308c117309}}";
      const match = id.match(generalHelpers.getAgoIdTemplateRegEx());
      expect(match).not.toBeNull();
      expect(match?.length).toEqual(2);
    });
  });

  describe("getSpecifiedWordRegEx", () => {
    it("matches an word 1", () => {
      const word = "bad3483e025c47338d43df308c117308";
      const match = word.match(generalHelpers.getSpecifiedWordRegEx(word));
      expect(match).not.toBeNull();
    });

    it("matches an word 2", () => {
      const word = "bad3483e025c47338d43df308c117308";
      const test = '"bad3483e025c47338d43df308c117308"';
      const match = test.match(generalHelpers.getSpecifiedWordRegEx(word));
      expect(match).not.toBeNull();
    });

    it("matches an word 3", () => {
      const word = "bad3483e025c47338d43df308c117308";
      const test = ",bad3483e025c47338d43df308c117308,";
      const match = test.match(generalHelpers.getSpecifiedWordRegEx(word));
      expect(match).not.toBeNull();
    });

    it("doesn't match a word 1", () => {
      const word = "bad3483e025c47338d43df308c117308";
      const test = "bad3483e025c47338d43df308c11730";
      const match = test.match(generalHelpers.getSpecifiedWordRegEx(word));
      expect(match).toBeNull();
    });

    it("doesn't match a word 2", () => {
      const word = "bad3483e025c47338d43df308c117308";
      const test = "bad3483e025c47338d43df308c117308a";
      const match = test.match(generalHelpers.getSpecifiedWordRegEx(word));
      expect(match).toBeNull();
    });

    it("doesn't match a word 3", () => {
      const word = "bad3483e025c47338d43df308c117308";
      const test = "bad3483e025c47338d43df308c117309";
      const match = test.match(generalHelpers.getSpecifiedWordRegEx(word));
      expect(match).toBeNull();
    });

    it("matches multiple instances of word", () => {
      const word = "bad3483e025c47338d43df308c117308";
      const test =
        "bad3483e025c47338d43df308c117308, bad3483e025c47338d43df308c117309, bad3483e025c47338d43df308c117308,";
      const match = test.match(generalHelpers.getSpecifiedWordRegEx(word));
      expect(match).not.toBeNull();
      expect(match?.length).toEqual(2);
    });
  });

  describe("getIDs", () => {
    it("will find ids", () => {
      let actual = generalHelpers.getIDs("bad3483e025c47338d43df308c117308");
      expect(actual).toEqual(["bad3483e025c47338d43df308c117308"]);

      actual = generalHelpers.getIDs("{bad3483e025c47338d43df308c117308");
      expect(actual).toEqual(["bad3483e025c47338d43df308c117308"]);

      actual = generalHelpers.getIDs("=bad3483e025c47338d43df308c117308");
      expect(actual).toEqual(["bad3483e025c47338d43df308c117308"]);

      actual = generalHelpers.getIDs("http://something/name_bad3483e025c47338d43df308c117308");
      expect(actual).toEqual([]);

      actual = generalHelpers.getIDs("{{bad3483e025c47338d43df308c117308.itemId}}");
      expect(actual).toEqual([]);

      actual = generalHelpers.getIDs("bad3483e025c47338d43df308c117308bad3483e025c47338d43df308c117308");
      expect(actual).toEqual([]);

      actual = generalHelpers.getIDs(
        "bad3483e025c47338d43df308c117308 {bad4483e025c47338d43df308c117308 =bad5483e025c47338d43df308c117308 http://something/name_bad6483e025c47338d43df308c117308 {{bad7483e025c47338d43df308c117308.itemId}}",
      );
      expect(actual).toEqual([
        "bad3483e025c47338d43df308c117308",
        "bad4483e025c47338d43df308c117308",
        "bad5483e025c47338d43df308c117308",
      ]);
    });
  });

  describe("getProp", () => {
    it("should return a property given a path", () => {
      expect(generalHelpers.getProp({ color: "red" }, "color")).toEqual("red", "should return the prop");
    });

    it("should return a deep property given a path", () => {
      expect(generalHelpers.getProp({ color: { r: "ff", g: "00", b: "ff" } }, "color.r")).toEqual(
        "ff",
        "should return the prop",
      );
    });
  });

  describe("getProps", () => {
    it("should return an array of props", () => {
      const o = {
        one: {
          two: {
            three: {
              color: "red",
            },
            threeB: {
              color: "orange",
            },
          },
          other: "value",
        },
      };

      const vals = generalHelpers.getProps(o, ["one.two.three.color", "one.two.threeB.color"]);
      expect(vals.length).withContext("should return two values").toEqual(2);
      expect(vals.indexOf("red")).withContext("should have red").toBeGreaterThan(-1);
      expect(vals.indexOf("orange")).withContext("should have orange").toBeGreaterThan(-1);
    });

    it("should push an array into the return values", () => {
      const o = {
        one: {
          two: ["a", "b"],
          color: "red",
        },
      };
      const vals = generalHelpers.getProps(o, ["one.two", "one.color"]);
      expect(vals.length).withContext("should return two values").toEqual(2);
      expect(vals.indexOf("red")).withContext("should have red").toBeGreaterThan(-1);
    });

    it("should handle missing props", () => {
      const o = {
        one: {
          two: ["a", "b"],
          color: "red",
        },
      };
      const vals = generalHelpers.getProps(o, ["one.two", "one.color", "thing.three"]);
      expect(vals.length).withContext("should return two values").toEqual(2);
      expect(vals.indexOf("red")).withContext("should have red").toBeGreaterThan(-1);
    });
  });

  describe("getPropWithDefault", () => {
    it("should return a property given a path", () => {
      expect(generalHelpers.getPropWithDefault({ color: "red" }, "color")).toEqual("red", "should return the prop");
    });

    it("should return a deep property given a path", () => {
      expect(generalHelpers.getPropWithDefault({ color: { r: "ff", g: "00", b: "ff" } }, "color.r")).toEqual(
        "ff",
        "should return the prop",
      );
    });

    it("should return a default property given a path", () => {
      expect(generalHelpers.getPropWithDefault({ size: "15" }, "color", "blue")).toEqual(
        "blue",
        "should return the prop default",
      );
    });

    it("should return a deep default property given a path", () => {
      expect(generalHelpers.getPropWithDefault({ size: { width: "15", height: "15" } }, "color.r", "77")).toEqual(
        "77",
        "should return the prop default",
      );
    });
  });

  describe("getTemplateById", () => {
    it("return template that matches id", () => {
      const item0 = mockItems.getAGOLItemWithId("Feature Service", 0);
      item0.itemId = "ABC123";
      const item1 = mockItems.getAGOLItemWithId("Feature Service", 1);
      item1.itemId = "ABC124";
      const item2 = mockItems.getAGOLItemWithId("Feature Service", 2);
      item2.itemId = "ABC125";

      const templates: interfaces.IItemTemplate[] = [item0, item1, item2];

      const id: string = "ABC124";
      const expected: any = item1;

      const actual: any = generalHelpers.getTemplateById(templates, id);

      expect(actual).toEqual(expected);
    });

    it("returns supplied template if omitted", () => {
      const id: string = "ABC124";
      const expected: any = undefined;

      const actual: any = generalHelpers.getTemplateById([], id);

      expect(actual).toEqual(expected);
    });
  });

  describe("getTemplatedIds", () => {
    it("should return an array of ids", () => {
      const o = {
        one: {
          two: {
            three: {
              color: "{{7619da54364e42998db8f33617bd2d61.itemId}}",
            },
            threeB: {
              color: "{{389cff847eaa47d29be69ec126cd2c2a.itemId}}",
            },
          },
          other: "value",
        },
      };

      const vals = generalHelpers.getTemplatedIds(JSON.stringify(o));
      expect(vals.length).withContext("should return two values").toEqual(2);
      expect(vals[0]).withContext("first id").toEqual("7619da54364e42998db8f33617bd2d61");
      expect(vals[1]).withContext("second id").toEqual("389cff847eaa47d29be69ec126cd2c2a");
    });

    it("should handle lack of ids", () => {
      const o = {
        one: {
          two: {
            three: {
              color: "7619da54364e42998db8f33617bd2d61",
            },
            threeB: {
              color: "389cff847eaa47d29be69ec126cd2c2a",
            },
          },
          other: "value",
        },
      };

      const vals = generalHelpers.getTemplatedIds(JSON.stringify(o));
      expect(vals.length).withContext("should return empty list").toEqual(0);
    });
  });

  describe("getUniqueTitle", () => {
    it("can return base title if it doesn't exist at path", () => {
      const title: string = "The Title";
      const templateDictionary: any = {
        user: {
          folders: [],
        },
      };
      const path: string = "user.folders";
      const expected: string = "The Title";
      const actual: string = generalHelpers.getUniqueTitle(title, templateDictionary, path);
      expect(actual).toEqual(expected);
    });

    it("can return base title + 1 if the base title exists", () => {
      const title: string = "The Title";
      const templateDictionary: any = {
        user: {
          folders: [
            {
              title: "The Title",
            },
          ],
        },
      };
      const path: string = "user.folders";
      const expected: string = "The Title 1";
      const actual: string = generalHelpers.getUniqueTitle(title, templateDictionary, path);
      expect(actual).toEqual(expected);
    });

    it("can return base title + unique number if the base title + 1 exists", () => {
      const title: string = "The Title";
      const templateDictionary: any = {
        user: {
          folders: [
            {
              title: "The Title",
            },
            {
              title: "The Title 1",
            },
            {
              title: "The Title 3",
            },
          ],
        },
      };
      const path: string = "user.folders";
      const expected: string = "The Title 2";
      const actual: string = generalHelpers.getUniqueTitle(title, templateDictionary, path);
      expect(actual).toEqual(expected);
    });

    it("will ignore trailing spaces", () => {
      const title: string = "The Title     ";
      const templateDictionary: any = {
        user: {
          folders: [
            {
              title: "The Title",
            },
          ],
        },
      };
      const path: string = "user.folders";
      const expected: string = "The Title 1";
      const actual: string = generalHelpers.getUniqueTitle(title, templateDictionary, path);
      expect(actual).toEqual(expected);
    });
  });

  describe("getUTCTimestamp", () => {
    it("can get a well formed timestamp", () => {
      const timestamp: string = generalHelpers.getUTCTimestamp();
      const exp: string = "^\\d{8}_\\d{4}_\\d{5}$";
      const regEx = new RegExp(exp, "gm");
      expect(regEx.test(timestamp)).toBe(true);
    });
  });

  describe("globalStringReplace", () => {
    it("handles a null object", () => {
      const obj: any = null;
      const pattern: string = "to be replaced";
      const patternRE: RegExp = new RegExp(pattern, "gi");
      const replacement: string = "replacement";
      expect(generalHelpers.globalStringReplace(obj, patternRE, replacement)).toBeNull();
    });

    it("handles an array object", () => {
      const obj = ["first item", "second item containing to be replaced content"];
      const pattern: string = "to be replaced";
      const patternRE: RegExp = new RegExp(pattern, "gi");
      const replacement: string = "replacement";
      const expectedObj = ["first item", "second item containing replacement content"];
      expect(generalHelpers.globalStringReplace(obj, patternRE, replacement)).toEqual(expectedObj);
    });

    it("handles a general object", () => {
      const obj = {
        first: "first item",
        second: "second item containing to be replaced content",
        third: "third item to be replaced to be replaced",
      };
      const pattern: string = "to be replaced";
      const patternRE: RegExp = new RegExp(pattern, "gi");
      const replacement: string = "replacement";
      const expectedObj = {
        first: "first item",
        second: "second item containing replacement content",
        third: "third item replacement replacement",
      };
      expect(generalHelpers.globalStringReplace(obj, patternRE, replacement)).toEqual(expectedObj);
    });

    it("handles a nested object", () => {
      const obj = {
        first: "first item",
        second: {
          internal: "second item containing to be replaced content",
        },
        third: "third item to be replaced to be replaced",
        fourth: {
          a: 1,
          b: 2,
        },
        fifth: null as any,
      };
      const pattern: string = "to be replaced";
      const patternRE: RegExp = new RegExp(pattern, "gi");
      const replacement: string = "replacement";
      const expectedObj = {
        first: "first item",
        second: {
          internal: "second item containing replacement content",
        },
        third: "third item replacement replacement",
        fourth: {
          a: 1,
          b: 2,
        },
        fifth: null as any,
      };
      expect(generalHelpers.globalStringReplace(obj, patternRE, replacement)).toEqual(expectedObj);
    });
  });

  describe("hasAnyKeyword", () => {
    it("can handle a model with no typeKeywords", () => {
      const model: any = {};
      const keywords: string[] = [];
      const expected: boolean = false;
      expect(generalHelpers.hasAnyKeyword(model, keywords)).toBe(expected);
    });

    it("can handle empty keywords argument", () => {
      const model: any = {
        item: {
          typeKeywords: ["A", "B", "C"],
        },
      };
      const keywords: string[] = [];
      const expected: boolean = false;
      expect(generalHelpers.hasAnyKeyword(model, keywords)).toBe(expected);
    });

    it("can test for a set of keywords from model.item.typeKeywords", () => {
      const model: any = {
        item: {
          typeKeywords: ["A", "B", "C"],
        },
      };
      const keywords: string[] = ["A"];
      const expected: boolean = true;
      expect(generalHelpers.hasAnyKeyword(model, keywords)).toBe(expected);
    });

    it("can test for a set of keywords from model.typeKeywords", () => {
      const model: any = {
        typeKeywords: ["A", "B", "C"],
      };
      const keywords: string[] = ["C"];
      const expected: boolean = true;
      expect(generalHelpers.hasAnyKeyword(model, keywords)).toBe(expected);
    });

    it("can handle an actual set of keywords from model.item.typeKeywords", () => {
      const model: any = {
        item: {
          typeKeywords: [
            "Map",
            "Mapping Site",
            "Online Map",
            "source-ed27522a057b466587ddd2ffabd33661",
            "WAB2D",
            "Web AppBuilder",
          ],
        },
      };
      const keywords: string[] = ["WAB2D", "WAB3D", "Web AppBuilder"];
      const expected: boolean = true;
      expect(generalHelpers.hasAnyKeyword(model, keywords)).toBe(expected);
    });
  });

  describe("hasDatasource", () => {
    it("will return true when datasource is found", () => {
      const itemId: string = "solutionItem0123456";
      const layerId: number = 0;
      const datasource: interfaces.IDatasourceInfo = {
        layerId: layerId,
        ids: [],
        itemId: itemId,
        basePath: "",
        fields: [],
        relationships: [],
        adminLayerInfo: {},
      };
      const actual: boolean = generalHelpers.hasDatasource([datasource], itemId, layerId);
      expect(actual).toBe(true);
    });

    it("will return false when itemId is NOT found", () => {
      const itemId: string = "solutionItem0123456";
      const layerId: number = 0;
      const datasource: interfaces.IDatasourceInfo = {
        layerId: layerId,
        ids: [],
        itemId: itemId,
        basePath: "",
        fields: [],
        relationships: [],
        adminLayerInfo: {},
      };
      const actual: boolean = generalHelpers.hasDatasource([datasource], itemId + "1", layerId);
      expect(actual).toBe(false);
    });

    it("will return false when layerId is NOT found", () => {
      const itemId: string = "solutionItem0123456";
      const layerId: number = 0;
      const datasource: interfaces.IDatasourceInfo = {
        layerId: layerId,
        ids: [],
        itemId: itemId,
        basePath: "",
        fields: [],
        relationships: [],
        adminLayerInfo: {},
      };
      const actual: boolean = generalHelpers.hasDatasource([datasource], itemId, 1);
      expect(actual).toBe(false);
    });
  });

  describe("hasTypeKeyword", () => {
    it("can handle an object with no typeKeywords", () => {
      const model: any = {};
      const keyword: string = "";
      const expected: boolean = false;
      expect(generalHelpers.hasTypeKeyword(model, keyword)).toBe(expected);
    });

    it("can handle an object with item.typeKeywords", () => {
      const model: any = {
        item: {
          typeKeywords: ["A", "B", "C"],
        },
      };
      const keyword: string = "A";
      const expected: boolean = true;
      expect(generalHelpers.hasTypeKeyword(model, keyword)).toBe(expected);
    });

    it("can handle an object with typeKeywords", () => {
      const model: any = {
        typeKeywords: ["A", "B", "C"],
      };
      const keyword: string = "B";
      const expected: boolean = true;
      expect(generalHelpers.hasTypeKeyword(model, keyword)).toBe(expected);
    });
  });

  describe("jsonToBlob", () => {
    it("creates a blob with expected mime type", async () => {
      const json: any = { a: "abc", b: 123 };
      const blob = generalHelpers.jsonToBlob(json);
      expect(blob.type).toBe("application/octet-stream");
      const text: string = await blob.text();
      expect(text).toEqual('{"a":"abc","b":123}');
    });
  });

  describe("jsonToFile", () => {
    it("creates a file with expected mime type", async () => {
      const json: any = { a: "abc", b: 123 };
      const file = generalHelpers.jsonToFile(json, "myFile.abc", "application/octet-stream");
      expect(file.type).toBe("application/octet-stream");
      const text: string = await file.text();
      expect(text).toEqual('{"a":"abc","b":123}');
    });
  });

  describe("jsonToJson", () => {
    it("Makes a unique copy of JSON by stringifying and parsing", () => {
      const json = {
        a: "an innocuous string",
      };
      const jsonCopy = generalHelpers.jsonToJson(json);
      expect(jsonCopy).toEqual(json);
      expect(jsonCopy).not.toBe(json);

      jsonCopy.a = "a different string";
      expect(jsonCopy).not.toEqual(json);
    });
  });

  describe("sanitizeJSONAndReportChanges", () => {
    it("should not report if no property changed", () => {
      const json = {
        a: "an innocuous string",
      };
      const expectedSanitizedJSON = {
        a: "an innocuous string",
      };

      const messages = [] as string[];
      spyOn(console, "warn").and.callFake((message: string) => {
        messages.push(message);
      });
      const sanitizedJSON = generalHelpers.sanitizeJSONAndReportChanges(json);
      expect(sanitizedJSON).toEqual(expectedSanitizedJSON);
      expect(messages.length).toEqual(0);
    });

    it("should report changed property", () => {
      const json = {
        a: '<img src="https://example.com/fake-image.jpg" onerror="alert(1);" />',
      };
      const expectedSanitizedJSON = {
        a: '<img src="https://example.com/fake-image.jpg" />',
      };

      const messages = [] as string[];
      spyOn(console, "warn").and.callFake((message: string) => {
        messages.push(message);
      });
      const sanitizedJSON = generalHelpers.sanitizeJSONAndReportChanges(json);
      expect(sanitizedJSON).toEqual(expectedSanitizedJSON);
      expect(messages.length).toEqual(2);
      expect(messages).toEqual([
        "Changed 1 property",
        '    String difference: "' +
          '<img src="https://example.com/fake-image.jpg" onerror="alert(1);" />' +
          '" vs. "' +
          '<img src="https://example.com/fake-image.jpg" />' +
          '"',
      ]);
    });

    it("should report changed properties", () => {
      const json = {
        a: '<img src="https://example.com/fake-image.jpg" onerror="alert(1);" />',
        b: "<IMG SRC=JaVaScRiPt:alert('XSS')>",
      };
      const expectedSanitizedJSON = {
        a: '<img src="https://example.com/fake-image.jpg" />',
        b: "<img src>",
      };

      const messages = [] as string[];
      spyOn(console, "warn").and.callFake((message: string) => {
        messages.push(message);
      });
      const sanitizedJSON = generalHelpers.sanitizeJSONAndReportChanges(json);
      expect(sanitizedJSON).toEqual(expectedSanitizedJSON);
      expect(messages.length).toEqual(3);
      expect(messages).toEqual([
        "Changed 2 properties",
        '    String difference: "' +
          '<img src="https://example.com/fake-image.jpg" onerror="alert(1);" />' +
          '" vs. "' +
          '<img src="https://example.com/fake-image.jpg" />' +
          '"',
        '    String difference: "' + "<IMG SRC=JaVaScRiPt:alert('XSS')>" + '" vs. "' + "<img src>" + '"',
      ]);
    });
  });

  describe("setCreateProp", () => {
    it("one-item path doesn't exist", () => {
      const obj = {} as any;
      generalHelpers.setCreateProp(obj, "level1", "value");
      expect(obj.level1).not.toBeUndefined();
      expect(obj.level1).toEqual("value");
    });

    it("two-item path doesn't exist", () => {
      const obj = {} as any;
      generalHelpers.setCreateProp(obj, "level1.level2", "value");
      expect(obj.level1).not.toBeUndefined();
      expect(obj.level1.level2).not.toBeUndefined();
      expect(obj.level1.level2).toEqual("value");
    });

    it("three-item path doesn't exist", () => {
      const obj = {} as any;
      generalHelpers.setCreateProp(obj, "level1.level2.level3", "value");
      expect(obj.level1).not.toBeUndefined();
      expect(obj.level1.level2).not.toBeUndefined();
      expect(obj.level1.level2.level3).not.toBeUndefined();
      expect(obj.level1.level2.level3).toEqual("value");
    });

    it("one-item path exists", () => {
      const obj = {
        level1: "placeholder",
      } as any;
      generalHelpers.setCreateProp(obj, "level1", "value");
      expect(obj.level1).not.toBeUndefined();
      expect(obj.level1).toEqual("value");
    });

    it("two-item path exists", () => {
      const obj = {
        level1: {
          level2: "placeholder",
        },
      } as any;
      generalHelpers.setCreateProp(obj, "level1.level2", "value");
      expect(obj.level1).not.toBeUndefined();
      expect(obj.level1.level2).not.toBeUndefined();
      expect(obj.level1.level2).toEqual("value");
    });

    it("three-item path exists", () => {
      const obj = {
        level1: {
          level2: {
            level3: "placeholder",
          },
        },
      } as any;
      generalHelpers.setCreateProp(obj, "level1.level2.level3", "value");
      expect(obj.level1).not.toBeUndefined();
      expect(obj.level1.level2).not.toBeUndefined();
      expect(obj.level1.level2.level3).not.toBeUndefined();
      expect(obj.level1.level2.level3).toEqual("value");
    });

    it("three-item path exists; merges without overwrite", () => {
      const obj = {
        level1: {
          sibling1: 5,
          level2: {
            level3: "placeholder",
            sibling3: 4,
          },
          sibling2: {
            siblingChild: "child",
          },
        },
      } as any;
      const expectedObj = {
        level1: {
          sibling1: 5,
          level2: {
            level3: "value",
            sibling3: 4,
          },
          sibling2: {
            siblingChild: "child",
          },
        },
      } as any;
      generalHelpers.setCreateProp(obj, "level1.level2.level3", "value");
      expect(obj.level1).not.toBeUndefined();
      expect(obj.level1.level2).not.toBeUndefined();
      expect(obj.level1.level2.level3).not.toBeUndefined();
      expect(obj).toEqual(expectedObj);
    });
  });

  describe("_padPositiveNum", () => {
    it("handles numbers wider than minimum width", () => {
      expect(generalHelpers._padPositiveNum(0, 0)).toEqual("0");
      expect(generalHelpers._padPositiveNum(123, 0)).toEqual("123");
    });

    it("handles numbers the same width as the minimum width", () => {
      expect(generalHelpers._padPositiveNum(0, 1)).toEqual("0");
      expect(generalHelpers._padPositiveNum(123, 3)).toEqual("123");
    });

    it("handles numbers narrower than the minimum width", () => {
      expect(generalHelpers._padPositiveNum(0, 10)).toEqual("0000000000");
      expect(generalHelpers._padPositiveNum(123, 10)).toEqual("0000000123");
    });
  });
});
