import { addToolTip, removeToolTip, updateTooltipPosition } from '../util/addToolTip';
import { translate } from '../util/translation';
import { createPopperLite as createPopper } from '@popperjs/core';
import { trigger, on } from '../util/events';
import { CONFIG } from '../config';
import { getToolTipElement } from '../util/getToolTipElement';
import { getTooltipPositionClass } from '../util/getTooltipPositionClass';

// Mock dependencies
jest.mock('@popperjs/core', () => ({
    createPopperLite: jest.fn().mockReturnValue({
        setOptions: jest.fn().mockReturnThis(),
        update: jest.fn()
    })
}));

jest.mock('../util/translation', () => ({
    translate: jest.fn(key => key === 'tooltipMessage' ? 'Default tooltip message' :
        key === 'highLightTextElement' ? 'Highlight text element' : key)
}));

jest.mock('../util/events', () => ({
    trigger: jest.fn(),
    on: jest.fn()
}));

jest.mock('../util/getToolTipElement', () => ({
    getToolTipElement: jest.fn().mockReturnValue({
        id: 'uda-tooltip',
        classList: {
            add: jest.fn()
        }
    })
}));

jest.mock('../util/getTooltipPositionClass', () => ({
    getTooltipPositionClass: jest.fn().mockReturnValue({
        finalCssClass: 'top',
        availablePositions: ['top', 'bottom', 'left', 'right']
    })
}));

