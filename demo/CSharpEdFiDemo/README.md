# Ed-Fi C# Demo Application

A simple C# console application demonstrating authentication with the Ed-Fi API and creating resources.

## What This Demo Does

1. **Authenticates** with an Ed-Fi API instance using OAuth 2.0 Client Credentials flow
2. **Creates a course** with an academic subject descriptor via POST request

## Prerequisites

- **.NET 8 SDK** or later ([Download](https://dotnet.microsoft.com/download/dotnet/8.0))
- **Ed-Fi API credentials** (Client ID and Client Secret)
- **Ed-Fi API instance** URL

## Setup

### 1. Configure API Credentials

Edit `appsettings.json` and replace with your actual values:

```json
{
  "EdFi": {
    "ApiBaseUrl": "https://your-edfi-instance.org/api/v6.2",
    "TokenUrl": "https://your-edfi-instance.org/oauth/token",
    "ClientId": "YOUR_CLIENT_ID",
    "ClientSecret": "YOUR_CLIENT_SECRET"
  }
}
```

### 2. Build & Run

```bash
# Restore dependencies
dotnet restore

# Build the project
dotnet build

# Run the demo
dotnet run
```

## Expected Output

```
==== Ed-Fi C# Authentication & API Demo ====

1. Authenticating with Ed-Fi API...
✓ Authentication successful
  Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

2. Creating a new course with academic subject...
✓ Course created successfully
  Course Code: DEMO-A1B2C3D4
  Location: https://your-edfi-instance.org/api/v6.2/data/v3/ed-fi/courses/RESOURCE_ID

==== Demo Complete ====
```

## Key Features

- **OAuth 2.0 Authentication**: Uses Client Credentials grant flow
- **Configuration Management**: Externalized settings via `appsettings.json`
- **Error Handling**: Comprehensive error reporting
- **RESTful API Calls**: Demonstrates POST to create resources

## API Endpoints Used

- **Token Endpoint**: `POST /oauth/token` — Obtains bearer token
- **Courses Endpoint**: `POST /data/v3/ed-fi/courses` — Creates a new course

## Customization

### Create Different Resources

Modify the `coursePayload` in `Program.cs` to create different resources:

```csharp
// Example: Create a student
var studentPayload = new
{
    studentUniqueId = "12345",
    firstName = "John",
    lastSurname = "Doe",
    birthDate = "2010-05-15"
};
```

### Change the Education Organization ID

The demo uses `educationOrganizationId = 255901001`. Replace with a valid ID from your Ed-Fi instance:

```csharp
educationOrganizationReference = new
{
    educationOrganizationId = YOUR_VALID_ORG_ID
}
```

## Troubleshooting

### 401 Unauthorized
- Verify your Client ID and Client Secret are correct
- Check that the Token URL is correct

### 400 Bad Request
- Ensure required fields are included in the payload
- Verify the `educationOrganizationId` exists in the system
- Check that `academicSubjectDescriptor` URI is valid

### Network Errors
- Verify the API Base URL is reachable
- Check firewall/proxy settings

## References

- [Ed-Fi ODS/API Documentation](https://docs.ed-fi.org/)
- [Ed-Fi Data Standard Descriptors](https://docs.ed-fi.org/reference/data-standard/)
- [OAuth 2.0 Client Credentials Flow](https://tools.ietf.org/html/rfc6749#section-4.4)

## License

This demo is part of the Ed-Fi SDK MCP and follows the same Apache 2.0 license.
