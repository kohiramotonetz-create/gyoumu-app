export const STAFF_ROLES = ['teacher', 'head-teacher', 'general', 'admin'];
export const ACCOUNT_MANAGER_ROLES = ['head-teacher', 'general', 'admin'];
export const PRIVILEGED_STAFF_ROLES = ['head-teacher', 'general', 'admin'];
export const MODEL_ANSWER_ROLES = ['general', 'admin'];
export const ADMIN_MANAGED_ROLES = ['student', 'teacher', 'head-teacher', 'general', 'admin'];

export const isStaffRole = role => STAFF_ROLES.includes(role);
export const canManageAccounts = role => ACCOUNT_MANAGER_ROLES.includes(role);
export const isPrivilegedStaffRole = role => PRIVILEGED_STAFF_ROLES.includes(role);
export const canViewModelAnswers = role => MODEL_ANSWER_ROLES.includes(role);
