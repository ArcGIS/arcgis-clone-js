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
 * Provides common interfaces.
 */

import {
  IExtent,
  IGetRelatedItemsResponse,
  IGroup,
  IItem,
  IItemRelationshipOptions,
  ISpatialReference,
  UserSession,
} from "./arcgisRestJS";

//#region Re-exports -------------------------------------------------------------------------------------------------//

import JSZip from "jszip";

//#endregion ---------------------------------------------------------------------------------------------------------//

export const SolutionTemplateFormatVersion = 1;
export const DeployedSolutionFormatVersion = 1;
export const UNREACHABLE = "unreachable";

//#region Enums ------------------------------------------------------------------------------------------------------//

/**
 * Flags for storing an item's binary resources.
 */
export enum EFileType {
  Data,
  Info,
  Metadata,
  Resource,
  Thumbnail,
}

/**
 * Text versions of flags for storing an item's binary resources.
 */
export enum SFileType {
  "Data",
  "Info",
  "Metadata",
  "Resource",
  "Thumbnail",
}

/**
 * Flags for reporting the status of creating or deploying an item.
 */
export enum EItemProgressStatus {
  Started,
  Created,
  Cancelled,
  Finished,
  Ignored,
  Failed,
  Unknown,
}

/**
 * Text versions of flags for reporting the status of creating or deploying an item.
 */
export const SItemProgressStatus = [
  "1 Started",
  "2 Created",
  "3 Cancelled",
  "3 Finished",
  "3 Ignored",
  "3 Failed",
  "Unknown",
];

//#endregion ---------------------------------------------------------------------------------------------------------//

//#region Types ------------------------------------------------------------------------------------------------------//

/**
 * Function signature describing internal item-level progress to enable cancellation and rollback in case of failure
 *
 */
export type IItemProgressCallback = (
  /**
   * Id of item
   */
  itemId: string,

  /**
   * Progress status code (e.g., Started, Created,...)
   */
  status: EItemProgressStatus,

  /**
   * Accumulated "costs" of task, which can be divided by the total estimated cost to get percent done
   */
  costUsed: number,

  /**
   * Id of created item, which is supplied when status is EItemProgressStatus.Created or .Finished
   */
  createdItemId?: string,
) => boolean;

/**
 * Function signature describing progress to calling programs
 */
export type ISolutionProgressCallback = (
  /**
   * Percent of total work done
   */
  percentDone: number,

  /**
   * Calling-program-supplied id, perhaps used to distinguish between concurrent deployments or deletions
   */
  jobId?: string,

  /**
   * Packet of supplemental information provided from certain progress states, e.g., Finished deleting an item
   * or deploying a Solution item
   */
  progressEvent?: ISolutionProgressEvent,
) => void;

export type INoArgFunction = () => any;

//#endregion ---------------------------------------------------------------------------------------------------------//

//#region Interfaces -------------------------------------------------------------------------------------------------//

/**
 * Result of creating a unique group
 */
export interface IAddGroupResponse {
  /**
   * Success or failure
   */
  success: boolean;

  /**
   * Id of created group
   */
  group: IGroup;
}

/**
 * Additional info to be used when searching the contents of a group
 */
export interface IAdditionalGroupSearchOptions {
  /**
   * The number of the first entry requested. The index number is 1-based.
   */
  start?: number;

  /**
   * The number of results requested.
   */
  num?: number;

  /**
   * Sets sort field for group items. Values: title | owner | avgrating | numviews | created | modified
   */
  sortField?: string;

  /**
   * Sets sort order for group items. Values: asc | desc
   */
  sortOrder?: string;

  /**
   * The bounding box for a spatial search defined as minx, miny, maxx, or maxy. Spatial search is an
   * overlaps/intersects function of the query bbox and the extent of the document. Documents that have
   * no extent (for example, mxds, 3dds, lyr) will not be found when doing a bbox search. Document extent
   * is assumed to be in the WGS84 geographic coordinate system. E.g.: "-118,32,-116,34"
   */
  bbox?: string;

  /**
   * A list of desired categories; maximum of 8
   */
  categories?: string[];

  /**
   * Generically definines remaining/unused properties
   */
  [key: string]: any;
}

/**
 * Results of fetching and copying a file associated with an item.
 */
export interface IAssociatedFileCopyResults extends IAssociatedFileInfo, ICopyResults {}

