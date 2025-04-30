/**
 * @fileoverview Tooltip management module for the Digital Assistant Client.
 *
 * This module provides functionality to create, position, update, and remove tooltips
 * that guide users through application workflows. The tooltips are used to provide
 * contextual help and navigation assistance during automated workflows and tutorials.
 *
 * The module uses PopperJS for positioning tooltips relative to target elements, with
 * automatic positioning to ensure visibility within the viewport. It also handles user
 * interactions with tooltip controls like continue and exit buttons.
 *
 * Key features:
 * - Dynamic tooltip creation and positioning
 * - Support for custom messages from recorded data
 * - Automatic scrolling to ensure target elements are visible
 * - Position adjustment via arrow controls
 * - Integration with the application's event system
 * - Support for automated focus and click actions
 */

import {translate} from "./translation";
import {createPopperLite as createPopper} from "@popperjs/core";
import {trigger, on} from "./events";
import {CONFIG} from "../config";
import {getToolTipElement} from "./getToolTipElement";
import {getTooltipPositionClass} from "./getTooltipPositionClass";

// Store popper instance globally to update it
let currentPopperInstance = null;
let currentTooltipNode = null;
let currentTooltipDivElement = null;
let currentToolTipPositionClass = null;
let currentAvailablePositions = [];

/**
 * Adds a tooltip to a target element with customizable behavior and appearance.
 *
 * This function creates a tooltip attached to the specified target element, with
 * optional custom message and behavior. The tooltip can be configured to trigger
 * actions like focusing or clicking elements, and can display navigation controls.
 *
 * @param {HTMLElement} invokingNode - The node that triggered the tooltip (usually a button or link)
 * @param {HTMLElement} tooltipNode - The node to attach the tooltip to (target element)
 * @param {Object} [recordedData=null] - Optional data from a recorded session that may contain tooltip info
 * @param {Object} [navigationCookieData] - Optional navigation data from cookies
 * @param {boolean} [enableClick=false] - Whether to automatically click the invoking node after tooltip display
 * @param {boolean} [enableFocus=false] - Whether to automatically focus the invoking node after tooltip display
 * @param {boolean} [enableAnimate=false] - Whether to animate the tooltip appearance
 * @param {string} [message=translate('tooltipMessage')] - The message to display in the tooltip
 * @param {boolean} [showButtons=true] - Whether to show control buttons in the tooltip
 * @param {boolean} [isNavigating=false] - Whether the tooltip is part of a navigation sequence
 * @returns {void}
 *
 * @example
 * // Basic usage with default settings
 * addToolTip(buttonElement, targetElement);
 *
 * // With custom message and auto-click
 * addToolTip(buttonElement, targetElement, null, null, true, false, false, "Click this button");
 *
 * // With recorded data containing custom tooltip info
 * addToolTip(buttonElement, targetElement, recordedData);
 */
