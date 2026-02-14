// Indian Shelter HMIS Data Standards Constants
// Tailored for the Indian context

// Demographics & Identity
export const CATEGORY_OPTIONS = [
    { value: 1, label: 'General' },
    { value: 2, label: 'OBC (Other Backward Classes)' },
    { value: 3, label: 'SC (Scheduled Caste)' },
    { value: 4, label: 'ST (Scheduled Tribe)' },
    { value: 9, label: 'Prefer not to answer' },
];

export const IDENTITY_DOCUMENT_OPTIONS = [
    { value: 'aadhaar', label: 'Aadhaar Card' },
    { value: 'voter_id', label: 'Voter ID' },
    { value: 'ration_card', label: 'Ration Card' },
    { value: 'pan', label: 'PAN Card' },
    { value: 'none', label: 'No ID Available' },
];

export const SEX_OPTIONS = [
    { value: 0, label: 'Female' },
    { value: 1, label: 'Male' },
    { value: 2, label: 'Third Gender / Transgender' },
    { value: 9, label: 'Prefer not to answer' },
];

export const EX_SERVICEMAN_OPTIONS = [
    { value: 0, label: 'No' },
    { value: 1, label: 'Yes' },
];

export const YES_NO_OPTIONS = [
    { value: 0, label: 'No' },
    { value: 1, label: 'Yes' },
    { value: 9, label: 'Don\'t Know/Not Shared' },
];

// Living Situation
export const LIVING_SITUATION_OPTIONS = [
    { value: 1, label: 'On the streets / Railway station / Bus stand' },
    { value: 2, label: 'Night Shelter (Rain Basera)' },
    { value: 3, label: 'Staying with relatives / friends' },
    { value: 4, label: 'Rented accommodation' },
    { value: 5, label: 'Hospital / Care home' },
    { value: 6, label: 'Other temporary arrangement' },
];

// Destination at Exit
export const DESTINATION_OPTIONS = [
    { value: 1, label: 'Permanent Housing / Home' },
    { value: 2, label: 'Staying with family' },
    { value: 3, label: 'Other Shelter' },
    { value: 4, label: 'Back to streets' },
    { value: 5, label: 'Employment-linked housing' },
    { value: 17, label: 'Other' },
    { value: 24, label: 'Deceased' },
];

// Relationship to Head of Household
export const RELATIONSHIP_TO_HOH_OPTIONS = [
    { value: 1, label: 'Self (Head of Household)' },
    { value: 2, label: 'Child' },
    { value: 3, label: 'Spouse / Partner' },
    { value: 4, label: 'Other Relative' },
    { value: 5, label: 'Non-relative' },
];

// Service Types
export const SERVICE_TYPES = [
    { value: 1, label: 'Case Management' },
    { value: 2, label: 'Nutritional Meals' },
    { value: 3, label: 'Aadhaar/Document Assistance' },
    { value: 4, label: 'Medical Checkup' },
    { value: 5, label: 'Counseling' },
    { value: 6, label: 'Vocational Training' },
    { value: 7, label: 'Employment Help' },
    { value: 8, label: 'Legal Aid' },
    { value: 14, label: 'Other' },
];

// Bed Types
export const BED_TYPES = [
    { value: 'general', label: 'General Ward' },
    { value: 'family', label: 'Family Section' },
    { value: 'infirmary', label: 'Medical/Infirmary' },
    { value: 'emergency', label: 'Emergency/Transit' },
];

// Bed Status
export const BED_STATUS = [
    { value: 'available', label: 'Available', color: 'success' },
    { value: 'occupied', label: 'Occupied', color: 'danger' },
    { value: 'maintenance', label: 'Maintenance', color: 'gray' },
    { value: 'reserved', label: 'Reserved', color: 'primary' },
];

// Indian States and Union Territories
export const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];