describe('addToolTip', () => {
    let mockInvokingNode;
    let mockTooltipNode;
    let mockShadowRoot;
    let mockContinueButton;
    let mockExitButton;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock DOM elements
        mockInvokingNode = {
            focus: jest.fn(),
            click: jest.fn()
        };

        mockTooltipNode = {
            scrollIntoView: jest.fn()
        };

        mockContinueButton = {
            addEventListener: jest.fn()
        };

        mockExitButton = {
            addEventListener: jest.fn()
        };

        // Mock shadow root
        mockShadowRoot = {
            getElementById: jest.fn(id => {
                if (id === 'uda-autoplay-continue') return mockContinueButton;
                if (id === 'uda-autoplay-exit') return mockExitButton;
                if (id === 'uda-tooltip') return { id: 'uda-tooltip' };
                return null;
            }),
            removeChild: jest.fn()
        };

        // Mock document.getElementById
        document.getElementById = jest.fn().mockReturnValue({
            shadowRoot: mockShadowRoot
        });

        // Set default CONFIG value
        CONFIG.DEBOUNCE_INTERVAL = 100;
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('should add tooltip with default parameters', () => {
        addToolTip(mockInvokingNode, mockTooltipNode);

        // Verify tooltip node is scrolled into view
        expect(mockTooltipNode.scrollIntoView).toHaveBeenCalledWith({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });

        // Verify tooltip element is created
        expect(getToolTipElement).toHaveBeenCalledWith('Default tooltip message', true);

        // Verify position class is calculated
        expect(getTooltipPositionClass).toHaveBeenCalled();

        // Verify popper instance is created
        expect(createPopper).toHaveBeenCalled();

        // Verify event listener is attached
        expect(on).toHaveBeenCalledWith('ChangeTooltipPosition', expect.any(Function));

        // Verify continue and exit buttons have event listeners
        expect(mockShadowRoot.getElementById).toHaveBeenCalledWith('uda-autoplay-continue');
        expect(mockShadowRoot.getElementById).toHaveBeenCalledWith('uda-autoplay-exit');
        expect(mockContinueButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        expect(mockExitButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('should use custom message from recordedData', () => {
        const recordedData = {
            objectdata: JSON.stringify({
                meta: {
                    tooltipInfo: 'Custom tooltip message'
                }
            })
        };

        addToolTip(mockInvokingNode, mockTooltipNode, recordedData);

        // Verify custom message is used
        expect(getToolTipElement).toHaveBeenCalledWith('Custom tooltip message', true);
    });

    test('should use highlight message when selectedElement is highlight', () => {
        const recordedData = {
            objectdata: JSON.stringify({
                meta: {
                    selectedElement: 'highlight'
                }
            })
        };

        addToolTip(mockInvokingNode, mockTooltipNode, recordedData);

        // Verify highlight message is used
        expect(getToolTipElement).toHaveBeenCalledWith('Highlight text element', true);
    });

    test('should not show buttons when showButtons is false', () => {
        addToolTip(mockInvokingNode, mockTooltipNode, null, null, false, false, false, 'Custom message', false);

        // Verify tooltip element is created without buttons
        expect(getToolTipElement).toHaveBeenCalledWith('Custom message', false);

        // Verify button event listeners are not attached
        expect(mockShadowRoot.getElementById).not.toHaveBeenCalledWith('uda-autoplay-continue');
        expect(mockShadowRoot.getElementById).not.toHaveBeenCalledWith('uda-autoplay-exit');
    });

    test('should focus and click invoking node when enabled', () => {
        jest.useFakeTimers();

        addToolTip(mockInvokingNode, mockTooltipNode, null, null, true, true);

        // Fast-forward timer
        jest.advanceTimersByTime(CONFIG.DEBOUNCE_INTERVAL);

        // Verify focus and click are called
        expect(mockInvokingNode.focus).toHaveBeenCalled();
        expect(mockInvokingNode.click).toHaveBeenCalled();
    });

    test('should trigger ContinuePlay event when continue button is clicked', () => {
        // Mock the continue button click handler
        let continueClickHandler;
        mockContinueButton.addEventListener.mockImplementation((event, handler) => {
            if (event === 'click') continueClickHandler = handler;
        });

        addToolTip(mockInvokingNode, mockTooltipNode);

        // Simulate continue button click
        continueClickHandler();

        // Verify tooltip is removed
        expect(mockShadowRoot.getElementById).toHaveBeenCalledWith('uda-tooltip');
        expect(mockShadowRoot.removeChild).toHaveBeenCalled();

        // Verify ContinuePlay event is triggered
        expect(trigger).toHaveBeenCalledWith('ContinuePlay', {action: 'ContinuePlay'});
    });

    test('should trigger BackToSearchResults event when exit button is clicked', () => {
        // Mock the exit button click handler
        let exitClickHandler;
        mockExitButton.addEventListener.mockImplementation((event, handler) => {
            if (event === 'click') exitClickHandler = handler;
        });

        addToolTip(mockInvokingNode, mockTooltipNode);

        // Simulate exit button click
        exitClickHandler();

        // Verify tooltip is removed
        expect(mockShadowRoot.getElementById).toHaveBeenCalledWith('uda-tooltip');
        expect(mockShadowRoot.removeChild).toHaveBeenCalled();

        // Verify BackToSearchResults event is triggered
        expect(trigger).toHaveBeenCalledWith('BackToSearchResults', {action: 'BackToSearchResults'});
    });
});

describe('updateTooltipPosition', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock popper instance
        (createPopper as jest.Mock).mockReturnValue({
            setOptions: jest.fn().mockReturnThis(),
            update: jest.fn()
        });

        // Add tooltip to set up global variables
        const mockInvokingNode = {};
        const mockTooltipNode = { scrollIntoView: jest.fn() };

        // Mock document.getElementById
        document.getElementById = jest.fn().mockReturnValue({
            shadowRoot: {
                getElementById: jest.fn().mockReturnValue(null),
                removeChild: jest.fn()
            }
        });

        addToolTip(mockInvokingNode, mockTooltipNode);
    });

    test('should update tooltip position', () => {
        // Mock getTooltipPositionClass to return a different position
        (getTooltipPositionClass as jest.Mock).mockReturnValueOnce({
            finalCssClass: 'bottom',
            availablePositions: ['top', 'bottom', 'left', 'right']
        });

        updateTooltipPosition('bottom');

        // Verify getTooltipPositionClass is called with the new position
        expect(getTooltipPositionClass).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            'bottom',
            expect.anything(),
            expect.anything()
        );

        // Verify popper instance is updated
        const popperInstance = (createPopper as jest.Mock).mock.results[0].value;
        expect(popperInstance.setOptions).toHaveBeenCalled();
        expect(popperInstance.update).toHaveBeenCalled();
    });

    test('should do nothing if no popper instance exists', () => {
        // Remove tooltip to clear popper instance
        removeToolTip();

        // Reset mocks
        jest.clearAllMocks();

        // Try to update position
        updateTooltipPosition('left');

        // Verify getTooltipPositionClass is not called
        expect(getTooltipPositionClass).not.toHaveBeenCalled();
    });
});

