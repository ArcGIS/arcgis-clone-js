/** @license
 * Copyright 2020 Esri
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
import { postProcess } from "../../src/helpers/post-process";
import { HubSiteProcessor } from "@esri/solution-hub-types";
import * as portalHelper from "@esri/arcgis-rest-portal";
import * as shareHelper from "../../src/helpers/share-templates-to-groups";
import * as testUtils from "@esri/solution-common/test/mocks/utils";
import {
  ArcGISIdentityManager,
  IItemTemplate,
  ICreateItemFromTemplateResponse
} from "@esri/solution-common";

let MOCK_USER_SESSION: ArcGISIdentityManager;
describe("postProcess Module", () => {
  const tmpls = [] as IItemTemplate[];
  const tmplDict = {};
  beforeEach(() => {
    MOCK_USER_SESSION = testUtils.createRuntimeMockUserSession();
  });
  it("delegates to type specific processor", () => {
    const siteProcessorSpy = spyOn(
      HubSiteProcessor,
      "postProcess"
    ).and.resolveTo();

    const relationshipSpy = spyOn(
      portalHelper,
      "addItemRelationship"
    ).and.resolveTo();

    const shareSpy = spyOn(
      shareHelper,
      "shareTemplatesToGroups"
    ).and.resolveTo();

    const sols = [
      {
        item: null as IItemTemplate,
        id: "bc3",
        type: "Hub Site Application",
        postProcess: true
      }
    ] as ICreateItemFromTemplateResponse[];

    const solnId = "abc";
    return postProcess(solnId, tmpls, sols, MOCK_USER_SESSION, tmplDict).then(
      resp => {
        expect(relationshipSpy.calls.count()).toBe(
          1,
          "should call the addItemRelationship"
        );
        expect(shareSpy.calls.count()).toBe(1, "should call the shareHelper");
        expect(resp.length).toBe(3, "should return two promises");
        expect(siteProcessorSpy.calls.count()).toBe(
          1,
          "should delegate to item type processor"
        );
        const args = siteProcessorSpy.calls.argsFor(0) as any[];
        expect(args[0]).toBe("bc3");
        expect(args[1]).toBe("Hub Site Application");
        expect(args[2]).toBe(sols, "should pass solutions through");
        expect(args[3]).toBeUndefined();
        expect(args[4]).toEqual([]);
        expect(args[5]).toBe(
          tmplDict,
          "should pass template dictionary through"
        );
        expect(args[6]).toBe(MOCK_USER_SESSION, "should pass auth through");
      }
    );
  });
  it("only processes multiple solutions with postProcess true", () => {
    const siteProcessorSpy = spyOn(
      HubSiteProcessor,
      "postProcess"
    ).and.resolveTo();

    const relationshipSpy = spyOn(
      portalHelper,
      "addItemRelationship"
    ).and.resolveTo();

    const shareSpy = spyOn(
      shareHelper,
      "shareTemplatesToGroups"
    ).and.resolveTo();
    const sols = [
      {
        item: null as IItemTemplate,
        id: "bc3",
        type: "Hub Site Application",
        postProcess: true
      },
      {
        item: null as IItemTemplate,
        id: "bc4",
        type: "Hub Site Application",
        postProcess: true
      }
    ] as ICreateItemFromTemplateResponse[];

    const solnId = "abc";
    return postProcess(solnId, tmpls, sols, MOCK_USER_SESSION, tmplDict).then(
      resp => {
        expect(relationshipSpy.calls.count()).toBe(
          2,
          "should call the addItemRelationship"
        );
        expect(shareSpy.calls.count()).toBe(1, "should call the shareHelper");
        expect(resp.length).toBe(5, "should return three promises");
        expect(siteProcessorSpy.calls.count()).toBe(
          2,
          "should call postProcess twice"
        );
      }
    );
  });
  it("only processes solutions with postProcess true", () => {
    const siteProcessorSpy = spyOn(
      HubSiteProcessor,
      "postProcess"
    ).and.resolveTo();

    const relationshipSpy = spyOn(
      portalHelper,
      "addItemRelationship"
    ).and.resolveTo();

    const shareSpy = spyOn(
      shareHelper,
      "shareTemplatesToGroups"
    ).and.resolveTo();
    const sols = [
      {
        item: null as IItemTemplate,
        id: "bc3",
        type: "Hub Site Application",
        postProcess: true
      },
      {
        item: null as IItemTemplate,
        id: "bc4",
        type: "Hub Site Application",
        postProcess: false
      }
    ] as ICreateItemFromTemplateResponse[];

    const solnId = "abc";
    return postProcess(solnId, tmpls, sols, MOCK_USER_SESSION, tmplDict).then(
      resp => {
        expect(relationshipSpy.calls.count()).toBe(
          2,
          "should call the addItemRelationship"
        );
        expect(shareSpy.calls.count()).toBe(1, "should call the shareHelper");
        expect(resp.length).toBe(4, "should return two promises");
        expect(siteProcessorSpy.calls.count()).toBe(
          1,
          "should call postProcess once"
        );
      }
    );
  });

  it("it skips undefined itemHandlers", () => {
    const sols = [
      {
        item: null as IItemTemplate,
        id: "bc3",
        type: "Death Star",
        postProcess: true
      }
    ] as ICreateItemFromTemplateResponse[];

    const relationshipSpy = spyOn(
      portalHelper,
      "addItemRelationship"
    ).and.resolveTo();

    const shareSpy = spyOn(
      shareHelper,
      "shareTemplatesToGroups"
    ).and.resolveTo();

    const solnId = "abc";
    return postProcess(solnId, tmpls, sols, MOCK_USER_SESSION, tmplDict).then(
      resp => {
        expect(relationshipSpy.calls.count()).toBe(
          1,
          "should call the addItemRelationship"
        );
        expect(shareSpy.calls.count()).toBe(1, "should call the shareHelper");
        expect(resp.length).toBe(2, "should only delegate to group sharing");
      }
    );
  });
});
