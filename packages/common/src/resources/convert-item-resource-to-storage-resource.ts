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

import { SolutionResourceType } from "./solution-resource";

/**
 * Generates a folder and filename for storing a copy of an item's resource in a storage item.
 *
 * @param prefix Base prefix for resource
 * @param sourceResourceFilename Either filename or folder/filename to resource
 * @param storageVersion Version of the Solution template
 * @param storageFileType Optional argument that when supplied will control the how the prefix is created
 * @returns Folder and filename for storage; folder is the itemID plus ("_" + storageFolder) if storageFolder
 * exists plus ("_" + part of sourceResourceFilename before "/" if that separator exists);
 * file is sourceResourceFilename
 * @see convertStorageResourceToItemResource
 */
export function convertItemResourceToStorageResource(
  prefix: string,
  sourceResourceFilename: string,
  storageVersion = 0,
  storageFileType?: SolutionResourceType,
): {
  folder: string;
  filename: string;
} {
  /* istanbul ignore else */
  if (storageFileType !== undefined) {
    switch (storageFileType) {
      case SolutionResourceType.data:
        prefix = `${prefix}_info_data`;
        break;
      case SolutionResourceType.fakezip:
        prefix = `${prefix}_info_dataz`;
        break;
      case SolutionResourceType.info:
        prefix = `${prefix}_info`;
        break;
      case SolutionResourceType.metadata:
        prefix = `${prefix}_info_metadata`;
        break;
      case SolutionResourceType.thumbnail:
        prefix = `${prefix}_info_thumbnail`;
        break;
    }
  }

  let folder = prefix;
  let filename = sourceResourceFilename;
  const iLastSlash = filename.lastIndexOf("/");
  if (iLastSlash >= 0) {
    let subpath = filename.substr(0, iLastSlash);
    if (storageVersion === 0) {
      subpath = subpath.replace("/", "_");
      folder += "_" + subpath;
    } else {
      folder += "/" + subpath;
    }
    filename = filename.substr(iLastSlash + 1);
  }

  return { folder, filename };
}
