import {AuthConfig, AuthConfigPropTypes} from "./UserAuthConfig";
import {UDADigestMessage} from "../util/UDADigestMessage";
import {trigger} from "../util/events";

/**
 * Configures the authentication data for the application.
 *
 * @param data - An object containing the authentication configuration properties.
 * @throws {Error} If the `data` parameter is not an object.
 * @returns {Promise<AuthConfigPropTypes>} The updated authentication configuration.
 */
export const AuthDataConfig = async (data: AuthConfigPropTypes): Promise<AuthConfigPropTypes> => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid authentication data. Expected an object.');
  }

  /**
   * Creates a deep copy of the `AuthConfig` object and assigns it to `updatedConfig`.
   * This allows the `AuthDataConfig` function to safely modify the configuration
   * without affecting the original `AuthConfig` object.
   */
  const oldData = {...AuthConfig};
  const updatedConfig = {...AuthConfig};

  /**
   * Iterates through the provided authentication data object and updates the `updatedConfig` object with the appropriate values.
   * - If a key in the `data` object matches a key in the `AuthConfig` object, the value is processed as follows:
   *   - If the value is an empty string, it is directly assigned to the `updatedConfig` object.
   *   - If the value type matches the type of the corresponding `AuthConfig` property, the value is encrypted using the `UDADigestMessage` function and then assigned to the `updatedConfig` object.
   *   - If the value type does not match the type of the corresponding `AuthConfig` property, a warning is logged, and the default value is used.
   * - If a key in the `data` object does not exist in the `AuthConfig` object, a warning is logged, and the property is ignored.
   */
  try {
    for (const [key, value] of Object.entries(data)) {
      if (key in AuthConfig) {
        if (value === '') {
          updatedConfig[key] = value;
        } else if (typeof value === typeof AuthConfig[key]) {
          const encrypted = await UDADigestMessage(value, 'SHA-512');
          updatedConfig[key] = encrypted;
        } else {
          console.warn(`Type mismatch for ${key}. Expected ${typeof AuthConfig[key]}, received ${typeof value}. Using default value.`);
        }
      } else {
        console.warn(`Unknown authentication property: ${key}. This property will be ignored.`);
      }
    }

    /**
     * Handles the behavior when the `updatedConfig.id` value changes.
     * - If `updatedConfig.id` is an empty string, or if `oldData.id` is not empty and does not match `updatedConfig.id`, the `UDAClearSessionData` event is triggered.
     * - If `updatedConfig.id` is not an empty string, the `RequestUDASessionData` event is triggered with the detail `{data: "getusersessiondata"}`.
     */
    if (updatedConfig.id === '' || (oldData.id !== '' && oldData.id !== updatedConfig.id)) {
      trigger('UDAClearSessionData', {});
    } else if (updatedConfig.id !== '') {
      trigger("RequestUDASessionData", {detail: {data: "getusersessiondata"}, bubbles: false, cancelable: false});
    }

    /**
     * Handles the final step of updating the authentication configuration.
     * - If an error occurs during the update process, it logs the error and throws a new error with a more user-friendly message.
     * - Otherwise, it returns the updated authentication configuration.
     *
     * @returns {Promise<AuthConfigPropTypes>} The updated authentication configuration.
     */
    return updatedConfig;
  } catch (error) {
    console.error('Error in AuthDataConfig:', error);
    throw new Error('Failed to configure authentication data');
  }
}