/**
 *  Information for working with a file associated with an item.
 */
export interface IAssociatedFileInfo {
  /**
   * Resource's "folder"--the prefix before the filename
   */
  folder: string;

  /**
   * Resource's filename
   */
  filename: string;

  /**
   * An internal classification of the type of file: data, metadata, resource
   */
  type?: EFileType;

  /**
   * The mime type of the file
   */
  mimeType?: string;

  /**
   * URL where a resource, metadata, or thumbnail of an item or group can be found
   */
  url?: string;

  /**
   * File holding a resource, metadata, or thumbnail of an item or group
   */
  file?: File;
}

/**
 * Describes the results of topologically sorting items to be deployed so that dependencies are created before
 * the items that depend on them.
 */
export interface IBuildOrdering {
  /**
   * Item ids in order in which items are to be built.
   */
  buildOrder: string[];

  /**
   * Item ids of dependencies that were not supplied to ordering algorithm.
   */
  missingDependencies: string[];

  /**
   * Dictionary of item ids that need dependency patching; each id has a list of the ids of the dependencies to be patched.
   */
  itemsToBePatched: IKeyedListsOfStrings;
}

/**
 * Holds a complete AGO item.
 */
export interface ICompleteItem {
  /**
   * The "base" information of an item as MIME format text/plain JSON
   */
  base: IItem;

  /**
   * The data section of an item as a file even though it may be JSON
   */
  data: File;

  /**
   * The item's thumbnail as MIME format image/*
   */
  thumbnail: File;

  /**
   * The item's metadata as MIME format application/xml
   */
  metadata: File;

  /**
   * The item's resource files
   */
  resources: File[];

  /**
   * list of forward relationshipType/relatedItems[] pairs
   */
  fwdRelatedItems: IRelatedItems[];

  /**
   * list of reverse relationshipType/relatedItems[] pairs
   */
  revRelatedItems: IRelatedItems[];

  /**
   * Additional feature-service-only info
   */
  featureServiceProperties?: IFeatureServiceProperties;

  /**
   * Additional workflow-only info
   */
  workflowConfiguration?: any;
}

/**
 * Results of fetching and copying an item.
 */
export interface ICopyResults {
  /**
   * Status of fetching item from source
   */
  fetchedFromSource: boolean;

  /**
   * Status of copying item to destination; undefined if fetchedFromSource is false
   */
  copiedToDestination?: boolean;
}

export interface ICreateItemFromTemplateResponse {
  /**
   * Created item
   */
  item?: IItemTemplate;

  /**
   * Item's AGO id
   */
  id: string;

  /**
   * AGO item type name
   */
  type: string;

  /**
   * Does the item need post processing to handle unresolved variables
   */
  postProcess: boolean;
}

/**
 * Options for creating a solution item.
 */
export interface ICreateSolutionOptions {
  /**
   * Information on who has access to this solution.
   */
  accessInformation?: string;

  /**
   * Descriptive categories to identify this item.
   */
  categories?: string[];

  /**
   * Calling-program-supplied id, perhaps used to distinguish between concurrent deployments or deletions;
   * default: id of group used to create Solution
   */
  jobId?: string;

  /**
   * Licensing information
   */
  licenseInfo?: string;

  /**
   * Title to be given to created Solution item; defaults: for a group, group title;
   * for an item, random string from common.createShortId()
   */
  title?: string;

  /**
   * Snippet to be given to created Solution item; defaults: for a group, group snippet; for an item, ""
   */
  snippet?: string;

  /**
   * Description to be given to created Solution item; defaults: for a group, group description; for an item, ""
   */
  description?: string;

  /**
   * Tags to be given to created Solution item; defaults: for a group, group tags; for an item, []
   */
  tags?: string[];

  /**
   * URL to thumbnail to be given to created Solution item, but see `thumbnail` property; default: ""
   */
  thumbnailurl?: string;

  /**
   * Thumbnail file to be given to created Solution item; default: null; has priority over `thumbnailurl`
   */
  thumbnail?: File;

  /**
   * Folder in which to place created Solution item; default is top level
   */
  folderId?: string;

  /**
   * Facts to be used for creating the Solution item; default: \{\}
   */
  templateDictionary?: any;

  /**
   * Should fields be templatized; default: false
   */
  templatizeFields?: boolean;

