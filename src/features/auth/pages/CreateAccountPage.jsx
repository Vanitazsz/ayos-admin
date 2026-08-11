import { useCreateAccountPageController } from '../hooks/useCreateAccountPageController';
import { CreateAccountView } from './CreateAccountPage.view';

const CreateAccount = () => <CreateAccountView model={useCreateAccountPageController()} />;
export default CreateAccount;
