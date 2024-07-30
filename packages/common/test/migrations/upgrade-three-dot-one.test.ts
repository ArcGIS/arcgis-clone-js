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

import { _upgradeThreeDotOne } from "../../src/migrations/upgrade-three-dot-one";
import { cloneObject, IItemTemplate } from "@esri/hub-common";
import { ISolutionItem } from "../../src/interfaces";
import { ISolutionResource, SolutionResourceType } from "../../src/resources/solution-resource";

describe("Upgrade 3.1 ::", () => {
  const defaultModel = {
    item: {
      type: "Solution",
      typeKeywords: ["Solution", "Template"],
      properties: {
        schemaVersion: 3.0,
      },
    },
    data: {
      metadata: {},
      templates: [
        {
          item: {},
          data: {},
          resources: ["84095a0a06a04d1e9f9b40edb84e277f_jobs/ViewJob_1590513214593.json"],
        },
      ] as IItemTemplate[],
    },
  } as ISolutionItem;

  it("returns same model if above 3", () => {
    const m = cloneObject(defaultModel);
    m.item.properties.schemaVersion = 3.1;
    const chk = _upgradeThreeDotOne(m);
    expect(chk).toEqual(m, "should return the exact same object");
  });

  it("handles missing resource array", () => {
    const m = cloneObject(defaultModel);
    delete (m.data.templates[0] as any).resources;
    const chk = _upgradeThreeDotOne(m);
    expect(chk).withContext("should not return the exact same object").not.toBe(m);
    expect(chk.item.properties.schemaVersion).withContext("should update schema version").toBe(3.1);
    expect(chk.data.templates[0].resources.length).toBe(0);
  });

  it("updates resource structure", () => {
    const m = cloneObject(defaultModel);
    const chk = _upgradeThreeDotOne(m);
    expect(chk).withContext("should not return the exact same object").not.toBe(m);
    expect(chk.item.properties.schemaVersion).withContext("should update schema version").toBe(3.1);
    const tmplRes = chk.data.templates[0].resources[0] as ISolutionResource;
    expect(tmplRes.filename).toBe("ViewJob_1590513214593.json");
    expect(tmplRes.path).toBe("jobs");
    expect(tmplRes.type).toBe(SolutionResourceType.resource);
    expect(tmplRes.sourceUrl).toBe("84095a0a06a04d1e9f9b40edb84e277f_jobs/ViewJob_1590513214593.json");
  });
});
