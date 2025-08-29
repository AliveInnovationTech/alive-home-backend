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

exports.PROPERTY_TYPES = {
    DETACHED_HOUSE: 'detached house',
    SEMI_DETACHED: 'semi detached',
    TERRACE_HOUSE: 'terrace house',
    DUPLEX: 'duplex',
    BUNGALOW: 'bungalow',
    MANSION: 'mansion',
    VILLA: 'villa',
    ESTATE_HOUSE: 'estate house',
    TOWNHOUSE: 'townhouse',
    COMPOUND: 'compound',
    CHALET: 'chalet',
    BOYS_QUARTERS: 'boys quarters',
	HOUSE: 'house',
    APARTMENT: 'apartment',
    PENTHOUSE: 'penthouse',
    MINI_FLAT: 'mini flat',
    SELF_CONTAINED: 'self contained',
    ROOM_AND_PARLOUR: 'room and parlour',
    SERVICED_APARTMENT: 'serviced apartment',
    COMMERCIAL_OFFICE: 'commercial office',
    RETAIL_SHOP: 'retail shop',
    WAREHOUSE: 'warehouse',
    COMMERCIAL_PLAZA: 'commercial plaza',
    HOTEL: 'hotel',
    LAND_RESIDENTIAL: 'land residential',
    LAND_COMMERCIAL: 'land commercial',
    LAND_INDUSTRIAL: 'land industrial',
    LAND_AGRICULTURAL: 'land agricultural',
    STUDENT_HOSTEL: 'student hostel',
	LAND: 'land',
	COMMERCIAL: 'commercial',
    CONDO: 'condo',
    CO_WORKING_SPACE: 'co-working space',
    MULTIFAMILY: 'multifamily',
    SINGLE_FAMILY: 'single family'
};

exports.LISTING_STATUS = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    PENDING: 'pending',
    SOLD: 'sold',
    WITHDRAWN: 'withdrawn',
    EXPIRED: 'expired'
};

exports.PROPERTY_STATUS = {
    ACTIVE: 'active',
    PENDING: 'pending',
    DRAFT: 'draft',
    SOLD: 'sold',
    UNAVAILABLE: 'unavailable',
    AVAILABLE: 'available'
};