  /**
   * Additional typeKeywords (beyond always-added ["Solution", "Template"]) to be added to Solution item; default: []
   */
  additionalTypeKeywords?: string[];

  /**
   * Packet of supplemental information provided from certain progress states, e.g., Finished deleting an item
   * or deploying a Solution item
   */
  progressCallback?: ISolutionProgressCallback;

  /**
   * An object that contains schema version, related solutions and other supporting information.
   */
  properties?: any;

  /**
   * Should progress be echoed to the debugging console? default: false
   */
  consoleProgress?: boolean;

  /**
   * Placeholder for ids of items to be placed into Solution. DO NOT USE--it is overwritten by function createSolution
   */
  itemIds?: string[];

  /**
   * Credentials for the organization with the source items; default: solution item authentication
   */
  sourceItemAuthentication?: UserSession;

  /**
   * Groups to be included in solution; it's an alternate to including tags of the form "group.<embeddedGroupId>"
   * in the top-level group.
   */
  subgroupIds?: string[];

  /**
   * A list of keywords for this solution. Also used by the application for internal control of deployment.
   */
  typeKeywords?: string[];
}

/**
 * Result of creating a solution item.
 */
export interface ICreateSolutionResult {
  /**
   * Success or failure
   */
  success: boolean;

  /**
   * Id of created Solution template
   */
  solutionTemplateItemId: string;

  /**
   * When true items with source-itemId type keyword will be reused; default: false
   */
  enableItemReuse?: boolean;
}

/**
 * The relevant elements of a data source that are used for templatization
 */
export interface IDatasourceInfo {
  /**
   * Calculated pattern used for templatization eg. "\{\{itemId.fields.layerId.fieldname\}\}"
   */
  basePath: string;

  /**
   * The portal item id eg. "4efe5f693de34620934787ead6693f19"
   */
  itemId: string;

  /**
   * The id for the layer from the service eg. 0
   */
  layerId: number;

  /**
   * The webmap layer id eg. "TestLayerForDashBoardMap_632"
   */
  id?: string;

  /**
   * The id for the layer from a map could be referenced by more than one map for a solution
   */
  ids: string[];

  /**
   * The url used for fields lookup
   */
  url?: string;

  /**
   * The fields this datasource contains
   */
  fields: any[];

  /**
   * The ralative ids for references to a datasource
   * Application types like dashboard can reference datasources via realtive widget reference ids
   */
  references?: any[];

  /**
   * The details on any relationships that the datasource is involved in
   */
  relationships: any[];

  /**
   * The layers adminLayerInfo
   * Used to fetch relationship info in some cases
   */
  adminLayerInfo: any;
}

/**
 * Options for deleting a deployed solution item and all of the items that were created as part of that deployment
 */
export interface IDeleteSolutionOptions {
  /**
   * Calling-program-supplied id, perhaps used to distinguish between concurrent deployments or deletions;
   * default: id of solution being deleted
   */
  jobId?: string;

  /**
   * Packet of supplemental information provided from certain progress states, e.g., Finished deleting an item
   * or deploying a Solution item
   */
  progressCallback?: ISolutionProgressCallback;

  /**
   * Should progress be echoed to the debugging console? default: false
   */
  consoleProgress?: boolean;
}

/**
 * Storage of dependencies.
 */
export interface IDependency {
  /**
   * Dependency item id for templatization.
   */
  id: string;

  /**
   * Dependency service name for name mapping.
   * This is used to find appropriate source service name for views.
   */
  name: string;
}

/**
 * IDeployFilename extended to include the URL to the stored resource.
 */
export interface IDeployFileCopyPath extends IDeployFilename {
  url: string;
}

/**
 * File type, folder, and filename for deploying an item's binary resource.
 */
export interface IDeployFilename {
  type: EFileType;
  folder: string;
  filename: string;
}

/**
 * Options for deploying a solution item and for creating the solution index item representing the deployment
 */
export interface IDeploySolutionOptions {
  /**
   * Calling-program-supplied id, perhaps used to distinguish between concurrent deployments or deletions;
   * default: id of solution being deployed
   */
  jobId?: string;

  /**
   * Title to be given to deployed Solution item; default: copied from solution item
   */
  title?: string;

  /**
   * Snippet to be given to created Solution item; default: copied from solution item
   */
  snippet?: string;

