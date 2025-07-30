import { ConversationList } from '@/components/ConversationList';
import React from 'react';
import { useHomeChatData } from '../../hooks/useHomeChartData';

export default function ChannelScreen() {
  const { chatData, error } = useHomeChatData();

  return (
    <ConversationList chatData={chatData} filterType="channel" error={error} />
  );
}