describe('removeToolTip', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Mock shadow root
        const mockShadowRoot = {
            getElementById: jest.fn().mockReturnValue({ id: 'uda-tooltip' }),
            removeChild: jest.fn()
        };

        // Mock document.getElementById
        document.getElementById = jest.fn().mockReturnValue({
            shadowRoot: mockShadowRoot
        });
    });

    test('should remove tooltip element', () => {
        removeToolTip();

        // Verify tooltip element is checked
        const shadowRoot = document.getElementById('udan-react-root').shadowRoot;
        expect(shadowRoot.getElementById).toHaveBeenCalledWith('uda-tooltip');

        // Verify tooltip element is removed
        expect(shadowRoot.removeChild).toHaveBeenCalled();
    });

    test('should do nothing if tooltip does not exist', () => {
        // Mock getElementById to return null (tooltip doesn't exist)
        document.getElementById('udan-react-root').shadowRoot.getElementById.mockReturnValueOnce(null);

        removeToolTip();

        // Verify tooltip element is checked
        const shadowRoot = document.getElementById('udan-react-root').shadowRoot;
        expect(shadowRoot.getElementById).toHaveBeenCalledWith('uda-tooltip');

        // Verify removeChild is not called
        expect(shadowRoot.removeChild).not.toHaveBeenCalled();
    });
});

describe('Event handling', () => {
    let changePositionHandler;

    beforeEach(() => {
        jest.clearAllMocks();

        // Capture the event handler
        (on as jest.Mock).mockImplementation((event, handler) => {
            if (event === 'ChangeTooltipPosition') changePositionHandler = handler;
        });

        // Setup mock elements
        const mockInvokingNode = {};
        const mockTooltipNode = { scrollIntoView: jest.fn() };

        // Mock document.getElementById
        document.getElementById = jest.fn().mockReturnValue({
            shadowRoot: {
                getElementById: jest.fn().mockReturnValue(null),
                removeChild: jest.fn()
            }
        });

        // Add tooltip to register event handler
        addToolTip(mockInvokingNode, mockTooltipNode);

        // Mock console.log
        console.log = jest.fn();
    });

    test('should handle ChangeTooltipPosition event', () => {
        // Create mock event detail
        const mockEvent = {
            detail: {
                position: 'right'
            }
        };

        // Mock updateTooltipPosition
        const originalUpdateTooltipPosition = updateTooltipPosition;
        updateTooltipPosition = jest.fn();

        // Trigger the event handler
        changePositionHandler(mockEvent);

        // Verify console.log is called
        expect(console.log).toHaveBeenCalledWith(mockEvent.detail);

        // Verify updateTooltipPosition is called with the right position
        expect(updateTooltipPosition).toHaveBeenCalledWith('right');

        // Restore original function
        updateTooltipPosition = originalUpdateTooltipPosition;
    });

    test('should not call updateTooltipPosition if position is missing', () => {
        // Create mock event with missing position
        const mockEvent = {
            detail: {}
        };

        // Mock updateTooltipPosition
        const originalUpdateTooltipPosition = updateTooltipPosition;
        updateTooltipPosition = jest.fn();

        // Trigger the event handler
        changePositionHandler(mockEvent);

        // Verify console.log is called
        expect(console.log).toHaveBeenCalledWith(mockEvent.detail);

        // Verify updateTooltipPosition is not called
        expect(updateTooltipPosition).not.toHaveBeenCalled();

        // Restore original function
        updateTooltipPosition = originalUpdateTooltipPosition;
  }, 10000);});