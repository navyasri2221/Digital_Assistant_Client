import {ENDPOINT} from "../config/endpoints";
import {REST} from ".";
import {CONFIG} from "../config";
import {getSessionKey, getUserId} from "./userService";
import {getNodeInfo} from "../util/nodeInfo";
import TSON from "typescript-json";
import {getAbsoluteOffsets, getFromStore, inArray} from "../util";
import domJSON from "domjson";
import mapClickedElementToHtmlFormElement from "../util/recording-utils/mapClickedElementToHtmlFormElement";
import {UDAConsoleLogger} from "../config/error-log";
import {fetchDomain} from "../util/fetchDomain";
import ReactGA from "react-ga4";

declare global {
  interface Window {
    isRecording: boolean;
    domJSON: any;
  }
}

/**
 * To record each action/event
 * @param request
 * @returns promise
 */

// Record each user click action with session info
export const recordClicks = async (request?: any) => {
  request.sessionid = await getSessionKey();
  const parameters = {
    url: ENDPOINT.Record,
    method: "POST", 
    body: request,
  };
  return REST.apiCal(parameters);
};

/**
 * Updates existing click records with new data.
 * @param request - An object containing the updated data to be recorded, such as the clicked element and its metadata.
 * @returns A promise that resolves when the updated click data has been successfully recorded.
 */
export const updateRecordClicks = async (request?: any) => {
  // Update existing click records with new data
  request.sessionid = await getSessionKey(); // Add current session ID
  const parameters = {
    url: ENDPOINT.UpdateRecord,
    method: "POST",
    body: request, 
  };
  return REST.apiCal(parameters);
};

// Save complete sequence of user actions as a recording
export const recordSequence = async (request?: any) => {
  request.usersessionid = await getUserId(); // Add user ID to request
  const parameters = {
    url: ENDPOINT.RecordSequence,
    method: "POST",
    body: request,
  };
  return REST.apiCal(parameters);
};

// Track individual user clicks with domain info
export const userClick = async (request?: any) => {
  request.usersessionid = await getUserId();
  // Set domain if not provided
  if(!request.domain || request.domain === '') {
    request.domain = window.location.host;
  }
  const parameters = {
    url: ENDPOINT.UserClick,
    method: "PUT",
    body: request,
  };
  return REST.apiCal(parameters);
};

// Save detailed click data including node info and positioning
export const saveClickData = async (node: any, text: string, meta: any) => {
  // Clone node to remove circular references
  const processedNode = await node.cloneNode(true);

  // Convert node to JSON with metadata
  let objectData: any = domJSON.toJSON(processedNode, {serialProperties: true});
  objectData.meta = objectData.meta || meta;

  // Clean up internal tracking attributes
  delete(objectData.node.addedClickRecord);
  delete(objectData.node.hasClick);
  delete(objectData.node.udaIgnoreChildren);
  delete(objectData.node.udaIgnoreClick);

  // Add special node handling for specific elements
  if (inArray(node.nodeName.toLowerCase(), CONFIG.ignoreNodesFromIndexing) !== -1) {
    objectData.meta.displayText = CONFIG.customNameForSpecialNodes[node.nodeName.toLowerCase()];
  }

  // Preserve outer HTML if missing
  if (!objectData.node.outerHTML) {
    objectData.node.outerHTML = node.outerHTML;
  }

  // Add positioning and node info
  objectData.offset = getAbsoluteOffsets(node);
  objectData.node.nodeInfo = getNodeInfo(node);

  // Validate screen size data
  if(objectData.node.nodeInfo && (!objectData.node.nodeInfo.screenSize.screen.width || !objectData.node.nodeInfo.screenSize.screen.height)){
    return false;
  }

  // Add element type detection if enabled
  if(CONFIG.enableNodeTypeChangeSelection) {
    objectData.meta.systemDetected = mapClickedElementToHtmlFormElement(node);
    if (objectData.meta.systemDetected.inputElement !== 'others') {
      objectData.meta.selectedElement = objectData.meta.systemDetected;
    }
  }

  // Log debug info
  UDAConsoleLogger.info(objectData, 3);

  // Prepare final payload
  let domain = window.location.host;
  const jsonString = TSON.stringify(objectData);

 /**  Constructs the final payload object to be sent for recording user click data. The payload includes the following properties:
  - `domain`: The domain of the current window location.
  - `urlpath`: The pathname of the current window location.
  - `clickednodename`: The text content of the clicked node.
  - `html5`: A flag indicating whether the clicked node is an HTML5 element (set to 0 in this case).
  - `clickedpath`: An empty string representing the clicked path (not used in this case).
  - `objectdata`: A stringified JSON representation of the processed node data.**/
  return {
    domain: domain,
    urlpath: window.location.pathname,
    clickednodename: text,
    html5: 0,
    clickedpath: "",
    objectdata: jsonString,
  };
};

// Post complete recording sequence data
export const postRecordSequenceData = async (request: any) => {
  window.udanSelectedNodes = [];
  const userclicknodesSet = getFromStore(CONFIG.RECORDING_SEQUENCE, false);
  const ids = userclicknodesSet.map((item: any) => item.id);
  let domain = fetchDomain();
  
  // Construct payload with sequence metadata
  const payload = {
    ...request,
    domain: domain,
    isIgnored: 0,
    isValid: 1, 
    userclicknodelist: ids.join(","),
    userclicknodesSet,
  };
  return await recordSequence(payload);
};

// Track user click analytics data
export const recordUserClickData = async (clickType='sequencerecord', clickedName='', recordId: number = 0) => {
  const payload = {
    usersessionid: await getSessionKey(),
    clickedname: clickedName,
    clicktype: clickType,
    recordid: recordId,
  };

  // Send event to Google Analytics
  ReactGA.event({
    category: clickType,
    action: clickType,
    label: clickedName,
    value: recordId,
    nonInteraction: true,
    transport: "xhr",
  });

  return await userClick(payload);
};