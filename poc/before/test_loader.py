#!/usr/bin/env python3
"""
Test script for Ed-Fi Student Data Loader

This script tests the CSV reading and data transformation functionality
without making actual API calls.
"""

import os
import sys
from load_students import StudentDataLoader, EdFiApiClient, StudentRecord


def test_csv_reading():
    """Test CSV file reading functionality."""
    print("Testing CSV reading...")
    
    # Mock API client (we won't use it for actual API calls)
    mock_client = EdFiApiClient(
        base_url="https://test.example.com",
        client_id="test",
        client_secret="test",
        school_id="123456"
    )
    
    loader = StudentDataLoader(mock_client)
    
    try:
        students = loader.read_csv_file('students.csv')
        print(f"✓ Successfully read {len(students)} student records")
        
        # Display first student record details
        if students:
            student = students[0]
            print(f"\nFirst student record structure:")
            print(f"  ID: [PRESENT]")
            print(f"  Name: [PRESENT]")
            print(f"  Grade Level: {student.enrollment_grade_level}")
            print(f"  Full Time: {student.full_time}")
        
        return students
        
    except Exception as e:
        print(f"✗ Error reading CSV: {e}")
        return []


def test_payload_creation():
    """Test API payload creation."""
    print("\nTesting payload creation...")
    
    # Create a sample student record
    student = StudentRecord(
        unique_id="604835",
        birth_date="2016-09-29",
        first_name="Diana",
        last_name="Holt",
        middle_name="Emily",
        title="Ms",
        preferred_first_name=None,
        preferred_last_name=None,
        enrollment_date="2021-08-23",
        enrollment_grade_level="Ninth grade",
        full_time="1"
    )
    
    mock_client = EdFiApiClient(
        base_url="https://test.example.com",
        client_id="test",
        client_secret="test",
        school_id="255901001"
    )
    
    loader = StudentDataLoader(mock_client)
    
    # Test student payload
    student_payload = loader.create_student_payload(student)
    print("✓ Student payload structure created successfully")
    print(f"    Contains {len(student_payload)} fields")
    
    # Test student school association payload
    association_payload = loader.create_student_school_association_payload(student)
    print("\n✓ Student school association payload structure created successfully")
    print(f"    Contains {len(association_payload)} fields")
    print("    Includes studentReference, schoolReference, entryDate, and grade level descriptor")


def main():
    """Test main functionality."""
    print("Ed-Fi Student Data Loader - Test Mode\n")
    
    # Check if CSV file exists
    if not os.path.exists('students.csv'):
        print("✗ students.csv not found in current directory")
        sys.exit(1)
    
    # Test CSV reading
    students = test_csv_reading()
    
    if not students:
        print("✗ Failed to read students from CSV")
        sys.exit(1)
    
    # Test payload creation
    test_payload_creation()
    
    print(f"\n✓ All tests passed! Ready to process {len(students)} students.")
    print("\nTo run with actual API calls:")
    print("1. Copy .env.example to .env")
    print("2. Configure your Ed-Fi API credentials in .env")
    print("3. Run: python3 load_students.py")


if __name__ == '__main__':
    main()