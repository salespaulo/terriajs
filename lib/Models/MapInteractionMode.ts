import defaultValue from "terriajs-cesium/Source/Core/defaultValue";
import PickedFeatures from "../Map/PickedFeatures";
import { observable } from "mobx";

export enum UIMode {
  Difference
}

interface Options {
  onCancel?: () => void;
  message: string;
  messageAsNode?: React.ReactNode;
  customUi?: () => unknown;
  buttonText?: string;
  drawRectangle?: boolean;
  uiMode?: UIMode; // diff tool hack for now
}

/**
 * A mode for interacting with the map.
 */
export default class MapInteractionMode {
  readonly onCancel?: () => void;

  readonly buttonText: string;
  readonly drawRectangle: boolean;
  readonly uiMode: UIMode;

  @observable
  customUi: (() => unknown) | undefined;

  @observable
  message: () => string;

  @observable
  messageAsNode: () => React.ReactNode;

  @observable
  pickedFeatures?: PickedFeatures;

  constructor(options: Options) {
    /**
     * Gets or sets a callback that is invoked when the user cancels the interaction mode.  If this property is undefined,
     * the interaction mode cannot be canceled.
     */
    this.onCancel = options.onCancel;

    /**
     * Gets or sets the details of a custom user interface for this map interaction mode. This property is not used by
     * the `MapInteractionMode` itself, so it can be anything that is suitable for the user interface. In the standard
     * React-based user interface included with TerriaJS, this property is a function that is called with no parameters
     * and is expected to return a React component.
     */
    this.customUi = options.customUi;

    /**
     * Gets or sets the html formatted message displayed on the map when in this mode.
     */
    this.message = function() {
      return options.message;
    };

    /**
     * Gets or sets the react node displayed on the map when in this mode.
     */
    this.messageAsNode = function() {
      return options.messageAsNode;
    };

    /**
     * Set the text of the button for the dialog the message is displayed on.
     */
    this.buttonText = defaultValue(options.buttonText, "Cancel");

    /**
     * Gets or sets the features that are currently picked.
     */
    this.pickedFeatures = undefined;

    /**
     * Gets or sets whether to use the diff tool UI+styles
     */
    this.uiMode = defaultValue(options.uiMode, undefined);

    /**
     * Determines whether a rectangle will be requested from the user rather than a set of pickedFeatures.
     */
    this.drawRectangle = defaultValue(options.drawRectangle, false);
  }
}