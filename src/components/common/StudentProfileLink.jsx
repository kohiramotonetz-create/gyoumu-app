import { buildStudentProfileHash } from '../../utils/studentProfileNavigation.js';

export default function StudentProfileLink({ userId, source, children, style }) {
  const href = buildStudentProfileHash(userId, source);
  if (!href) return children;
  return <a href={href} onClick={() => window.history.replaceState({ ...window.history.state, studentProfileSource: source || '' }, '')} style={{ color: '#0f4c81', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2, ...style }}>{children}</a>;
}
