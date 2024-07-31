import {AuthConfig, AuthConfigPropTypes} from "./UserAuthConfig";
import {UDADigestMessage} from "../util/UDADigestMessage";
import {trigger} from "../util/events";

export const AuthDataConfig = async (data: AuthConfigPropTypes): Promise<AuthConfigPropTypes> => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid authentication data. Expected an object.');
  }

  const oldData = {...AuthConfig};
  const updatedConfig = {...AuthConfig};

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

    if (updatedConfig.id === '' || (oldData.id !== '' && oldData.id !== updatedConfig.id)) {
      trigger('UDAClearSessionData', {});
    } else if (updatedConfig.id !== '') {
      trigger("RequestUDASessionData", {detail: {data: "getusersessiondata"}, bubbles: false, cancelable: false});
    }

    return updatedConfig;
  } catch (error) {
    console.error('Error in AuthDataConfig:', error);
    throw new Error('Failed to configure authentication data');
  }
}
