import { useTeamPageController } from '../hooks/useTeamPageController';
import { TeamView } from './TeamPage.view';

const Team = () => <TeamView model={useTeamPageController()} />;
export default Team;