  /**
   * Description to be given to created Solution item; default: copied from solution item
   */
  description?: string;

  /**
   * Tags to be given to created Solution item; default: copied from solution item
   */
  tags?: string[];

  /**
   * URL to thumbnail to be given to created Solution item, but see `thumbnail` property; default: copied from
   * solution item
   */
  thumbnailurl?: string;

  /**
   * Thumbnail file to be given to created Solution item; default: null; has priority over `thumbnailurl`
   */
  thumbnail?: File;

  /**
   * Facts to be used for creating the Solution item; default: \{\}
   */
  templateDictionary?: any;

  /**
   * Additional typeKeywords (beyond always-added ["Solution", "Deployed"]) to be added to Solution item; default: []
   */
  additionalTypeKeywords?: string[];

  /**
   * When true items with source-itemId type keyword will be reused; default: false
   */
  enableItemReuse?: boolean;

  /**
   * Packet of supplemental information provided from certain progress states, e.g., Finished deleting an item
   * or deploying a Solution item
   */
  progressCallback?: ISolutionProgressCallback;

  /**
   * Should progress be echoed to the debugging console? default: false
   */
  consoleProgress?: boolean;

  /**
   * Credentials for the organization with the source items; default: authentication supplied for deployment destination
   */
  storageAuthentication?: UserSession;

  /**
   * Version of storage read from Solution item. DO NOT USE--it is overwritten by function deploySolutionFromTemplate
   */
  storageVersion?: number;

  /**
   * Determines if the solution item should be created during deployment; default: false
   */
  dontCreateSolutionItem?: boolean;
}

/**
 * Result of deploying a solution item.
 */
export interface IDeploySolutionResult {
  /**
   * Success or failure
   */
  success: boolean;

  /**
   * Id of deployed Solution
   */
  deployedSolutionItemId: string;
}

/**
 * Contains feature-service-specific properties.
 */
export interface IFeatureServiceProperties {
  service: any;
  layers: any[];
  tables: any[];
  workforceInfos?: any;
  contingentValues?: any;
}

/**
 * File folder, filename, and data.
 */
export interface IFile {
  folder: string;
  filename: string;
  blob: Blob;
}

/**
 * Filename, MIME type, and data.
 */
export interface IFileMimeTyped {
  filename: string;
  mimeType: string;
  blob: Blob;
}

/**
 * Existing Items promises, associated item Ids and types
 */
export interface IFindExistingItemsResponse {
  existingItemsDefs: Array<Promise<any>>;
  existingItemInfos: IFindExistingItemInfos[];
}

/**
 * Item Id and item type
 */
export interface IFindExistingItemInfos {
  itemId: string;
  type: string;
}

/**
 * Response from removing a folder.
 */
export interface IFolderStatusResponse {
  /**
   * Success or failure
   */
  success: boolean;

  folder: {
    username: string;
    id: string;
    title: string;
  };
}

/**
 * Undocumented property returned by portal function `getRelatedItems`.
 */
interface IGetRelatedItemsResponseAggregation {
  total: IGetRelatedItemsResponseAggregationTotal;
}

/**
 * Undocumented property returned by portal function `getRelatedItems`.
 */
interface IGetRelatedItemsResponseAggregationTotal {
  /**
   * Number of items returned in this response
   */
  count: number;

  /**
   * Description of `count`, e.g., "total"
   */
  name: string;
}

/**
 * Extension of type to represent actual return from portal function `getRelatedItems`.
 */
export interface IGetRelatedItemsResponseFull extends IGetRelatedItemsResponse {
  /**
   * Undocumented property returned by portal function `getRelatedItems`.
   */
  aggregations: IGetRelatedItemsResponseAggregation;

  /**
   * Property used in conjunction with `start` to request the next batch of related items.
   */
  nextkey: string | null;

  /**
   * Echo of number of related items requested.
   */
  num: number;
}

/**
 * Response from getting the resources of a specified item, extended with paging properties
 */
export interface IGetResourcesResponse {
  /**
   * Total number of responses
   */
  total: number;

  /**
   * Resources
   */
  resources: IResource[];

  /**
   * The number of the first entry requested. The index number is 1-based.
   */
  start: number;

  /**
   * The number of results requested.
   */
  num: number;

