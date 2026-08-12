import { useMessagesPageController } from '../hooks/useMessagesPageController';
import { MessagesView } from './MessagesPage.view';

const Messages = () => <MessagesView model={useMessagesPageController()} />;
export default Messages;
