"use strict";

exports.ROLES = {
    USER: "user",
    AGENT: "agent",
    PARTNER: "partner"
};

exports.STATUS = {
    PENDING: "pending",
    COMPLETED: "completed",
    REJECTED: "rejected",
    ACTIVE: "active",
    IN_ACTIVE: "inactive",
    FLAGGED: "flagged",
    SUSPENDED: "suspended"
};

exports.VERIFICATION_TYPE = {
    PHONE: "phone",
    EMAIL: "email"
};

exports.PARTNER = {
    BILLING_TYPE: {
        POSTPAID: "postpaid",
        PREPAID: "prepaid"
    }
};
exports.EVENT = {
    USER: {
        CREATED: "user.created",
        UPDATED: "user.updated",
        DELETED: "user.deleted",
        LOGIN: "user.login"
    },
    PASSWORD: {
        CHANGED: "user.password-changed"
    },
    PARTNER: {
        CREATED: "partner.created",
        UPDATED: "partner.updated"
    }
};

exports.TOPIC = {
    USERS: "users",
    HEALTH_CHECK: "health.check",
    PLATFORM_MIGRATION: "platform.migration",
    USER: {
        CREATED: "user.created",
        UPDATED: "user.updated",
        DELETED: "user.deleted",
        LOGIN: "user.login"
    },
    PASSWORD: {
        CHANGED: "user.password-changed"
    },
    PARTNER: {
        CREATED: "partner.created",
        UPDATED: "partner.updated"
    },
    USERS_DEAD_LETTER: "users.dead.letter"
};

exports.INITIAL_PERMISSIONS = {
    gen_policy_docs: "generate_policy_docs",
    view_policy_docs: "view_policy_docs",
    buy_policy: "buy_policy",
    buy_policy_self: "buy_policy_self",
    update_policy: "update_policy",
    view_policy: "view_policy",
    view_leads: "view_leads",
    audit_activities: "audits_activities",
    audit_access_logs: "audits_access_logs",
    view_insured_items: "view_insured_items",
    add_insured_item: "add_insured_item",
    delete_insured_item: "delete_insured_item",
    edit_insured_item: "edit_insured_item",
    send_notification: "send_notification",
    schedule_tracker_install: "schedule_tracker_installation",
    view_tracker: "view_tracker",
    delete_pbacs: "delete_pbacs",
    assign_pbacs: "assign_pbacs",
    create_pbac: "create_pbac",
    view_pbacs: "view_pbacs",
    edit_pbac: "edit_pbac",
    flag_user: "flag_user",
    suspend_user: "suspend_user",
    deactivate_user: "deactivate_user",
    edit_user: "edit_user",
    view_users: "view_users",
    reactivate_user: "reactivate_user",
    onboard_partner: "onboard_partner",
    onboard_team_member: "onboard_team_member",
    create_subcription: "create_subcription",
    view_teams: "view_teams",
    view_agents: "view_agents",
    edit_agent: "edit_agent",
    delete_agent: "delete_agent",
    view_transaction: "view_transaction",
    // edit_agent: "edit_agent",
    // delete_agent: "delete_agent",
    view_claims: "view_claims",
    update_claim: "update_claim",
    payout_claim: "payout_claim",
    view_faqs: "view_faqs",
    update_faq: "update_faq",
    delete_faq: "delete_faq",
    write_faq: "write_faq"
};

exports.INITIAL_ROLES = {
    SYSADMIN: "system admin",
    AGENT: "agent",
    USER: "user",
    PARTNER: "partner",
    ADMIN: "admin",
    SUPPORT: "support"
};

exports.RESPONSE_MESSAGES = {
    UNAUTHORIZED_ERROR: "You are not authorized to access this resource!!!",
    AUTHORIZATION_FAILED: "Attempt to authorize failed.",
    FORBIDDEN_RESOURCE_ACCESS: "Intended action is forbidden"
};