  /**
   *  The 1-based index of the start of the next batch of results; value is -1 if there are no more results
   *  to be fetched
   */
  nextStart: number;
}

/**
 * Response from getting the category schema set on a group.
 *
 * @see https://developers.arcgis.com/rest/users-groups-and-items/group-category-schema.htm
 */
export interface IGroupCategorySchema {
  categorySchema: IGroupCategory[];
}

/**
 * Nestable category schema descripion set on a group.
 *
 * @see https://developers.arcgis.com/rest/users-groups-and-items/group-category-schema.htm
 */
export interface IGroupCategory {
  /**
   * Category title
   */
  title: string;

  /**
   * Category description
   */
  description?: string;

  /**
   * Child categories of this category
   */
  categories?: IGroupCategory[];
}

/**
 * Hierarchical arrangement of items and their dependencies.
 */
export interface IHierarchyElement {
  /**
   * Item id
   */
  id: string;

  /**
   * Items that this item depends on
   */
  dependencies: IHierarchyElement[];
}

/**
 * Subset of portal.IItem containing just the properties that are stored in a template--the item's "base" section.
 */
export interface IItemGeneralized {
  /**
   * Item categories
   */
  categories?: string[];

  /**
   * Specifies the locale for which content is returned.
   */
  culture?: string;

  /**
   * Item description
   */
  description?: string;

  /**
   * _Undocumented AGO item property_
   */
  documentation?: string;

  /**
   * An array that defines the bounding rectangle of the item as [[minx, miny], [maxx, maxy]]. Should always be in WGS84.
   */
  extent?: number[][] | string;

  /**
   * The unique ID for this item.
   */
  id: string;

  /**
   * A JSON object that primarily applies to system requirements, Terms and Conditions, version, supported platforms,
   * YouTube video ID, etc., associated with the application.
   */
  properties?: any;

  /**
   *  A short summary description of the item.
   */
  snippet?: string;

  /**
   * The coordinate system of the item.
   */
  spatialReference?: ISpatialReference;

  /**
   * An array of user defined tags that describe the item.
   */
  tags?: string[];

  /**
   * The title of the item. This is the name that's displayed to users and by which they refer to the item.
   */
  title?: string;

  /**
   * The GIS content type of this item. Example types include Web Map, Map Service, Shapefile, and
   * Web Mapping Application.
   */
  type: string;

  /**
   * An array of keywords that further describes the type of this item. Each item is tagged with a set of
   * type keywords that are derived based on its primary type.
   */
  typeKeywords?: string[];

  /**
   * The URL for the resource represented by the item. Applies only to items that represent web-accessible
   * resources such as map services.
   */
  url?: string;

  /**
   * Generically definines remaining/unused properties
   */
  [key: string]: any;
}

/**
 * Extends `IItemRelationshipOptions` for the REST JS `getRelatedItems` call because it doesn't include
 * the new `start` and `num` properties.
 */
export interface IItemRelationshipOptionsPaging extends IItemRelationshipOptions {
  params: {
    /**
     * Relationship direction sought
     */
    direction: "forward" | "reverse";

    /**
     * One-based index of start of next batch to fetch
     */
    start: number;

    /**
     * Number of items requested; maximum value is 100
     */
    num: number;

    /**
     * Key needed by related records search for second and subsequent batches; value comes from previous fetch
     */
    nextkey?: string;
  };
}

/**
 * The templatized form of an item or group.
 */
export interface IItemTemplate {
  /**
   * Item's AGO id
   */
  itemId: string;

  /**
   * AGO item type name
   */
  type: string;

  /**
   * Fairly unique identifier; set to 'i' + chars 2-8 of a random number in base 36
   */
  key: string;

  /**
   * Item base section JSON
   */
  item: IItemGeneralized;

  /**
   * Item data section JSON
   */
  data: any;

  /**
   * References to item resources
   */
  resources: any[];

  /**
   * References to related item
   */
  relatedItems?: IRelatedItems[];

  /**
   * List of ids of AGO items needed by this item
   */
  dependencies: string[];

  /**
   * List of ids of AGO groups the item needs to be shared with
   */
  groups: string[];

  /**
   * Miscellaneous item-specific properties
   */
  properties: any;

  /**
   * Estimated relative cost of deploying this item; corresponds to number of progressCallback
   * function calls made during while deploying it
   */
  estimatedDeploymentCostFactor: number;

