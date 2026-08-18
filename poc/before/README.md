# Ed-Fi Student Data Loader

This Python script reads student data from a CSV file and loads it into the Ed-Fi ODS/API using OAuth 2.0 authentication.

## Setup

1. Install dependencies:
   ```bash
   poetry install
   ```

2. Copy `.env.example` to `.env` and configure your Ed-Fi API credentials:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your actual Ed-Fi API credentials and endpoints.

## Usage

Run the script:
```bash
poetry run python load_students.py
```

## Data Flow

The script performs the following operations for each student record in `students.csv`:

1. **Create Student**: POSTs student personal information to `/ed-fi/students` endpoint
2. **Create School Association**: POSTs student school enrollment information to `/ed-fi/studentSchoolAssociations` endpoint

## Field Mappings

### Students Endpoint
- `uniqueId` → `studentUniqueId`
- `birthDate` → `birthDate`
- `firstName` → `firstName`
- `lastName` → `lastSurName`
- `middleName` → `middleName`
- `title` → `personalTitlePrefix`
- `preferredFirstName` → `preferredFirstName`
- `preferredLastName` → `preferredLastSurname`

### Student School Associations Endpoint
- `enrollmentDate` → `entryDate`
- `enrollmentGradeLevel` → `entryGradeLevelDescriptor` (formatted as URI)
- `fullTime` → `fullTimeEquivalency`

## Dependencies

- `requests`: HTTP client for API calls
- `python-dotenv`: Environment variable management