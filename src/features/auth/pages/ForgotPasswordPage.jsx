import { useForgotPasswordPageController } from '../hooks/useForgotPasswordPageController';
import { ForgotPasswordView } from './ForgotPasswordPage.view';

const ForgotPassword = () => <ForgotPasswordView model={useForgotPasswordPageController()} />;
export default ForgotPassword;
