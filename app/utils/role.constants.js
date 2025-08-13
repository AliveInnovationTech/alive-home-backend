"use strict";
const PERMISSION = require("./permission.constant").PERMISSION;

const rolesToPermissions = {
    BUYER: [
        'profile:read:self', 'profile:update:self', 'property:read:published',
        'interest:create', 'appointment:create', 'appointment:cancel:own', 'chat:initiate',
        'chat:read', 'chat:send', 'chat:delete:own', 'chat:reply:own', 'chat:edit:own',
        'chat:archive:own', 'chat:unarchive:own', 'call:initiate', 'call:join', 'call:leave',
        'call:mute:own', 'call:unmute:own', 'video:call:initiate', 'video:call:join',
        'video:call:leave', 'vr/ar', 'property:share',

    ],
    HOMEOWNER: [
        'profile:read:self', 'profile:update:self', 'property:read:published',
        'interest:create', 'appointment:create', 'appointment:cancel:own', 'chat:initiate',
        'property:create', 'property:update:own', 'property:delete:own',
        'property:upload:media:own', 'property:upload:document:own',
        'appointment:confirm:own', 'appointment:read:own', 'leads:read:own',
        'dashboard:view:analytics:own', 'dashboard:view:market-insights',
        'dashboard:view:performance:own', 'dashboard:manage:notifications',
        'dashboard:manage:settings', 'dashboard:manage:subscriptions',
        'dashboard:manage:payments', 'dashboard:manage:billing',
        'dashboard:view:premium-features', 'dashboard:view:support',
        'dashboard:view:usage:own',

    ],
    REALTOR: [
        'profile:read:self', 'profile:update:self', 'property:read:published',
        'interest:create', 'appointment:create', 'appointment:cancel:own', 'chat:initiate',
        'property:create', 'property:update:own', 'property:delete:own',
        'property:upload:media:own', 'property:upload:document:own',
        'appointment:confirm:own', 'appointment:read:own', 'leads:read:own',
        'dashboard:view:analytics:own', 'dashboard:view:market-insights',
        'dashboard:view:performance:own', 'dashboard:manage:notifications',
        'dashboard:manage:settings', 'dashboard:manage:subscriptions',
        'dashboard:manage:payments', 'dashboard:manage:billing',
        'dashboard:view:premium-features', 'dashboard:view:support',
        'dashboard:view:usage:own',

    ],
    DEVELOPER: [
        'profile:read:self', 'profile:update:self', 'property:read:published',
        'interest:create', 'appointment:create', 'appointment:cancel:own', 'chat:initiate',
        'property:create', 'property:update:own', 'property:delete:own',
        'property:upload:media:own', 'property:upload:document:own',
        'appointment:confirm:own', 'appointment:read:own', 'leads:read:own',
        'dashboard:view:analytics:own', 'dashboard:view:market-insights',
        'dashboard:view:performance:own', 'dashboard:manage:notifications',
        'dashboard:manage:settings', 'dashboard:manage:subscriptions',
        'dashboard:manage:payments', 'dashboard:manage:billing',
        'dashboard:view:premium-features', 'dashboard:view:support',
        'dashboard:view:usage:own',
    ],
    ADMIN: [
        'profile:read:self', 'profile:update:self', 'property:read:published',
        'admin:user:read:all', 'admin:user:update:any', 'admin:user:verify', 'admin:user:suspend',
        'admin:property:read:any', 'admin:property:update:any', 'admin:property:delete:any', 'admin:property:verify',
        'admin:dashboard:view:platform-analytics',
        'admin:dashboard:manage:users', 'admin:dashboard:manage:properties',
        'admin:dashboard:manage:analytics', 'admin:dashboard:manage:reports',
        'admin:dashboard:view:market-insights',
        'admin:dashboard:view:usage:own',

    ],
    SYS: PERMISSION.map(p => p.name),
};

module.exports = rolesToPermissions;
