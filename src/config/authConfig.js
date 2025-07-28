export const msalConfig = {
  auth: {
    clientId: "5c3d31be-b8d1-4ce5-bf4d-31b850ebc7b2", // Your App Registration (Client) ID
    authority: "https://login.microsoftonline.com/d7ff7ab9-6f08-4232-aa65-e965312488e4", // Your Tenant ID
    redirectUri: "http://localhost:3000",
    postLogoutRedirectUri: "http://localhost:3000",
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "localStorage", // Changed from sessionStorage to localStorage for persistence
    storeAuthStateInCookie: true, // Enable cookie storage for better session handling
    secureCookies: false, // Set to true in production with HTTPS
  },
  system: {
    allowNativeBroker: false, // Disables WAM Broker
    loggerOptions: {
      logLevel: "Info",
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        console.log(message);
      }
    }
  }
};

export const loginRequest = {
  scopes: ["https://database.windows.net//.default"],
  prompt: "select_account", // Allow users to select account
};

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me"
};

// Token refresh configuration
export const tokenRequest = {
  scopes: ["https://database.windows.net//.default"],
  forceRefresh: false, // Set to true to skip cache lookup
};
