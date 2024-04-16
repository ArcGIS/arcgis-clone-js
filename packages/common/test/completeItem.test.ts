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
 * Provides tests for fetch functions involving the arcgis-rest-js library.
 */

import * as completeItem from "../src/completeItem";
import * as interfaces from "../src/interfaces";
import * as restHelpersGet from "../src/restHelpersGet";
import * as restHelpers from "../src/restHelpers";
import * as workflowHelpers from "../src/workflowHelpers";
import * as zipUtils from "../src/zip-utils";

import * as utils from "./mocks/utils";
import * as mockItems from "../test/mocks/agolItems";

// ------------------------------------------------------------------------------------------------------------------ //

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000; // default is 5000 ms

let MOCK_USER_SESSION: interfaces.UserSession;

beforeEach(() => {
  MOCK_USER_SESSION = utils.createRuntimeMockUserSession();
});

// ------------------------------------------------------------------------------------------------------------------ //

describe("Module `completeItem`: functions for accessing a complete item", () => {
  describe("getCompleteItem", () => {
    it("should get an item", done => {
      const itemId = "abc";

      spyOn(restHelpers, "getFeatureServiceProperties").and.resolveTo({} as interfaces.IFeatureServiceProperties);
      spyOn(restHelpersGet, "getItemBase").and.resolveTo(mockItems.getAGOLItem("Web Mapping Application"));
      spyOn(restHelpersGet, "getItemDataAsFile").and.resolveTo(mockItems.getAGOLItemData("Web Mapping Application"));
      spyOn(restHelpersGet, "getItemMetadataAsFile").and.resolveTo(utils.getSampleMetadataAsFile());
      spyOn(restHelpersGet, "getItemRelatedItemsInSameDirection").and.resolveTo([] as interfaces.IRelatedItems[]);
      spyOn(restHelpersGet, "getItemResourcesFiles").and.resolveTo([] as File[]);
      spyOn(restHelpersGet, "getItemThumbnailAsFile").and.resolveTo(utils.getSampleImageAsFile());
      spyOn(restHelpersGet, "getUser").and.resolveTo({ orgId: "abcdefghij" } as any);

      completeItem
        .getCompleteItem(itemId, MOCK_USER_SESSION)
        .then((item: interfaces.ICompleteItem) => {
          // base: IItem; text/plain JSON
          // data: File; */*
          // thumbnail: File; image/*
          // metadata: File; application/xml
          // resources: File[]; list of */*
          // fwdRelatedItems: IRelatedItems[]; list of forward relationshipType/relatedItems[] pairs
          // revRelatedItems: IRelatedItems[]; list of reverse relationshipType/relatedItems[] pairs
          expect(item).not.toBeNull();
          expect(item.base.id).toEqual("wma1234567890");
          expect((item.data as any).source).toEqual("tpl1234567890");
          expect(item.thumbnail.name).toEqual("sampleImage");
          expect(item.metadata.name).toEqual("metadata.xml");
          done();
        });
    });

    it("should get a feature service item", done => {
      const itemId = "abc";

      spyOn(restHelpers, "getFeatureServiceProperties").and.resolveTo({} as interfaces.IFeatureServiceProperties);
      spyOn(restHelpersGet, "getItemBase").and.resolveTo(mockItems.getAGOLItem("Feature Service"));
      spyOn(restHelpersGet, "getItemDataAsFile").and.resolveTo(mockItems.getAGOLItemData("Feature Service"));
      spyOn(restHelpersGet, "getItemMetadataAsFile").and.resolveTo(utils.getSampleMetadataAsFile());
      spyOn(restHelpersGet, "getItemRelatedItemsInSameDirection").and.resolveTo([] as interfaces.IRelatedItems[]);
      spyOn(restHelpersGet, "getItemResourcesFiles").and.resolveTo([] as File[]);
      spyOn(restHelpersGet, "getItemThumbnailAsFile").and.resolveTo(utils.getSampleImageAsFile());
      spyOn(restHelpersGet, "getUser").and.resolveTo({ orgId: "abcdefghij" } as any);

      completeItem
        .getCompleteItem(itemId, MOCK_USER_SESSION)
        .then((item: interfaces.ICompleteItem) => {
          // base: IItem; text/plain JSON
          // data: File; */*
          // thumbnail: File; image/*
          // metadata: File; application/xml
          // resources: File[]; list of */*
          // fwdRelatedItems: IRelatedItems[]; list of forward relationshipType/relatedItems[] pairs
          // revRelatedItems: IRelatedItems[]; list of reverse relationshipType/relatedItems[] pairs
          // featureServiceProperties?: IFeatureServiceProperties (only if item is a feature service)
          expect(item).not.toBeNull();
          expect(item.base.id).toEqual("svc1234567890");
          expect((item.data as any).layers[0].id).toEqual(0);
          expect((item.data as any).tables[0].id).toEqual(1);
          expect(item.thumbnail.name).toEqual("sampleImage");
          expect(item.metadata.name).toEqual("metadata.xml");
          done();
        });
    });

    it("should get a workflow item", done => {
      const itemId = "abc";

      spyOn(restHelpers, "getWorkflowConfigurationZip").and.returnValue(zipUtils.jsonToZipFile("jobConfig.json", {"jobTemplates": "abc" }, "config"));
      spyOn(restHelpersGet, "getItemBase").and.resolveTo(mockItems.getAGOLItem("Workflow"));
      spyOn(restHelpersGet, "getItemDataAsFile").and.resolveTo(mockItems.getAGOLItemData("Workflow"));
      spyOn(restHelpersGet, "getItemMetadataAsFile").and.resolveTo(utils.getSampleMetadataAsFile());
      spyOn(restHelpersGet, "getItemRelatedItemsInSameDirection").and.resolveTo([] as interfaces.IRelatedItems[]);
      spyOn(restHelpersGet, "getItemResourcesFiles").and.resolveTo([] as File[]);
      spyOn(restHelpersGet, "getItemThumbnailAsFile").and.resolveTo(utils.getSampleImageAsFile());
      spyOn(restHelpersGet, "getUser").and.resolveTo({ orgId: "abcdefghij" } as any);
      spyOn(workflowHelpers, "extractWorkflowFromZipFile").and.resolveTo({ "jobTemplates": "abc" } as any);

      completeItem
        .getCompleteItem(itemId, MOCK_USER_SESSION)
        .then((item: interfaces.ICompleteItem) => {
          // base: IItem; text/plain JSON
          // data: File; */*
          // thumbnail: File; image/*
          // metadata: File; application/xml
          // resources: File[]; list of */*
          // fwdRelatedItems: IRelatedItems[]; list of forward relationshipType/relatedItems[] pairs
          // revRelatedItems: IRelatedItems[]; list of reverse relationshipType/relatedItems[] pairs
          // featureServiceProperties?: IFeatureServiceProperties (only if item is a feature service)
          expect(item).not.toBeNull();
          expect(item.base.id).toEqual("wfw1234567890");
          expect(item.thumbnail.name).toEqual("sampleImage");
          expect(item.metadata.name).toEqual("metadata.xml");
          done();
        });
    });

    it("should handle failure to get an item", done => {
      const itemId = "abc";

      spyOn(restHelpers, "getFeatureServiceProperties").and.resolveTo({} as interfaces.IFeatureServiceProperties);
      spyOn(restHelpersGet, "getItemBase").and.rejectWith(mockItems.get400Failure());
      spyOn(restHelpersGet, "getItemDataAsFile").and.rejectWith(mockItems.get400Failure());
      spyOn(restHelpersGet, "getItemMetadataAsFile").and.resolveTo(utils.getSampleMetadataAsFile());
      spyOn(restHelpersGet, "getItemRelatedItemsInSameDirection").and.resolveTo([] as interfaces.IRelatedItems[]);
      spyOn(restHelpersGet, "getItemResourcesFiles").and.resolveTo([] as File[]);
      spyOn(restHelpersGet, "getItemThumbnailAsFile").and.resolveTo(mockItems.get400Failure());
      spyOn(restHelpersGet, "getUser").and.resolveTo({ orgId: "abcdefghij" } as any);

      completeItem.getCompleteItem(itemId, MOCK_USER_SESSION).then(
        () => done.fail(),
        error => {
          expect(error.error.code).toEqual(400);
          done();
        }
      );
    });
  });
});

// ------------------------------------------------------------------------------------------------------------------ //
