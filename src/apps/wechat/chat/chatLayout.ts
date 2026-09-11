export type ChatBottomLayout = 'default' | 'lifted';

export function normalizeChatBottomLayout(value: unknown): ChatBottomLayout {
  return value === 'lifted' ? 'lifted' : 'default';
}

export function getChatBottomLayoutClass(layout: ChatBottomLayout) {
  return layout === 'lifted' ? 'chat-bottom-lift' : '';
}

export function getPhoneBottomLayoutClass(layout: ChatBottomLayout) {
  return layout === 'lifted' ? 'phone-bottom-lift' : '';
}
