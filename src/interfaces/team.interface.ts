export interface Team {
    id:          string;
    name:        string;
    description: string;
    image:       string;
    createdAt:   Date;
    updatedAt:   Date;
    leaderId:    string;
    members?:    TeamMember[];
}

export interface TeamMember {
    member: {
        id: string;
        name?: string;
        lastName?: string;
        email?: string;
    };
    role?: string;
}
