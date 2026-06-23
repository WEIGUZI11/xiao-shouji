import { ChevronLeft, MessageCircle, Radio, Sparkles, Users, Video, Phone } from 'lucide-react';

import type { Character } from '../../../store';
import { Avatar } from '../../shared/AppPrimitives';
import { buildQqProfileSummary } from '../qqLogic';

export function QQProfile({
  character,
  onBack,
  onOpenChat,
  onStartVoiceCall,
  onStartVideoCall,
  onOpenDynamic,
}: {
  character: Character;
  onBack: () => void;
  onOpenChat: (characterId: string) => void;
  onStartVoiceCall: (characterId: string) => void;
  onStartVideoCall: (characterId: string) => void;
  onOpenDynamic: () => void;
}) {
  const profile = buildQqProfileSummary(character);
  const actionIcons = {
    chat: MessageCircle,
    voice: Phone,
    video: Video,
    dynamic: Sparkles,
  };
  const actionHandlers = {
    chat: () => onOpenChat(profile.id),
    voice: () => onStartVoiceCall(profile.id),
    video: () => onStartVideoCall(profile.id),
    dynamic: onOpenDynamic,
  };

  return (
    <section className="qq-home-screen qq-profile-screen h-full overflow-y-auto pb-8">
      <header className="qq-home-header qq-profile-header">
        <div className="qq-home-profile">
          <button type="button" onClick={onBack} className="qq-header-action" aria-label={profile.backLabel}>
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="qq-home-kicker">QQ 个人主页</p>
            <h1>{profile.name}</h1>
          </div>
        </div>
      </header>

      <div className="qq-profile-card">
        <Avatar character={character} />
        <div className="min-w-0 flex-1">
          <h2>{profile.name}</h2>
          <p>{profile.subtitle}</p>
        </div>
      </div>
      <div className="qq-profile-actions">
        {profile.actions.map((action) => {
          const Icon = actionIcons[action.id];
          return (
            <button key={action.id} type="button" onClick={actionHandlers[action.id]} className={action.id === 'chat' ? 'qq-profile-primary' : 'qq-profile-secondary'}>
              <Icon className="h-5 w-5" />
              <span>{action.label}</span>
            </button>
          );
        })}
        <button type="button" onClick={onBack} className="qq-profile-secondary">
          <Users className="h-5 w-5" />
          <span>看联系人</span>
        </button>
      </div>

      <div className="qq-profile-detail-list">
        {profile.details.map((detail) => (
          <div key={detail.label} className="qq-profile-detail-row">
            <span>{detail.label}</span>
            <p>{detail.title}</p>
          </div>
        ))}
        <div className="qq-profile-detail-row">
          <span>动态入口</span>
          <p><Radio className="inline h-4 w-4" /> 可以从这里跳到 QQ 动态页。</p>
        </div>
      </div>
    </section>
  );
}