  /**
   * Allow for adhoc properties
   */
  [propName: string]: any;
}

/**
 * Function signatures for use in a function lookup array.
 */
export interface IItemTemplateConversions {
  /**
   * Converts an item into a template for use in a Solution.
   */
  convertItemToTemplate(
    itemInfo: any,
    destAuthentication: UserSession,
    srcAuthentication: UserSession,
    templateDictionary?: any,
  ): Promise<IItemTemplate>;

  /**
   * Creates an item using templatized info in a Solution.
   */
  createItemFromTemplate(
    template: IItemTemplate,
    templateDictionary: any,
    destinationAuthentication: UserSession,
    itemProgressCallback: IItemProgressCallback,
  ): Promise<ICreateItemFromTemplateResponse>;
}

/**
 * Structure for mapping from item type to module with type-specific template-handling code
 */
export type moduleHandler = IItemTemplateConversions | undefined | null;

/**
 * Mapping from an AGO item type to the code handling that type.
 */
export interface IItemTypeModuleMap {
  [itemType: string]: moduleHandler;
}

export interface IItemUpdate {
  id: string;
  /**
   * Key-value pair for update parameter.
   * N.B.: Use `data` key for binary data; all other keys are serialized, which zeroes out binary data!
   */
  [key: string]: any;
}

/**
 * Type with key access to lists of strings
 */
export interface IKeyedListsOfStrings {
  [key: string]: string[];
}

/**
 * Type with key access to strings
 */
export interface IKeyedStrings {
  [key: string]: string;
}

/**
 * A simple interface for a key value pair with number as the key
 */
export interface INumberValuePair {
  [key: number]: any;
}

/**
 * Subset of a esri/portal/Portal used by this library.
 */
export interface IPortalSubset {
  /**
   * Name of the organization.
   */
  name: string;

  /**
   * The id of the organization that owns this portal. If null then this is the default portal
   * for anonymous and non-organizational users.
   */
  id: string;

  /**
   * The REST URL for the portal, for example "https://www.arcgis.com/sharing/rest" for ArcGIS Online
   * and "https://www.example.com/arcgis/sharing/rest" for your in-house portal.
   */
  restUrl: string;

  /**
   * The URL to the portal instance.
   */
  portalUrl: string;

  /**
   * The prefix selected by the organization's administrator to be used with the custom base URL for the portal.
   */
  urlKey: string;
}

/**
 * Storage of arguments for post processing functions
 */
export interface IPostProcessArgs {
  /**
   * Status message to show after the layerDefinition is updated.
   */
  message: string;

  /**
   * Key objects to add to the layerDefinition.
   */
  objects: any;

  /**
   * Template of item to be created
   */

  itemTemplate: any;

  /**
   * Credentials for the request
   */
  authentication: UserSession;
}

/**
 * The relevant elements of a data source that are used for templatization
 */
export interface IQuickCaptureDatasource {
  /**
   * The portal item id for the datasource eg. "4efe5f693de34620934787ead6693f19"
   */
  featureServiceItemId: string;

  /**
   * The application item id for the datasource eg. "1d4de1e4-ef58-4e02-9159-7a6e6701cada"
   */
  dataSourceId: string;

  /**
   * The url used for the datasource
   */
  url: number;
}

/**
 * A mapping between a relationship type and the list of item ids using that relationship.
 */
export interface IRelatedItems {
  /**
   * The type of relationship between the two items.
   *
   * @see https://developers.arcgis.com/rest/users-groups-and-items/relationship-types.htm
   */
  relationshipType: string;

  /**
   * Ids of related items
   */
  relatedItemIds: string[];
}

/**
 * Summary of a resource.
 */
export interface IResource {
  /**
   * Name of resource
   */
  resource: string;

  /**
   * The date the resource was created. Shown in UNIX time in milliseconds.
   */
  created: number;

  /**
   * The size of the resource in bytes.
   */
  size: number;
}

/**
 * A solution template AGO item
 */
export interface ISolutionItem {
  /**
   * Item base section JSON
   */
  item: any;

  /**
   * Item data section JSON
   */
  data: ISolutionItemData;

  /**
   * Supplemental information
   */
  properties?: IStringValuePair;

  /**
   * Generically definines remaining/unused properties
   */
  [key: string]: any;
}

