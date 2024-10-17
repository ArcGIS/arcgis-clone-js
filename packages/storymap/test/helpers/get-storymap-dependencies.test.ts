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

import { getStoryMapDependencies } from "../../src/helpers/get-storymap-dependencies";
import { IModel } from "@esri/hub-common";
import { IItem } from "../../../common/src/arcgisRestJS";

describe("get-storymap-dependencies", () => {
  it("should extract webmaps from resources", () => {
    const m = {
      item: {
        id: "3ef",
        owner: "steve",
      } as IItem,
      data: {
        resources: {
          "foo": { type: "bar" },
          "r-bc4-123144": { type: "webmap", data: { itemId: "bc7" } },
        },
      },
    } as IModel;

    const chk = getStoryMapDependencies(m);
    expect(Array.isArray(chk)).withContext("should return an array").toBe(true);
    expect(chk.length).withContext("should return the should only return the webmap").toBe(1);
    expect(chk[0]).withContext("should return the id of the").toBe("bc7");
  });

  it("handles undefined resource hash", () => {
    const m = {
      item: {
        id: "3ef",
        owner: "steve",
      } as IItem,
      data: {},
    } as IModel;

    const chk = getStoryMapDependencies(m);
    expect(Array.isArray(chk)).withContext("should return an array").toBe(true);
    expect(chk.length).withContext("should return tno resources").toBe(0);
  });
});
