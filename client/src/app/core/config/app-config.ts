import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface PublicAppConfig {
  apiBaseUrl: string;
  applicationName: string;
  enableMockAuth: boolean;
  enableAssistant: boolean;
}

/** Central access to public build-time settings so tests can override them. */
export const APP_CONFIG = new InjectionToken<PublicAppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    apiBaseUrl: environment.apiBaseUrl,
    applicationName: environment.applicationName,
    enableMockAuth: environment.enableMockAuth,
    enableAssistant: environment.enableAssistant,
  }),
});
