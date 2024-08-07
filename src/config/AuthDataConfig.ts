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
  // Check if the provided data is not an object
  if (!data || typeof data !== 'object') {
    // If the provided data is not an object, throw an error
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
  // Iterate over the key-value pairs in the provided `data` object
  for (const [key, value] of Object.entries(data)) {
    // Check if the key exists in the `AuthConfig` object
    if (key in AuthConfig) {
      // If the value is an empty string
      if (value === '') {
        // Assign the empty string value to the corresponding key in `updatedConfig`
        updatedConfig[key] = value;
      }
      // If the type of the value matches the type of the corresponding property in `AuthConfig`
      else if (typeof value === typeof AuthConfig[key]) {
        // Encrypt the value using the `UDADigestMessage` function with the SHA-512 algorithm
        const encrypted = await UDADigestMessage(value, 'SHA-512');
        // Assign the encrypted value to the corresponding key in `updatedConfig`
        updatedConfig[key] = encrypted;
      }
      // If the type of the value does not match the type of the corresponding property in `AuthConfig`
      else {
        // Log a warning message indicating the type mismatch and that the default value will be used
        console.warn(`Type mismatch for ${key}. Expected ${typeof AuthConfig[key]}, received ${typeof value}. Using default value.`);
      }
    }
    // If the key does not exist in the `AuthConfig` object
    else {
      // Log a warning message indicating that the property is unknown and will be ignored
      console.warn(`Unknown authentication property: ${key}. This property will be ignored.`);
    }
  }


    /**
     * Handles the behavior when the `updatedConfig.id` value changes.
     * - If `updatedConfig.id` is an empty string, or if `oldData.id` is not empty and does not match `updatedConfig.id`, the `UDAClearSessionData` event is triggered.
     * - If `updatedConfig.id` is not an empty string, the `RequestUDASessionData` event is triggered with the detail `{data: "getusersessiondata"}`.
     */
    if (updatedConfig.id === '' || (oldData.id !== '' && oldData.id !== updatedConfig.id)) {
      // If the `updatedConfig.id` is an empty string, or if the `oldData.id` is not empty and does not match `updatedConfig.id`
      // Trigger the `UDAClearSessionData` event with an empty object as the event data
      trigger('UDAClearSessionData', {});
    } else if (updatedConfig.id !== '') {
      // If the `updatedConfig.id` is not an empty string
      // Trigger the `RequestUDASessionData` event with an object containing the detail `{data: "getusersessiondata"}` as the event data
      // The `bubbles` and `cancelable` options are set to `false`
      trigger("RequestUDASessionData", { detail: { data: "getusersessiondata" }, bubbles: false, cancelable: false });
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
    // If an error occurs during the update process
    // Log the error with a descriptive message
    console.error('Error in AuthDataConfig:', error);
    // Throw a new Error with a more user-friendly message
    throw new Error('Failed to configure authentication data');
  } 
}

