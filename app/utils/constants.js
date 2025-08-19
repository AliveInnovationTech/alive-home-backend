"use strict";

exports.STATUS = {
    PENDING: "pending",
    COMPLETED: "completed",
    REJECTED: "rejected",
    ACTIVE: "active",
    INACTIVE: "inactive",
    FLAGGED: "flagged",
    SUSPENDED: "suspended",
    DEACTIVATED: "deactivated"
};

exports.INQUIRY_STATUS = {
    PENDING: 'Pending',
    REVIEWED: 'Reviewed',
    CONTACTED: 'Contacted',
    RESOLVED: 'Resolved',
    ARCHIVED: 'Archived'
};

exports.INQUIRY_TYPE = {
    GENERAL: 'General',
    VIEWING: 'Viewing',
    FINANCING: 'Financing',
    OFFER: 'Offer',
    OTHER: 'Other'
};

exports.CATEGORY = {
    GENERAL: "general",
    USER_MANAGEMENT: "user management",
    ROLE_MANAGEMENT: "role management",
    PROPERTY_MANAGEMENT: "property management",
    LISTING_APPROVAL: "listing approval",
    TRANSACTION_MANAGEMENT: "transaction management",
    REPORTING: "reporting",
    NOTIFICATION: "notification",
    SETTINGS: "settings",
    BILLING: "billing",
    CONTENT_MANAGEMENT: "content management",
    SYSTEM: "system",
    CUSTOM: "custom",
    PERMISSION_MANAGEMENT: "permission management"
};
