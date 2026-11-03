import { ALL_SCHOOLS } from '../constants/organization.js';
import { isPrivilegedStaffRole } from './roles.js';

export function canAccessSukimakunMissionSchool(role, school, assignedSchools = []) {
  if (!isPrivilegedStaffRole(role) || !school) return false;
  if (role === 'admin') {
    if (school === '全校舎' || ALL_SCHOOLS.includes(school)) return true;
    // Retain previously generated links that target the admin's assigned campuses.
    return school === '全担当校舎' && assignedSchools.length > 0;
  }
  return school === '全担当校舎' ? assignedSchools.length > 0 : assignedSchools.includes(school);
}
