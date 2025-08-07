"use strict";
const { Seeder } = require("mongoose-data-seed");
const RolesModel = require("../../app/models/RoleModel");
const PermissionModel = require("../../app/models/PermissionModel");
const { INITIAL_PERMISSIONS: PERMS, INITIAL_ROLES } = require('../../app/utils/constants');

const DEFAULT_ROLES = [
    {
        name: INITIAL_ROLES.SYSADMIN,
        hierarchyLevel: 1,
        description: "Mizala system administrator.. Citizen#1",
        permissions: [
            PERMS.delete_pbacs,
            PERMS.assign_pbacs,
            PERMS.create_pbac,
            PERMS.view_pbacs,
            PERMS.edit_pbac,
            PERMS.flag_user,
            PERMS.suspend_user,
            PERMS.deactivate_user,
            PERMS.edit_user,
            PERMS.view_users,
            PERMS.view_teams,
            PERMS.view_agents,
            PERMS.edit_agent,
            PERMS.delete_agent,
            PERMS.reactivate_user,
            PERMS.onboard_partner,
            PERMS.onboard_team_member,
            PERMS.audit_activities,
            PERMS.audit_access_logs,
            PERMS.send_notification
        ]
    },
    {
        name: INITIAL_ROLES.AGENT,
        hierarchyLevel: 5,
        description: "Agents who help drive sales",
        permissions: [
            PERMS.view_users,
            PERMS.view_policy_docs,
            PERMS.gen_policy_docs,
            PERMS.view_policy,
            PERMS.buy_policy,
            PERMS.buy_policy_self
        ]
    },
    {
        name: INITIAL_ROLES.USER,
        hierarchyLevel: 0,
        description: "A Mizalan [A.K.A citizen]",
        permissions: [
            PERMS.view_policy_docs,
            PERMS.gen_policy_docs,
            PERMS.view_policy,
            PERMS.view_tracker,
            PERMS.buy_policy_self
        ]
    },
    {
        name: INITIAL_ROLES.PARTNER,
        hierarchyLevel: 3,
        description: "A Mizala partner's account",
        permissions: [
            PERMS.view_users,
            PERMS.assign_pbacs,
            PERMS.view_tracker,
            PERMS.schedule_tracker_install,
            PERMS.view_policy,
            PERMS.buy_policy,
            PERMS.buy_policy_self,
            PERMS.view_leads,
            PERMS.view_teams,
            PERMS.view_agents,
            PERMS.edit_agent,
            PERMS.delete_agent,
            PERMS.onboard_team_member,
            PERMS.view_policy_docs,
            PERMS.gen_policy_docs
        ]
    },
    {
        name: INITIAL_ROLES.ADMIN,
        hierarchyLevel: 2,
        description: "A basic platform administrator.",
        permissions: [
            PERMS.flag_user,
            PERMS.suspend_user,
            PERMS.deactivate_user,
            PERMS.edit_user,
            PERMS.view_users,
            PERMS.reactivate_user,
            PERMS.onboard_partner,
            PERMS.onboard_team_member,
            PERMS.view_teams,
            PERMS.view_agents,
            PERMS.edit_agent,
            PERMS.delete_agent,
            PERMS.view_leads,
            PERMS.assign_pbacs,
            PERMS.send_notification,
            PERMS.audit_activities,
            PERMS.audit_access_logs
        ]
    },
    {
        name: INITIAL_ROLES.SUPPORT,
        hierarchyLevel: 4,
        description: "A support personnel.",
        permissions: [
            PERMS.view_users,
            PERMS.edit_user,
            PERMS.suspend_user,
            PERMS.deactivate_user,
            PERMS.flag_user,
            PERMS.view_leads,
            PERMS.view_teams,
            PERMS.view_agents,
            PERMS.edit_agent,
            PERMS.delete_agent,
            PERMS.view_insured_items,
            PERMS.add_insured_item,
            PERMS.delete_insured_item,
            PERMS.edit_insured_item,
            PERMS.send_notification,
            PERMS.view_tracker,
            PERMS.create_subcription,
            PERMS.schedule_tracker_install,
            PERMS.view_policy_docs,
            PERMS.update_policy,
            PERMS.view_policy,
            PERMS.gen_policy_docs
        ]
    },
]

class RolesSeeder extends Seeder {

    async shouldRun() {
        return RolesModel.countDocuments().exec().then(count => count === 0);
    }

    async run() {
        const permsInUse = (await PermissionModel.find({slug: {$in: Object.values(PERMS)}, inUse: true})).map(({slug}) => slug);
        return RolesModel.create(DEFAULT_ROLES.map(({name, permissions, description, hierarchyLevel}) => ({
            name,
            description,
            hierarchyLevel,
            permissions: permissions.filter(perm => permsInUse.includes(perm))
        })));
    }
}

module.exports = RolesSeeder;
