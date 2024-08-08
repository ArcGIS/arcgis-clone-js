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

/**
 * Provides tests for third-party helper functions.
 */

import * as libConnectors from "../src/libConnectors"; // JSZip, arcgis-html-sanitizer
import * as xssFilterEvasionTestCases from "./XssFilterEvasionTestCases"; // arcgis-html-sanitizer
import { getSampleMetadataAsFile } from "../../common/test/mocks/utils";
import JSZip from "jszip";

//#region JSZip ----------------------------------------------------------------------------------------------------- //

describe("Module `JSZip`: JavaScript-based zip utility", () => {
  describe("createZip", () => {
    it("handles empty file list", async () => {
      const zipfile = await libConnectors.createZip("zipfile", []);
      expect(zipfile.name).withContext("zip created").toEqual("zipfile");
    });

    it("handles one file", async () => {
      const zipfile = await libConnectors.createZip("zipfile", [getSampleMetadataAsFile()]);
      expect(zipfile.name).withContext("zip created").toEqual("zipfile");

      const zip = new JSZip();
      await zip.loadAsync(zipfile);
      expect(zip.folder(/info/).length).withContext("zip does not have folder").toEqual(0);
      expect(zip.file(/metadata/).length)
        .withContext("zip has file")
        .toEqual(1);
    });

    it("handles one file in a folder", async () => {
      const zipfile = await libConnectors.createZip("zipfile", [getSampleMetadataAsFile("metadata")], "info");
      expect(zipfile.name).withContext("zip created").toEqual("zipfile");

      const zip = new JSZip();
      await zip.loadAsync(zipfile);
      expect(zip.folder(/info/).length).withContext("zip has a folder").toEqual(1);
      expect(zip.file(/metadata/).length)
        .withContext("zip has file")
        .toEqual(1);
    });
  });
});

//#endregion ------------------------------------------------------------------------------------------------------------//

//#region arcgis-html-sanitizer ------------------------------------------------------------------------------------- //

describe("Module `arcgis-html-sanitizer`: HTML sanitizing", () => {
  describe("Sanitizer", () => {
    it("sanitizes a string", () => {
      // from https://github.com/esri/arcgis-html-sanitizer
      const sanitized = libConnectors.sanitizeHTML(
        '<img src="https://example.com/fake-image.jpg" onerror="alert(1);" />',
      );
      expect(sanitized).toEqual('<img src="https://example.com/fake-image.jpg" />');
    });

    it("sanitizes a string, supplying a sanitizer", () => {
      // Instantiate a new Sanitizer object
      const sanitizer = new libConnectors.Sanitizer();

      // Sanitize
      // from https://github.com/esri/arcgis-html-sanitizer
      const sanitized = libConnectors.sanitizeHTML(
        '<img src="https://example.com/fake-image.jpg" onerror="alert(1);" />',
        sanitizer,
      );
      expect(sanitized).toEqual('<img src="https://example.com/fake-image.jpg" />');
    });

    it("sanitizes JSON", () => {
      // from https://github.com/esri/arcgis-html-sanitizer
      const sanitized = libConnectors.sanitizeJSON({
        sample: [
          '<img src="https://example.com/fake-image.jpg" onerror="alert(1);\
          " />',
        ],
      });
      expect(sanitized).toEqual({
        sample: ['<img src="https://example.com/fake-image.jpg" />'],
      });
    });

    it("sanitizes JSON, supplying a sanitizer", () => {
      // Instantiate a new Sanitizer object
      const sanitizer = new libConnectors.Sanitizer();

      // Sanitize
      // from https://github.com/esri/arcgis-html-sanitizer
      const sanitized = libConnectors.sanitizeJSON(
        {
          sample: [
            '<img src="https://example.com/fake-image.jpg" onerror="alert(1);\
          " />',
          ],
        },
        sanitizer,
      );
      expect(sanitized).toEqual({
        sample: ['<img src="https://example.com/fake-image.jpg" />'],
      });
    });

    it("handles a missing value", () => {
      const sanitized = libConnectors.sanitizeJSON(null);
      expect(sanitized).toEqual(null);
    });

    it("handles a an empty structure", () => {
      const sanitized = libConnectors.sanitizeJSON({});
      expect(sanitized).toEqual({});
    });

    it("handles a an empty array", () => {
      const sanitized = libConnectors.sanitizeJSON([]);
      expect(sanitized).toEqual([]);
    });

    it("sanitizes an unsupported URL protocol", () => {
      // from https://github.com/esri/arcgis-html-sanitizer
      const sanitized = libConnectors.sanitizeURLProtocol("smb://example.com/path/to/file.html");
      expect(sanitized).toEqual("");
    });

    it("sanitizes a supported URL protocol", () => {
      // from https://github.com/esri/arcgis-html-sanitizer
      const sanitized = libConnectors.sanitizeURLProtocol("https://example.com/about/index.html");
      expect(sanitized).toEqual("https://example.com/about/index.html");
    });

    it("sanitizes a supported URL protocol, supplying a sanitizer", () => {
      // Instantiate a new Sanitizer object
      const sanitizer = new libConnectors.Sanitizer();

      // Sanitize
      // from https://github.com/esri/arcgis-html-sanitizer
      const sanitized = libConnectors.sanitizeURLProtocol("https://example.com/about/index.html", sanitizer);
      expect(sanitized).toEqual("https://example.com/about/index.html");
    });

    it("validates a string containing valid HTML", () => {
      // Check if a string contains invalid HTML
      // from https://github.com/esri/arcgis-html-sanitizer
      const validation = libConnectors.validateHTML('<img src="https://example.com/fake-image.jpg" />');
      expect(validation).toEqual({
        isValid: true,
        sanitized: '<img src="https://example.com/fake-image.jpg" />',
      });
    });

    it("validates a string containing invalid HTML", () => {
      // Check if a string contains invalid HTML
      // from https://github.com/esri/arcgis-html-sanitizer
      const validation = libConnectors.validateHTML(
        '<img src="https://example.com/fake-image.jpg" onerror="alert(1);" />',
      );
      expect(validation).toEqual({
        isValid: false,
        sanitized: '<img src="https://example.com/fake-image.jpg" />',
      });
    });

    it("validates a string, supplying a sanitizer", () => {
      // Instantiate a new Sanitizer object
      const sanitizer = new libConnectors.Sanitizer();

      // Check if a string contains invalid HTML
      // from https://github.com/esri/arcgis-html-sanitizer
      const validation = libConnectors.validateHTML(
        '<img src="https://example.com/fake-image.jpg" onerror="alert(1);" />',
        sanitizer,
      );
      expect(validation).toEqual({
        isValid: false,
        sanitized: '<img src="https://example.com/fake-image.jpg" />',
      });
    });

    it("tests XSS cases", () => {
      const sanitizer = new libConnectors.Sanitizer();

      xssFilterEvasionTestCases.testCases.forEach((testCase: xssFilterEvasionTestCases.IXSSTestCase) => {
        expect(libConnectors.sanitizeHTML(testCase.example, sanitizer))
          .withContext(testCase.label)
          .toEqual(testCase.cleanedHtml);
      });
    });
  });
});

//#endregion ------------------------------------------------------------------------------------------------------------//
