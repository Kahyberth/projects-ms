export interface User {
    id:          string;
    name:        string;
    lastName:    string;
    phone:       string;
    email:       string;
    password:    string;
    language:    string;
    createdAt:   Date;
    updatedAt:   Date;
    lastLogin:   null;
    company:     string;
    isActive:    boolean;
    isAvailable: boolean;
    profile:     Profile;
}

export interface Profile {
    id:                 string;
    userId:             string;
    profile_picture:    string;
    profile_banner:     string;
    bio:                string;
    updatedAt:          Date;
    availabilityStatus: string;
    isVerified:         boolean;
    isBlocked:          boolean;
    skills:             string;
    location:           string;
    social_links:       string;
    experience:         string;
    education:          string;
    timezone:           null;
}
