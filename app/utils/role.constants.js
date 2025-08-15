"use strict";
const PERMISSION = require("./permission.constant").PERMISSION;

const rolesToPermissions = {
    BUYER: [
        'profile_read_self', 'profile_update_self', 'property_read_published',
        'interest_create', 'appointment_create', 'appointment_cancel_own', 'chat_initiate',
        'chat_read', 'chat_send', 'chat_delete_own', 'chat_reply_own', 'chat_edit_own',
        'chat_archive_own', 'chat_unarchive_own', 'call_initiate', 'call_join', 'call_leave',
        'call_mute_own', 'call_unmute_own', 'video_call_initiate', 'video_call_join',
        'video_call_leave', 'vr_ar', 'property_share',

    ],
    HOMEOWNER: [
        'profile_read_self', 'profile_update_self', 'property_read_published',
        'interest_create', 'appointment_create', 'appointment_cancel_own', 'chat_initiate',
        'property_create', 'property_update_own', 'property_delete_own',
        'property_upload_media_own', 'property_upload_document_own',
        'appointment_confirm_own', 'appointment_read_own', 'leads_read_own',
        'dashboard_view_analytics_own', 'dashboard_view_market_insights',
        'dashboard_view_performance_own', 'dashboard_manage_notifications',
        'dashboard_manage_settings', 'dashboard_manage_subscriptions',
        'dashboard_manage_payments', 'dashboard_manage_billing',
        'dashboard_view_premium_features', 'dashboard_view_support',
        'dashboard_view_usage_own',

    ],
    REALTOR: [
        'profile_read_self', 'profile_update_self', 'property_read_published',
        'interest_create', 'appointment_create', 'appointment_cancel_own', 'chat_initiate',
        'property_create', 'property_update_own', 'property_delete_own',
        'property_upload_media_own', 'property_upload_document_own',
        'appointment_confirm_own', 'appointment_read_own', 'leads_read_own',
        'dashboard_view_analytics_own', 'dashboard_view_market_insights',
        'dashboard_view_performance_own', 'dashboard_manage_notifications',
        'dashboard_manage_settings', 'dashboard_manage_subscriptions',
        'dashboard_manage_payments', 'dashboard_manage_billing',
        'dashboard_view_premium_features', 'dashboard_view_support',
        'dashboard_view_usage_own',

    ],
    DEVELOPER: [
        'profile_read_self', 'profile_update_self', 'property_read_published',
        'interest_create', 'appointment_create', 'appointment_cancel_own', 'chat_initiate',
        'property_create', 'property_update_own', 'property_delete_own',
        'property_upload_media_own', 'property_upload_document_own',
        'appointment_confirm_own', 'appointment_read_own', 'leads_read_own',
        'dashboard_view_analytics_own', 'dashboard_view_market_insights',
        'dashboard_view_performance_own', 'dashboard_manage_notifications',
        'dashboard_manage_settings', 'dashboard_manage_subscriptions',
        'dashboard_manage_payments', 'dashboard_manage_billing',
        'dashboard_view_premium_features', 'dashboard_view_support',
        'dashboard_view_usage_own',
    ],
    ADMIN: [
        'profile_read_self', 'profile_update_self', 'property_read_published',
        'admin_user_read_all', 'admin_user_update_any', 'admin_user_verify', 'admin_user_suspend',
        'admin_property_read_any', 'admin_property_update_any', 'admin_property_delete_any', 'admin_property_verify',
        'admin_dashboard_view_platform_analytics',
        'admin_dashboard_manage_users', 'admin_dashboard_manage_properties',
        'admin_dashboard_manage_analytics', 'admin_dashboard_manage_reports',
        'admin_dashboard_view_market_insights',
        'admin_dashboard_view_usage_own',

    ],
    SYSADMIN: PERMISSION.map(p => p.name),
};

module.exports = rolesToPermissions;
