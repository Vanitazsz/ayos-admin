import { useLocationsPageController } from '../hooks/useLocationsPageController';
import { LocationsView } from './LocationsPage.view';

const Locations = () => <LocationsView model={useLocationsPageController()} />;
export default Locations;