export const addToolTip = (invokingNode, tooltipNode, recordedData = null, navigationCookieData, enableClick = false, enableFocus = false, enableAnimate = false, message = translate('tooltipMessage'), showButtons = true, isNavigating=false) => {

  if (recordedData !== null) {
    let recordedNodeData = JSON.parse(recordedData.objectdata);
    if (recordedNodeData.hasOwnProperty('meta') && recordedNodeData.meta.hasOwnProperty('tooltipInfo') && recordedNodeData.meta.tooltipInfo != '') {
      message = recordedNodeData.meta.tooltipInfo;
    } else if(recordedNodeData.hasOwnProperty('meta') && recordedNodeData.meta.hasOwnProperty('selectedElement') && recordedNodeData.meta.selectedElement && recordedNodeData.meta.selectedElement==='highlight'){
      message = translate('highLightTextElement');
    }
  }

  //add scrolltop functionality
  tooltipNode.scrollIntoView({behavior: 'smooth', block: "center", inline: "center"});

  const tooltipDivElement = getToolTipElement(message, showButtons);

  // Store references for later updates
  currentTooltipNode = tooltipNode;
  currentTooltipDivElement = tooltipDivElement;

  /**
   * calculating node position from here
   */
  let {finalCssClass, availablePositions} = getTooltipPositionClass(tooltipNode, tooltipDivElement);
  currentToolTipPositionClass = finalCssClass;
  currentAvailablePositions = availablePositions;

  currentPopperInstance = createPopper(tooltipNode, tooltipDivElement, {
    placement: currentToolTipPositionClass,
    modifiers: [
      {
        name: 'popperOffsets',
        enabled: true,
        phase: 'main',
        options: {
          offset: ({placement, reference, popper}) => [0, 30],
        }
      },
      {
        name: 'offset',
        options: {
          offset: [0, 12],
        },
      },
      {
        name: 'arrow',
        options: {
          padding: 5,
          element: '[data-popper-arrow]',
        },
      },
      {
        name: 'preventOverflow',
        options: {
          boundary: 'viewport',
          padding: 10,
        },
      }
    ],
  });

  // Listen for position change events
  on("ChangeTooltipPosition", (event) => {
    console.log(event.detail);
    if (currentPopperInstance && event.detail && event.detail.position) {
      updateTooltipPosition(event.detail.position);
    }
  });

  if(showButtons) {
    const shadowRoot = document.getElementById('udan-react-root').shadowRoot;
    //attach event to continue button in tooltip
    shadowRoot
        .getElementById("uda-autoplay-continue")
        ?.addEventListener("click", () => {
          removeToolTip();
          trigger("ContinuePlay", {action: 'ContinuePlay'});
        });

    //attach event to close tooltip
    shadowRoot
        .getElementById("uda-autoplay-exit")
        ?.addEventListener("click", () => {
          removeToolTip();
          trigger("BackToSearchResults", {action: 'BackToSearchResults'});
        });

    setTimeout(function () {
      if (enableFocus) {
        invokingNode.focus();
      }
      if (enableClick) {
        invokingNode.click();
      }
    }, CONFIG.DEBOUNCE_INTERVAL);
  }
}

/**
 * Updates tooltip position based on arrow button selection or viewport changes.
 *
 * This function changes the position of an existing tooltip to one of the standard
 * positions (top, right, bottom, left). It recalculates available positions and
 * updates the popper instance to reflect the new position.
 *
 * @param {string} position - The desired position ('top', 'right', 'bottom', or 'left')
 * @returns {void}
 *
 * @example
 * // Change tooltip position to bottom
 * updateTooltipPosition('bottom');
 *
 * // This might be called in response to a UI event
 * arrowButton.addEventListener('click', () => updateTooltipPosition('right'));
 */
export const updateTooltipPosition = (position: string) => {
  if (!currentPopperInstance) return;

  let {finalCssClass, availablePositions} = getTooltipPositionClass(currentTooltipDivElement, currentTooltipDivElement, position, currentToolTipPositionClass, currentAvailablePositions);
  currentToolTipPositionClass = finalCssClass;

  // Update the placement option
  currentPopperInstance.setOptions((options) => ({
    ...options,
    placement: currentToolTipPositionClass,
  }));

  // Force update to apply changes immediately
  currentPopperInstance.update();
};

/**
 * Removes the tooltip element from the DOM and cleans up resources.
 *
 * This function removes the current tooltip from the DOM, resets all global
 * references to tooltip elements, and cleans up resources. It should be called
 * when a tooltip is no longer needed, such as when a user completes an action
 * or navigates away.
 *
 * @returns {void}
 *
 * @example
 * // Remove the current tooltip
 * removeToolTip();
 *
 * // Often called in response to user actions
 * continueButton.addEventListener('click', () => {
 *   removeToolTip();
 *   // Continue with workflow...
 * });
 */
export const removeToolTip = () => {
  // Reset the global references
  currentPopperInstance = null;
  currentTooltipNode = null;
  currentTooltipDivElement = null;

  const shadowRoot = document.getElementById('udan-react-root').shadowRoot;
  const toolTipExists = shadowRoot.getElementById("uda-tooltip");
  if (toolTipExists) {
    shadowRoot.removeChild(toolTipExists);
  }
};