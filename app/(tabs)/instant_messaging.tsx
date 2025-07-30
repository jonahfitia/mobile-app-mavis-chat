
import { ConversationList } from '@/components/ConversationList';
import { useHomeChatData } from '../../hooks/useHomeChartData';


export default function MessagingScreen() {
  const { chatData, error } = useHomeChatData(); // ou passe chatData/error en props

  return (
    <ConversationList chatData={chatData} filterType="chat" error={error} />
  );
}
