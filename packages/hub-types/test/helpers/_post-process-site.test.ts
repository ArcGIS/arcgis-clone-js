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
import * as hubCommon from "@esri/hub-common";
import * as hubSites from "@esri/hub-sites";
import * as postProcessSiteModule from "../../src/helpers/_post-process-site";
import * as updateSitePagesModule from "../../src/helpers/_update-site-pages";
import { IUpdateItemResponse } from "../../../common/src/arcgisRestJS";

describe("_postProcessSite :: ", () => {
  let model: hubCommon.IModel;
  let infos: any[];
  beforeEach(() => {
    model = {
      item: {
        id: "3ef",
        properties: {
          collaborationGroupId: "bc1-collab",
          contentGroupId: "bc1-collab",
          chk: "{{bc66.itemId}}",
        },
      },
      data: {
        values: {},
      },
    } as unknown as hubCommon.IModel;
    infos = [
      { id: "ef1", type: "Web Map" },
      { id: "ef2", type: "Web Mapping Application" },
      { id: "ef3", type: "Hub Page" },
      { id: "3ef", type: "Hub Site" },
    ];
  });

  it("shared items to site teams", async () => {
    const fakeRo = {} as hubCommon.IHubUserRequestOptions;
    const shareSpy = spyOn(hubSites, "shareItemsToSiteGroups").and.callFake((m, nfos) => {
      return Promise.all(
        nfos.map((i) => {
          return Promise.resolve({ itemId: i.itemId });
        }),
      );
    });
    const updatePageSpy = spyOn(updateSitePagesModule, "_updateSitePages").and.resolveTo([]);
    const updateSiteSpy = spyOn(hubSites, "updateSite").and.resolveTo({} as IUpdateItemResponse);

    const result = await postProcessSiteModule._postProcessSite(model, infos, { bc66: { itemId: "ef66" } }, fakeRo);
    expect(result).withContext("should return true").toBe(true);
    expect(shareSpy.calls.count()).withContext("should call share fn once").toBe(1);
    expect(shareSpy.calls.argsFor(0)[1].length).withContext("should share three pseudo models").toBe(3);
    expect(updatePageSpy.calls.count()).withContext("should call _updateSitePages").toBe(1);
    expect(updateSiteSpy.calls.count()).withContext("should update the site").toBe(1);
    const updateModel = updateSiteSpy.calls.argsFor(0)[0];
    expect(updateModel.item.properties.chk)
      .withContext("it should do a second pass interpolation before updating")
      .toBe("ef66");
    expect(updateSiteSpy.calls.argsFor(0)[1]).toEqual({
      ...fakeRo,
      allowList: undefined,
    });
  });

  it("excludes site id from children array", async () => {
    const fakeRo = {} as hubCommon.IHubUserRequestOptions;
    spyOn(hubSites, "shareItemsToSiteGroups").and.callFake((m, nfos) => {
      return Promise.all(
        nfos.map((i) => {
          return Promise.resolve({ itemId: i.itemId });
        }),
      );
    });
    spyOn(updateSitePagesModule, "_updateSitePages").and.resolveTo([]);
    const updateSiteSpy = spyOn(hubSites, "updateSite").and.resolveTo({} as IUpdateItemResponse);

    await postProcessSiteModule._postProcessSite(model, infos, { bc66: { itemId: "ef66" } }, fakeRo);
    expect(updateSiteSpy.calls.count()).withContext("should update the site").toBe(1);
    const updateModel = updateSiteSpy.calls.argsFor(0)[0];
    expect(updateModel.item.properties.children)
      .withContext("it should populate children array and exclude site")
      .toEqual(["ef1", "ef2", "ef3"]);
    expect(updateSiteSpy.calls.argsFor(0)[1]).toEqual({
      ...fakeRo,
      allowList: undefined,
    });
  });
});
