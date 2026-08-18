#!/usr/bin/env python3
"""
Ed-Fi Student Data Loader

This script reads student data from a CSV file and loads it into the Ed-Fi ODS/API.
It performs OAuth 2.0 authentication and posts data to both the students and 
studentSchoolAssociations endpoints.
"""

import csv
import os
import logging
import sys
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from dotenv import load_dotenv
import requests
from urllib.parse import urljoin


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class StudentRecord:
    """Represents a student record from the CSV file."""
    unique_id: str
    birth_date: str
    first_name: str
    last_name: str
    middle_name: Optional[str]
    title: Optional[str]
    preferred_first_name: Optional[str]
    preferred_last_name: Optional[str]
    enrollment_date: str
    enrollment_grade_level: str
    full_time: str


class EdFiApiClient:
    """Ed-Fi API client with OAuth 2.0 authentication."""
    
    def __init__(self, base_url: str, client_id: str, client_secret: str, 
                 school_id: str, timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.client_id = client_id
        self.client_secret = client_secret
        self.school_id = school_id
        self.timeout = timeout
        self.access_token = None
        self.token_expiry = None
        self.oauth_url = None
        self.data_management_api_url = None
        
    def discover_endpoints(self) -> None:
        """Discover OAuth and data management API endpoints."""
        if self.oauth_url and self.data_management_api_url:
            return
            
        try:
            logger.info(f"Discovering endpoints at {self.base_url}")
            response = requests.get(self.base_url, timeout=self.timeout)
            response.raise_for_status()
            api_info = response.json()
            
            # Extract endpoints from discovery response
            self.oauth_url = api_info['urls']['oauth']
            self.data_management_api_url = api_info['urls']['dataManagementApi']
            
            logger.info("OAuth and Data Management API URLs discovered successfully")
            
        except requests.RequestException as e:
            raise Exception(f"Failed to discover API endpoints: {e}")
            
    def authenticate(self) -> None:
        """Authenticate using OAuth 2.0 Client Credentials flow."""
        # Ensure endpoints are discovered
        self.discover_endpoints()
        
        token_data = {
            'grant_type': 'client_credentials',
            'client_id': self.client_id,
            'client_secret': self.client_secret
        }
        
        try:
            logger.info("Authenticating with Ed-Fi API...")
            response = requests.post(
                self.oauth_url,
                data=token_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=self.timeout
            )
            response.raise_for_status()
            
            token_info = response.json()
            self.access_token = token_info['access_token']
            # Calculate token expiry (typically 1 hour)
            expires_in = token_info.get('expires_in', 3600)
            
            logger.info("Authentication successful.")
            
        except requests.RequestException as e:
            raise Exception(f"Failed to authenticate: {e}")
            
    def make_request(self, endpoint: str, method: str = 'GET', data: Optional[Dict] = None) -> Dict:
        """Make authenticated request to Ed-Fi API."""
        # Ensure we have an access token
        if not self.access_token:
            self.authenticate()
            
        full_url = urljoin(self.data_management_api_url + '/', endpoint.lstrip('/'))
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.request(
                method=method,
                url=full_url,
                headers=headers,
                json=data if data else None,
                timeout=self.timeout
            )
            
            # Handle token expiry
            if response.status_code == 401:
                logger.info("Token expired, re-authenticating...")
                self.authenticate()
                headers['Authorization'] = f'Bearer {self.access_token}'
                response = requests.request(
                    method=method,
                    url=full_url,
                    headers=headers,
                    json=data if data else None,
                    timeout=self.timeout
                )
            
            response.raise_for_status()
            
            # Some endpoints may return empty responses on success
            if response.content:
                return response.json()
            return {}
            
        except requests.RequestException as e:
            logger.error(f"API request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response status: {e.response.status_code}")
                logger.error(f"Response body: {e.response.text}")
            raise


class StudentDataLoader:
    """Loads student data from CSV into Ed-Fi API."""
    
    def __init__(self, api_client: EdFiApiClient):
        self.api_client = api_client
        
    def read_csv_file(self, filename: str) -> List[StudentRecord]:
        """Read student data from CSV file."""
        students = []
        
        try:
            with open(filename, 'r', newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    student = StudentRecord(
                        unique_id=row['uniqueId'],
                        birth_date=row['birthDate'],
                        first_name=row['firstName'],
                        last_name=row['lastName'],
                        middle_name=row['middleName'] if row['middleName'] else None,
                        title=row['title'] if row['title'] else None,
                        preferred_first_name=row['preferredFirstName'] if row['preferredFirstName'] else None,
                        preferred_last_name=row['preferredLastName'] if row['preferredLastName'] else None,
                        enrollment_date=row['enrollmentDate'],
                        enrollment_grade_level=row['enrollmentGradeLevel'],
                        full_time=row['fullTime']
                    )
                    students.append(student)
                    
            logger.info(f"Read {len(students)} student records from {filename}")
            return students
            
        except FileNotFoundError:
            raise Exception(f"CSV file not found: {filename}")
        except Exception as e:
            raise Exception(f"Error reading CSV file: {e}")
            
    def create_student_payload(self, student: StudentRecord) -> Dict:
        """Create student payload for Ed-Fi students endpoint."""
        payload = {
            'studentUniqueId': student.unique_id,
            'birthDate': student.birth_date,
            'firstName': student.first_name,
            'lastSurName': student.last_name,
        }
        
        # Add optional fields if present
        if student.middle_name:
            payload['middleName'] = student.middle_name
        if student.title:
            payload['personalTitlePrefix'] = student.title
        if student.preferred_first_name:
            payload['preferredFirstName'] = student.preferred_first_name
        if student.preferred_last_name:
            payload['preferredLastSurname'] = student.preferred_last_name
            
        return payload
        
    def create_student_school_association_payload(self, student: StudentRecord) -> Dict:
        """Create student school association payload for Ed-Fi studentSchoolAssociations endpoint."""
        # Format grade level as URI descriptor
        grade_level_descriptor = f"uri://ed-fi.org/GradeLevelDescriptor#{student.enrollment_grade_level}"
        
        # Convert fullTime string to float
        full_time_equivalency = float(student.full_time)
        
        payload = {
            'studentReference': {
                'studentUniqueId': student.unique_id
            },
            'schoolReference': {
                'schoolId': int(self.api_client.school_id)
            },
            'entryDate': student.enrollment_date,
            'entryGradeLevelDescriptor': grade_level_descriptor,
            'fullTimeEquivalency': full_time_equivalency
        }
        
        return payload
        
    def load_student(self, student: StudentRecord) -> None:
        """Load a single student and their school association."""
        logger.info(f"Loading student {student.unique_id}: {student.first_name} {student.last_name}")
        
        try:
            # 1. Create student
            student_payload = self.create_student_payload(student)
            logger.debug("Creating student with student payload")
            
            self.api_client.make_request(
                endpoint='/ed-fi/students',
                method='POST',
                data=student_payload
            )
            logger.info(f"✓ Student {student.unique_id} created successfully")
            
            # 2. Create student school association
            association_payload = self.create_student_school_association_payload(student)
            logger.debug("Creating student school association with association payload")
            
            self.api_client.make_request(
                endpoint='/ed-fi/studentSchoolAssociations',
                method='POST',
                data=association_payload
            )
            logger.info(f"✓ Student school association for {student.unique_id} created successfully")
            
        except Exception as e:
            logger.error(f"✗ Failed to load student {student.unique_id}: {e}")
            raise
            
    def load_all_students(self, csv_filename: str) -> None:
        """Load all students from CSV file."""
        students = self.read_csv_file(csv_filename)
        
        success_count = 0
        error_count = 0
        
        for student in students:
            try:
                self.load_student(student)
                success_count += 1
            except Exception as e:
                error_count += 1
                logger.error(f"Continuing with next student...")
                
        logger.info(f"Load complete: {success_count} successful, {error_count} errors")
        
        if error_count > 0:
            logger.warning(f"{error_count} students failed to load")


def load_environment_variables() -> Dict[str, str]:
    """Load and validate environment variables."""
    load_dotenv()
    
    required_vars = [
        'EDFI_BASE_URL',
        'EDFI_CLIENT_ID', 
        'EDFI_CLIENT_SECRET',
        'EDFI_SCHOOL_ID'
    ]
    
    env_vars = {}
    missing_vars = []
    
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
        else:
            env_vars[var] = value
            
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        logger.error("Please copy .env.example to .env and configure your credentials")
        sys.exit(1)
        
    # Optional variables with defaults
    env_vars['EDFI_TIMEOUT'] = int(os.getenv('EDFI_TIMEOUT', '30'))
    
    return env_vars


def main():
    """Main entry point."""
    logger.info("Ed-Fi Student Data Loader starting...")
    
    try:
        # Load configuration
        env_vars = load_environment_variables()
        
        # Create API client
        api_client = EdFiApiClient(
            base_url=env_vars['EDFI_BASE_URL'],
            client_id=env_vars['EDFI_CLIENT_ID'],
            client_secret=env_vars['EDFI_CLIENT_SECRET'],
            school_id=env_vars['EDFI_SCHOOL_ID'],
            timeout=env_vars['EDFI_TIMEOUT']
        )
        
        # Create data loader
        loader = StudentDataLoader(api_client)
        
        # Load students from CSV
        csv_file = 'students.csv'
        if not os.path.exists(csv_file):
            logger.error(f"CSV file not found: {csv_file}")
            logger.error("Make sure students.csv exists in the current directory")
            sys.exit(1)
            
        loader.load_all_students(csv_file)
        logger.info("Student data loading completed successfully!")
        
    except KeyboardInterrupt:
        logger.info("Process interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()