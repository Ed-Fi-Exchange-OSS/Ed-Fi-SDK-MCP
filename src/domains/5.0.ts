/**
 * Ed-Fi Data Standard Domain Information for Version 5.0
 */

import type { DomainData } from './types.js';

export const DOMAIN_DATA_5_0: DomainData = [
  {
    "AlternativeAndSupplementalServices": {
      "documentation": "This domain defines the model for a wide range of programs, including education programs, alternative programs, extracurricular programs, supplemental programs, and early learning programs.\n* A Program entity defines programs with services offered by an education organization.\n* A StudentProgramAssociation links Program entities to participating students.\n* A StaffProgramAssociation links Program entities to assigned staff.",
      "entities": [
        "EducationOrganization",
        "Program",
        "School",
        "Section",
        "Staff",
        "Student",
        "StudentProgramAttendanceEvent",
        "StudentSchoolAttendanceEvent",
        "StudentSectionAttendanceEvent"
      ],
      "associations": [
        "StaffProgramAssociation",
        "StudentProgramAssociation",
        "StudentSectionAssociation"
      ]
    }
  },
  {
    "Assessment": {
      "documentation": "This domain defines a model that can be used for a wide variety of assessments, including early childhood assessment, state standardized assessments, college entrance exams, benchmark assessments, and/or course assessments. This domain contains:\n* Learning Standards that drive the curriculum and the assessments\n* Assessment Metadata that describe the assessment\n* Student Assessment Results that follow a parallel structure of StudentAssessment, StudentObjectiveAssessment, and StudentAssessmentItem",
      "entities": [
        "Assessment",
        "AssessmentItem",
        "LearningStandard",
        "ObjectiveAssessment",
        "Program",
        "Section",
        "Student",
        "StudentAssessment",
        "StudentAssessmentItem",
        "StudentObjectiveAssessment"
      ]
    }
  },
  {
    "AssessmentMetadata (Subdomain of Assessment)": {
      "documentation": "Assessment metadata is information describing the assessment instrument itself.\n* There are two options to associate an Assessment which are mutually exclusive: by Section and by Program. For example, if an Assessment is defined to assess Common Core Standards, then the association shall be with Section, on the other hand if the Assessment is defined to assess the Developmental Domains by an Early Learning program, then the association shall be with Program.",
      "entities": [
        "Assessment",
        "AssessmentItem",
        "ObjectiveAssessment",
        "Program",
        "Section"
      ],
      "parentDomain": "Assessment"
    }
  },
  {
    "BellSchedule": {
      "documentation": "The BellSchedule represents the class period scheduling in a day or over a course of days. The model is meant to accommodate a wide variety of bell schedules including block schedules, as follows:\n* Sections are assigned  one or more \"\"logical\"\" ClassPeriods, which represents the basic unit for scheduling that section.\n* A BellSchedule defines the MeetingTimes (time of the day) for each logical ClassPeriod. ClassPeriod does not have to meet every day and specific meeting days are defined in BellSchedule by its Date attribute.\n* The association between BellSchedule Date attribute indicates which days of the Session the BellSchedule was in effect. This allows the school to have a BellSchedule that is special for a specific day, such as for a testing day or a late-start day.\n* A School may have multiple BellSchedules defined, and may have different BellSchedules on the same calendar time period (e.g. for different grades).",
      "entities": [
        "BellSchedule",
        "ClassPeriod",
        "EducationOrganization",
        "School",
        "Section",
        "Session"
      ]
    }
  },
  {
    "CourseCatalog (Subdomain of TeachingAndLearning)": {
      "documentation": "",
      "entities": [
        "Course",
        "CourseOffering",
        "EducationOrganization",
        "LearningStandard",
        "School",
        "Session"
      ],
      "parentDomain": "TeachingAndLearning"
    }
  },
  {
    "Discipline": {
      "documentation": "The Discipline domain is based upon the concepts of a DisciplineIncident (i.e., the violation or offense) and a DisciplineAction (i.e., the punishment).\n* A DisciplineIncident represents the actions or behaviors that constitute an \"\"offense\"\" in violation of laws, rules, policies, or norms of behavior. The DisciplineIncident is associated with the school where the incident occurred.\n* A DisciplineAction represents the punitive or other actions taken against the students. One or more DisciplineActions may be applied to one DisciplineIncident(e.g., suspension plus after-school study hall). Alternatively, one DisciplineAction could have multiple Disciplines as an attribute to accomplish the same thing.",
      "entities": [
        "DisciplineAction",
        "DisciplineIncident",
        "School",
        "Staff",
        "Student"
      ]
    }
  },
  {
    "EducationOrganization": {
      "documentation": "The Education Organization domain defines the organizational structure and hierarchy of education organizations. The entity EducationOrganization serves as an abstraction for common attributes and associations. Throughout the model, if there is an association to/from an EducationOrganization the meaning is that the association may be associated with two or more types of organizations. The model supports the following structure:\n* StateEducationAgency is an optional entity for the state department of education or equivalent.\n* EducationServiceCenter is an optional entity for a regional organization between the district and state level.\n* LocalEducationAgency represents a school district or charter management organization.\n* School represents the point of education instruction.\n* EducationOrganizationNetwork represents a self-organized membership network of peer-level schools or LEAs intended to provide shared services or collective purchasing.\n* AccountabilityRating holds education organization ratings assigned by an accountability system.\n* Community providers that are non-LEA can be represented by the CommunityProvider and CommunityOrganization entities.",
      "entities": [
        "AccountabilityRating",
        "CommunityOrganization",
        "CommunityProvider",
        "CommunityProviderLicense",
        "EducationOrganization",
        "EducationOrganizationNetwork",
        "EducationServiceCenter",
        "LocalEducationAgency",
        "PostSecondaryInstitution",
        "School",
        "StateEducationAgency"
      ],
      "associations": [
        "EducationOrganizationNetworkAssociation",
        "FeederSchoolAssociation"
      ]
    }
  },
  {
    "Enrollment": {
      "documentation": "The Enrollment domain represents students' enrollments in schools, as specifically designated by the StudentSchoolAssociation. The model supports the two cases of where a student is limited to be enrolled only in one school at a time or cases where a state may have policies supporting multiple school enrollments. The semantics assume that a separate StudentSchoolAssociation is provided for each grade level for each student; in other words, a student is withdrawn in the previous grade level and enrolled in the next grade level when promoted.\nFor associations between a student and a school or LEA that is *not* enrollment(e.g., school of accountability), the StudentEducationOrganizationAssociation is defined.",
      "entities": [
        "AccountabilityRating",
        "EducationOrganization",
        "GraduationPlan",
        "LocalEducationAgency",
        "School",
        "Student"
      ],
      "associations": [
        "StudentEducationOrganizationAssociation",
        "StudentEducationOrganizationResponsibilityAssociation",
        "StudentSchoolAssociation"
      ]
    }
  },
  {
    "Finance": {
      "documentation": "Core to the Finance model is the the chart of accounts entity that forms the backbone for classifying expenditures of all types. Each Account Identifier element is comprised of a compound structure of multiple types of classifications, or dimensions, each with a hierarchical code structure. Example dimensions include:\n* The Fund from which monies are being expended.\n* The Program that is spending the funds.\n* The Function for which the funds are being spent.",
      "entities": [
        "BalanceSheetDimension",
        "ChartOfAccount",
        "EducationOrganization",
        "FunctionDimension",
        "FundDimension",
        "LocalAccount",
        "LocalActual",
        "LocalBudget",
        "LocalContractedStaff",
        "LocalEncumbrance",
        "LocalPayroll",
        "ObjectDimension",
        "OperationalUnitDimension",
        "ProgramDimension",
        "ProjectDimension",
        "ReportingTag",
        "SourceDimension",
        "Staff"
      ]
    }
  },
  {
    "Gradebook (Subdomain of StudentAcademicRecord)": {
      "documentation": "",
      "entities": [
        "Course",
        "GradebookEntry",
        "LearningStandard",
        "Section",
        "Student",
        "StudentGradebookEntry"
      ],
      "associations": [
        "StudentSectionAssociation"
      ],
      "parentDomain": "StudentAcademicRecord"
    }
  },
  {
    "Graduation": {
      "documentation": "The Graduation domain model represents student outcomes.\n* A GraduationPlan entity represents either a generic graduation plan for all or many students or an individualized graduation plan. The GraduationPlan supports several levels of detail, including overall credit requirements, credits by subject area, or down to specific courses to be taken.\n* A PostSecondaryEvent entity represents significant postsecondary education information, such as college applications, remedial course enrollment, acceptances, and detailed postsecondary institution information.\n* A Diploma element represents graduation certificate information with associated honors and other recognitions as part of the StudentAcademicRecord.",
      "entities": [
        "EducationOrganization",
        "GraduationPlan",
        "PostSecondaryEvent",
        "PostSecondaryInstitution",
        "School",
        "Student",
        "StudentAcademicRecord"
      ],
      "associations": [
        "StudentSchoolAssociation"
      ]
    }
  },
  {
    "Intervention": {
      "documentation": "The Intervention domain describes educational interventions and, more generally, supplemental education content aimed at altering behavior or improving the understanding of a concept. Interventions span from in-classroom teaching methods to formal out-of-class intervention programs.\n* InterventionPrescription describes an activity intended to address a specific problem or diagnosis. It identifies the kinds of students targeted and how the intervention should be delivered.\n* Intervention is a specific implementation of an instructional approach, outlined in an InterventionPrescription, with one or more students in a Cohort. Interventions may be one-time actions or recurring actions overtime. Interventions typically have assigned Staff. AttendanceEvents may be captured for Interventions.\n* EducationContent metadata may be linked to InterventionPrescriptionsand/or Interventions. The EducationContent includes descriptive information about the content conforming to the Learning Resource MetadataInitiative (LRMI).\n* StudentInterventionAssociation links Students to Interventions in which they participate. The effectiveness of an Intervention for a given Student is also captured. Data about a formal InterventionStudy for an InterventionPrescription may also be associated.",
      "entities": [
        "Cohort",
        "EducationContent",
        "EducationOrganization",
        "Intervention",
        "InterventionPrescription",
        "InterventionStudy",
        "Staff",
        "Student",
        "StudentInterventionAttendanceEvent"
      ],
      "associations": [
        "EducationOrganizationInterventionPrescriptionAssociation",
        "StudentCohortAssociation",
        "StudentInterventionAssociation"
      ]
    }
  },
  {
    "ReportCard (Subdomain of StudentAcademicRecord)": {
      "documentation": "",
      "entities": [
        "CompetencyObjective",
        "EducationOrganization",
        "Grade",
        "GradingPeriod",
        "Program",
        "ReportCard",
        "Section",
        "Student",
        "StudentCompetencyObjective"
      ],
      "associations": [
        "StudentProgramAssociation",
        "StudentSectionAssociation"
      ],
      "parentDomain": "StudentAcademicRecord"
    }
  },
  {
    "SchoolCalendar": {
      "documentation": "",
      "entities": [
        "AcademicWeek",
        "Calendar",
        "CalendarDate",
        "EducationOrganization",
        "GradingPeriod",
        "School",
        "Session",
        "Student"
      ],
      "associations": [
        "StudentSchoolAssociation"
      ]
    }
  },
  {
    "SectionsAndPrograms (Subdomain of TeachingAndLearning)": {
      "documentation": "",
      "entities": [
        "ClassPeriod",
        "CourseOffering",
        "EducationOrganization",
        "Location",
        "Program",
        "School",
        "Section",
        "Session",
        "Staff",
        "Student"
      ],
      "associations": [
        "StaffProgramAssociation",
        "StaffSchoolAssociation",
        "StaffSectionAssociation",
        "StudentProgramAssociation",
        "StudentSchoolAssociation",
        "StudentSectionAssociation"
      ],
      "parentDomain": "TeachingAndLearning"
    }
  },
  {
    "SpecialEducation": {
      "documentation": "The Special Education subdomain of the Alternative and Supplemental Services domain extends the StudentProgramAssociation. A StudentSpecialEducationProgramAssociation entity provides important information about the student's participation in the Special Education Program, such as the service provider, key Individualized Education Program dates, and data about the nature of the student's disability. In addition, a RestraintEvents entity is included to represent information about special education medical restraint occurrences related to a student.",
      "entities": [
        "EducationOrganization",
        "Program",
        "RestraintEvent",
        "School",
        "Section",
        "Staff",
        "Student",
        "StudentProgramAttendanceEvent",
        "StudentSchoolAttendanceEvent",
        "StudentSectionAttendanceEvent"
      ],
      "associations": [
        "StaffProgramAssociation",
        "StaffSectionAssociation",
        "StudentProgramAssociation",
        "StudentSectionAssociation",
        "StudentSpecialEducationProgramAssociation"
      ]
    }
  },
  {
    "Staff": {
      "documentation": "The Staff domain represents a wide variety of staff information:\n* Staff captures information about experience and credentials.\n* StaffSchoolAssociation captures additional information and associations relating to instructional duties.\n* StaffEducationOrganizationEmploymentAssociation represents employment information.\n* StaffEducationOrganizationAssignmentAssociation represents position assignments and roles. The employment and assignment associations are separated to accommodate a number of different types of situations. Staff may have multiple employment and assignment associations. Staff may be employed with one organization, like an LEA, whereas their assignments are at other organizations, specifically schools. If an assignment is directly tied to employment (i.e., the staff member's pay would differ based upon the assignments), then an association is used from theStaffEducationOrganizationAssignmentAssociation to the StaffEducationOrganizationEmploymentAssociation.\n* LeaveEvent tracks staff leave history.\n* OpenStaffPosition indicates the employment postings for an education organization and captures the result of that posting.",
      "entities": [
        "Credential",
        "EducationOrganization",
        "EducationServiceCenter",
        "LocalEducationAgency",
        "OpenStaffPosition",
        "Person",
        "School",
        "Staff",
        "StaffAbsenceEvent",
        "StaffLeave",
        "StateEducationAgency"
      ],
      "associations": [
        "StaffEducationOrganizationAssignmentAssociation",
        "StaffEducationOrganizationContactAssociation",
        "StaffEducationOrganizationEmploymentAssociation",
        "StaffSchoolAssociation"
      ]
    }
  },
  {
    "Standards (Subdomain of Assessment)": {
      "documentation": "LearningStandard may also be hierarchically organized to support the use case that adopters of the Common Core often decompose a standard into lower level standards in their curriculum. The HasAssociatedPrerequisite association captures prerequisites for a LearningStandard as would be specified in a learning map.",
      "entities": [
        "LearningStandard"
      ],
      "parentDomain": "Assessment"
    }
  },
  {
    "StudentAcademicRecord": {
      "documentation": "The Student Academic Record domain models the various kinds of student performance reporting.\n* A student transcript contains information about course-level grades and credits. A student transcript consists of a StudentAcademicRecord associated with each Session which has aCourseTranscript for each course taken.\n* Report cards contain information for grading period grades and competencies. A report card consists of a ReportCard entity for each GradingPeriod. A Grade is associated with each Section entity.\n* Gradebook contains grades and competencies for classroom quizzes, tests, homework, and projects. An assignment in a Gradebook is represented as a GradebookEntry. Each student's score for that entry is a StudentGradebookEntry which can be a grade or a CompetencyLevelDescriptor.",
      "entities": [
        "CompetencyObjective",
        "Course",
        "CourseOffering",
        "CourseTranscript",
        "EducationOrganization",
        "Grade",
        "GradebookEntry",
        "GradingPeriod",
        "LearningStandard",
        "Program",
        "ReportCard",
        "School",
        "Section",
        "Session",
        "Student",
        "StudentAcademicRecord",
        "StudentCompetencyObjective",
        "StudentGradebookEntry"
      ],
      "associations": [
        "StudentProgramAssociation",
        "StudentSectionAssociation"
      ]
    }
  },
  {
    "StudentAssessment (Subdomain of Assessment)": {
      "documentation": "Assessment represents a specific administration of an assessment. The Assessment entity contains the minimum amount of metadata required for an assessment.\n* If the Assessment is associated with one or more sections, an association is made to the section(s).\n* ObjectiveAssessment is the optional identification of portions of the assessment that test specific learning objectives. If required, there can be multiple levels of hierarchical ObjectiveAssessments.\n* The AssessmentItem supports the optional identification of the individual questions or items on a test to be scored. Typically, the identification of AssessmentItems is done in conjunction with their mapping to LearningStandards.\n* If the assessment references the common core or other state standards for LearningStandards, then the assessment metadata would reference the preloaded standards. If the assessment references its own set of LearningStandards, then that data would be loaded as assessment metadata. An ObjectiveAssessment may test one or more LearningStandards.\n\nThe student's assessment results follow a similar structure to the assessment metadata.\n* StudentAssessment holds the overall assessment score and other information about a specific student's results for a specific assessment.The StudentAssessment is associated with a specific student.\n* StudentObjectiveAssessment optionally holds the student's score for individually scored results for a specific LearningStandards. If the assessment metadata includes ObjectiveAssessments, then there would be corresponding StudentObjectiveAssessments for each student.\n* StudentAssessmentItem optionally holds the student's score for individual AssessmentItems. If the assessment metadata includesAssessmentItems, then there would be corresponding StudentAssessmentItems for each student.",
      "entities": [
        "Student",
        "StudentAssessment",
        "StudentAssessmentItem",
        "StudentObjectiveAssessment"
      ],
      "parentDomain": "Assessment"
    }
  },
  {
    "StudentAttendance": {
      "documentation": "The Student Attendance domain represents both daily and classperiod (section) attendance. This model supports two approaches for collecting attendance data:\n* One attendance event for each student-section (or each student-day), reporting both attendance and absences\n* \"\"Exception only\"\" reporting, providing attendance events only for absences and tardies",
      "entities": [
        "Program",
        "School",
        "Section",
        "SectionAttendanceTakenEvent",
        "Session",
        "Staff",
        "Student",
        "StudentProgramAttendanceEvent",
        "StudentSchoolAttendanceEvent",
        "StudentSectionAttendanceEvent"
      ],
      "associations": [
        "StudentProgramAssociation",
        "StudentSectionAssociation"
      ]
    }
  },
  {
    "StudentCohort": {
      "documentation": "The Student Cohort domain represents a wide variety of collections of students that are distinct from class rosters or program participants. This could include students that are tagged for interventions or students tagged for the purposes of tracking or analysis, such as a school principal's \"\"watch list.\"\" The StudentCohortAssociation captures the assignment of students to cohorts.\n\nCohorts may be associated with programs and may have staff associated with the cohort who is providing services, oversight, or sponsorship. Cohorts are associated with Intervention entities via the StudentInterventionAssociation.",
      "entities": [
        "Cohort",
        "EducationOrganization",
        "Intervention",
        "Program",
        "Section",
        "Staff",
        "Student"
      ],
      "associations": [
        "StaffCohortAssociation",
        "StaffSectionAssociation",
        "StudentCohortAssociation",
        "StudentInterventionAssociation",
        "StudentSectionAssociation"
      ]
    }
  },
  {
    "StudentIdentificationAndDemographics": {
      "documentation": "The Student Identification and Demographics domain represents the core information about students and parents.\n* The Student entity captures important information and characteristics of a student.\n* The Contact entity spans all variants of contact - parent, guardian, caretaker or other important contact.\n* The StudentParentAssociation links students and parents and indicates the relation.",
      "entities": [
        "Contact",
        "Person",
        "Student"
      ],
      "associations": [
        "StudentContactAssociation",
        "StudentEducationOrganizationAssociation"
      ]
    }
  },
  {
    "StudentProgramEvaluation (Subdomain of TeachingAndLearning)": {
      "documentation": "",
      "entities": [
        "EvaluationRubricDimension",
        "Program",
        "ProgramEvaluation",
        "ProgramEvaluationElement",
        "ProgramEvaluationObjective",
        "StudentProgramEvaluation"
      ],
      "parentDomain": "TeachingAndLearning"
    }
  },
  {
    "StudentTranscript (Subdomain of StudentAcademicRecord)": {
      "documentation": "",
      "entities": [
        "Course",
        "CourseTranscript",
        "EducationOrganization",
        "Student",
        "StudentAcademicRecord"
      ],
      "parentDomain": "StudentAcademicRecord"
    }
  },
  {
    "Survey": {
      "documentation": "* Survey, SurveySection, and SurveyQuestion that describe the survey.\n* Survey responses that follow a parallel structure of SurveyResponse, SurveySectionResponse, and SurveyQuestionResponse.\n* Associations to tie Survey and SurveyResponse domain entities to Course, Section, Program, Target EducationOrganization, and Target Staff.",
      "entities": [
        "Survey",
        "SurveyQuestion",
        "SurveyQuestionResponse",
        "SurveyResponse",
        "SurveySection",
        "SurveySectionResponse"
      ],
      "associations": [
        "SurveyCourseAssociation",
        "SurveyProgramAssociation",
        "SurveyResponseEducationOrganizationTargetAssociation",
        "SurveyResponseStaffTargetAssociation",
        "SurveySectionAssociation",
        "SurveySectionResponseEducationOrganizationTargetAssociation",
        "SurveySectionResponseStaffTargetAssociation"
      ]
    }
  },
  {
    "TeachingAndLearning": {
      "documentation": "The Teaching and Learning domain represents the following concepts:\n* The course catalog, representing the course definitions and course offerings available at a school in each session\n* The student's class enrollments in sections and the teacher(s) assigned to that section\n* Early childhood enrollments in programs and the staff members related to that program\n\nThe model is based upon multiple levels of definition, as follows:\n* A Course entity represents the definition of the course, its characteristics, and its mapping to LearningStandards. A course may be defined a state, LEA or school level.\n* The CourseOffering entity represents a course that is offered by a school during a session. The CourseOffering will have a LocalCourseCode and may have a LocalCourseTitle.\n* A school will have one or more sections for each CourseOffering. Students are enrolled in specific sections. Each Section entity will have one or more assigned staff, will typically meet in a specific location in the school, and will be assigned a ClassPeriodentity for the session. Since early learning teaching and learning is based on programs, students are enrolled by association to the Program and Staff entities as well.",
      "entities": [
        "ClassPeriod",
        "Course",
        "CourseOffering",
        "EducationOrganization",
        "LearningStandard",
        "Location",
        "Program",
        "School",
        "Section",
        "Session",
        "Staff",
        "Student"
      ],
      "associations": [
        "StaffProgramAssociation",
        "StaffSchoolAssociation",
        "StaffSectionAssociation",
        "StudentProgramAssociation",
        "StudentSchoolAssociation",
        "StudentSectionAssociation"
      ]
    }
  }
]
;