/**
 * The data section of a solution item.
 */
export interface ISolutionItemData {
  /**
   * General information about the solution template
   */
  metadata: any;

  /**
   * Supplemental information about the solution, e.g., its default spatial reference
   */
  params?: ISolutionItemDataParams;

  /**
   * The collection of templates
   */
  templates: IItemTemplate[];
}

/**
 * Supplemental information about the solution, e.g., its default spatial reference
 */
export interface ISolutionItemDataParams {
  /**
   * Information about the default spatial reference for a solution item.
   */
  wkid: ISolutionItemDataWkidParams;
}

/**
 * Information about the default spatial reference for a solution item.
 */
export interface ISolutionItemDataWkidParams {
  /**
   * A label for the wkid, e.g., "Spatial Reference".
   */
  label: string;

  /**
   * The default wkid, e.g., "102100"
   */
  default: string;

  /**
   * A value flag, e.g., "spatialReference"
   */
  valueType: string;

  /**
   * Attributes of the default spatial reference for a solution item.
   */
  attributes: ISolutionItemDataWkidAttrsParams;
}

/**
 * Attributes of the default spatial reference for a solution item.
 */
export interface ISolutionItemDataWkidAttrsParams {
  required: string;
}

/**
 * A brief form of an item in a deployed Solution item.
 */
export interface ISolutionItemPrecis {
  /**
   * The unique ID for this item.
   */
  id: string;

  /**
   * The GIS content type of this item. Example types include Web Map, Map Service, Shapefile, and
   * Web Mapping Application.
   */
  type: string;

  /**
   * The title of the item. This is the name that's displayed to users and by which they refer to the item.
   */
  title: string;

  /**
   * The date the item was last modified. Shown in UNIX time in milliseconds.
   */
  modified: number;

  /**
   * The username of the user who owns this item.
   */
  owner: string;
}

/**
 * A brief form of a deployed Solution item.
 */
export interface ISolutionPrecis {
  /**
   * The unique ID for this Solution item.
   */
  id: string;

  /**
   * The title of the item. This is the name that's displayed to users and by which they refer to the item.
   */
  title: string;

  /**
   * Folder containing the deployed Solution
   */
  folder: string;

  /**
   * Items contained in this solution
   */
  items: ISolutionItemPrecis[];

  /**
   * Ids of groups affiliated with this solution
   */
  groups: string[];
}

/**
 * Packet of supplemental information provided via a ISolutionProgressCallback call.
 */
export interface ISolutionProgressEvent {
  /**
   * Tag describing data
   */
  event: string;

  /**
   * Data
   */
  data?: any;
}

/**
 * Information about a resource to be copied into an item.
 */
export interface ISourceFile {
  /**
   * The portal item id, e.g., "4efe5f693de34620934787ead6693f19", that supplies the resource
   */
  itemId: string;

  /**
   * Resource file
   */
  file: File;

  /**
   * Resource's "folder"--the prefix before the filename
   */
  folder: string;

  /**
   * Resource's filename
   */
  filename: string;
}

export type TPossibleSourceFile = ISourceFile | undefined;

/**
 *  Information for storing a resource in a storage item.
 */
export interface ISourceFileCopyPath {
  /**
   * The portal item id, e.g., "4efe5f693de34620934787ead6693f19", that supplies the resource
   */
  itemId: string;

  /**
   * URL where a resource, metadata, or thumbnail of an item or group can be found
   */
  url: string;

  /**
   * Resource's "folder"--the prefix before the filename
   */
  folder: string;

  /**
   * Resource's filename
   */
  filename: string;
}

/**
 * A simple interface for a key value pair with string as the key
 */
export interface IStringValuePair {
  [key: string]: any;
}

/**
 * A common status response from AGO.
 */
export interface IStatusResponse {
  /**
   * Success or failure of request
   */
  success: boolean;

  /**
   * AGO id of item for which request was made
   */
  itemId: string;
}

/**
 * Storage of update info
 */
export interface IUpdate {
  /**
   * URL for the update request
   */
  url: string;

  /**
   * object to update the layers definition
   */
  params: any;

  /**
   * arguments for post processing functions
   */
  args: IPostProcessArgs;
}

/**
 * Survey 123 create API parameters
 */
