import { APP_VERSION } from '../../constants/version.js';

export default function VersionLabel() {
  return <div className="app-version-label">Version {APP_VERSION}</div>;
}
