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
