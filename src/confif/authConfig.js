export const msalConfig = {
  auth: {
    clientId: "5c3d31be-b8d1-4ce5-bf4d-31b850ebc7b2", // Your App Registration (Client) ID
    authority: "https://login.microsoftonline.com/d7ff7ab9-6f08-4232-aa65-e965312488e4", // Your Tenant ID
    redirectUri: "http://localhost:3000",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

export const loginRequest = {
  scopes: ["https://database.windows.net//.default"]
};

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me"
};