export interface ISurvey123CreateParams {
  /**
   * Title for the survey Form item & folder
   */
  title: string;

  /**
   * Array of tags for the survey Form item
   */
  tags: string[];

  /**
   * Array of typeKeywords for the survey Form item
   */
  typeKeywords: string[];

  /**
   * Description for the survey Form item
   */
  description: string;

  /**
   * The survey form configuration schema. This defines configurable
   * content like the theme, questions, & header/footer text, etc.
   */
  form: any;

  /**
   * The username from the current session
   */
  username: string;

  /**
   * The token from the current session
   */
  token: string;

  /**
   * The portalUrl for Survey123 to direct API requests to
   */
  portalUrl: string;
}

/**
 * Successful Survey123 create API response
 */
export interface ISurvey123CreateSuccess {
  /**
   * Statically defined, always true for success
   */
  success: true;

  /**
   * Resulting Form item ID
   */
  id: string;

  /**
   * Subset of resulting Form item details
   */
  formItemInfo: {
    /**
     * Resulting Form item typeKeywords
     */
    typeKeywords: string[];

    /**
     * Resulting Form item ownerFolder
     */
    ownerFolder: string;

    /**
     * Resulting Form item access
     */
    access: string;

    /**
     * Resulting Form item owner
     */
    owner: string;
  };
  /**
   * Subset of resulting Feature Service(s) details
   */
  featureService: {
    /**
     * Subset of source Feature Service details
     */
    source: {
      /**
       * Resulting Feature Service item ID
       */
      itemId: string;

      /**
       * Generically definines remaining/unused properties
       */
      [key: string]: any;
    };

    /**
     * Generically definines remaining/unused properties
     */
    [key: string]: any;
  };

  /**
   * Generically definines remaining/unused properties
   */
  [key: string]: any;
}

/**
 * Unsuccessful Survey123 create API response
 */
export interface ISurvey123CreateError {
  /**
   * Statically defined, always false when unsuccessful
   */
  success: false;

  /**
   * Error details
   */
  error: {
    /**
     * HTTP error code
     */
    code: number;

    /**
     * Optional, additional details about the error
     */
    details: string[];

    /**
     * Message describing the error
     */
    message: string;
  };
}

/**
 * Result details for a successful Survey123 create
 * API request
 */
export interface ISurvey123CreateResult {
  formId: string;
  featureServiceId: string;
  folderId: string;
}

/**
 * Result of fetching webmap dependencies
 */
export interface IWebmapDependencies {
  /**
   * Updated list of dependency ids
   */
  dependencies: string[];

  /**
   * Hash from URL to AGO item id
   */
  urlHash: IKeyedStrings;
}

/**
 * Results of sending a zip to an item.
 */
export interface IZipCopyResults extends IZipInfo, ICopyResults {}

/**
 * Information about a zipped file.
 */
export interface IZipInfo {
  /**
   * Zip's filename
   */
  filename: string;

  /**
   * JSZip object
   */
  zip: JSZip;

  /**
   * List of files included in this zip
   */
  filelist: any[];
}

/**
 * Title information for Velocity data.
 */
export interface IVelocityTitle {
  /**
   * The current label for the object
   */
  label: string;

  /**
   * Existing titles that have been used in the org
   */
  titles: string[];
}

/**
 * Key info about Velocity subscription
 */
export interface IVelocityInfo {
  /**
   * The organizations velocity url
   */
  velocityUrl: string;

  /**
   * When true the organizations subscriptionInfo contains Velocity
   */
  hasVelocity: boolean;
}

/**
 * Relative path and string contents of a file in a zip object.
 */
export interface IZipObjectContentItem {
  /**
   * Filename
   */
  file: string;

  /**
   * Contents of file
   */
  content: TZipObjectContent;
}

/**
 * The default spatial reference and extent values from a template item
 */
export interface IDefaultSpatialReferenceAndExtent {
  spatialReference: ISpatialReference;
  extent: IExtent;
}

export type TZipObjectContent = string | Blob | File;

/**
 * Contains an array of templates that should use standard depolyment as well as
 * templates that will leverage some specific handeling for workflow
 */
export interface IPreProcessWorkflowTemplatesResponse {
  deployTemplates: IItemTemplate[];
  workflowManagedTemplates: IItemTemplate[];
}

//#endregion ---------------------------------------------------------------------------------------------------------//
