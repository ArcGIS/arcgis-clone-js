/** @license
 * Copyright 2024 Esri
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

import * as common from "@esri/solution-common";
import JSZip from "jszip";

/**
 * Relative path and string contents of a file in a zip file.
 */
export interface IZipFileContent {
    file: string;
    content: string;
  }

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Converts a blob to a zip file.
 *
 * @param blob Blob to convert
 * @returns Promise resolving to zip file
 */
export async function blobToZip(
  blob: Blob
): Promise<JSZip> {
  const zip = new JSZip();
  return zip.loadAsync(blob)
  .then(async (zip) => {
    return Promise.resolve(zip);
  })
  .catch(() => {
    return Promise.reject();
  });
}

/**
 * Swizzles the source item id with the destination item id in the form zip file and updates the destination item
 * with the swizzled zip file.
 *
 * @param zipBlob Form zip file as a blob
 * @param sourceItemId Source item id
 * @param destinationItemId Destination item id
 * @returns Promise that resolves to the modified zip file if the swizzle was successful
 */
export async function swizzleFormZipFile(
    zip: JSZip,
    sourceItemId: string,
    destinationItemId: string,
  ): Promise<JSZip> {
    // Get the contents of the files in the zip that contain the source item id
    const extractedZipFiles = await _getZipFileContents(zip, [
      "esriinfo/form.info",
      "esriinfo/form.itemInfo",
      "esriinfo/form.json",
      "esriinfo/form.webform",
      "esriinfo/form.xml"
    ]);

    // Replace source id with new item id
    extractedZipFiles.forEach(
      (file) => {
        const content = file.content.replace(new RegExp(sourceItemId, "g"), destinationItemId);
        zip.file(file.file, content);
      }
    );

    return Promise.resolve(zip);
  }

  /**
   * Swizzles the portal urls in the form.json file.
   *
   * @param zip Zip file that contains the form.json file
   * @param swizzleCallback Function that swizzles the portal urls
   * @returns Promise that resolves to the modified zip file if the swizzle was successful
   */
  export async function swizzlePortalUrlsInFormJson(
    zip: JSZip,
    swizzleCallback: (zipContentStr: string) => string
    ): Promise<JSZip> {
      // Get the contents of the form.json file
      const extractedZipFile = await _getZipFileContents(zip, [
        "esriinfo/form.json"
      ]);

      // Templatize the webhook section
      const content = swizzleCallback(extractedZipFile[0].content);

      // Update the form.json file
      zip.file(extractedZipFile[0].file, content);

      return Promise.resolve(zip);
    }

  /**
   * Updates an item with a zip file.
   *
   * @param zip Zip file with which to update the item
   * @param destinationItemId Destination item id
   * @param destinationAuthentication Destination authentication
   * @returns Promise that resolves to the update item response
   */
  export async function updateItemWithZip(
    zip: JSZip,
    destinationItemId: string,
    destinationAuthentication: common.UserSession,
  ): Promise<common.IUpdateItemResponse> {
    const update: common.IItemUpdate = {
      id: destinationItemId,
      data: common.createMimeTypedFile({
        blob: await zip.generateAsync({ type: "blob" }),
        filename: `${destinationItemId}.zip`,
        mimeType: "application/zip"
      })
    };

    return common.updateItem(
      update,
      destinationAuthentication
    );
  }

// ------------------------------------------------------------------------------------------------------------------ //

  /**
   * Gets the contents of the files in the zip.
   *
   * @param zip Zip file
   * @returns Promise that resolves to an array of objects containing the file name and contents
   */
  export async function _getZipFileContents(
    zip: JSZip,
    filesOfInterest: string[] = []
  ): Promise<IZipFileContent[]> {
    const extractedZipFiles: IZipFileContent[] = [];
    const fileContentsRetrievalPromises: Array<Promise<string>> = [];
    zip.forEach(
      (relativePath, file) => {
        const getContents = async () => {
          if (filesOfInterest.length === 0 || filesOfInterest.includes(relativePath)) {
            const fileContentsFetch = file.async('string');
            fileContentsRetrievalPromises.push(fileContentsFetch);
            extractedZipFiles.push({
              file: relativePath,
              content: await fileContentsFetch
            });
          }
        };
        void getContents();
      }
    );
    await Promise.all(fileContentsRetrievalPromises);
    return extractedZipFiles;
  }
