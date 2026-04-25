const compatibilityMap = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"]
};

export const canDonateTo = (donorBloodGroup, neededBloodGroup) => {
    const donor = String(donorBloodGroup || "").toUpperCase().trim();
    const needed = String(neededBloodGroup || "").toUpperCase().trim();
    return Boolean(compatibilityMap[donor]?.includes(needed));
};
