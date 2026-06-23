import { Hash, Radio, Send, Sparkles, Star } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '../../../lib/utils';
import { useAppStore } from '../../../store';
import { buildPersonaQqChannelMessageDraft, buildQqChannelRows } from './qqChannelsLogic';

export function QQChannels() {
  const {
    qqChannels,
    qqChannelMessages,
    characters,
    userName,
    userAvatar,
    addQqChannelMessage,
    toggleQqChannelFollow,
  } = useAppStore();
  const rows = useMemo(() => buildQqChannelRows({ channels: qqChannels, messages: qqChannelMessages }), [qqChannels, qqChannelMessages]);
  const [activeChannelId, setActiveChannelId] = useState(rows[0]?.id || 'qq-channel-life');
  const [draft, setDraft] = useState('');
  const activeChannel = qqChannels.find((channel) => channel.id === activeChannelId) || rows[0];
  const activeMessages = qqChannelMessages
    .filter((message) => message.channelId === activeChannel?.id)
    .sort((a, b) => a.createdAt - b.createdAt);
  const personaCharacter = characters.length > 0 ? characters[qqChannelMessages.length % characters.length] : null;

  const sendMessage = () => {
    const content = draft.trim();
    if (!content || !activeChannel) return;
    addQqChannelMessage({
      channelId: activeChannel.id,
      authorId: 'user',
      authorName: userName || '我',
      authorAvatar: userAvatar || undefined,
      content,
      createdAt: Date.now(),
    });
    setDraft('');
  };

  const sendPersonaMessage = () => {
    if (!activeChannel || !personaCharacter) return;
    addQqChannelMessage(buildPersonaQqChannelMessageDraft({
      channel: activeChannel,
      character: personaCharacter,
      createdAt: Date.now(),
    }));
  };

  if (!activeChannel) {
    return (
      <div className="qq-feed-list">
        <div className="qq-empty-state static">频道还没有初始化。</div>
      </div>
    );
  }

  return (
    <div className="qq-feed-list qq-channel-layout">
      <div className="qq-channel-hero">
        <Radio className="h-7 w-7" />
        <div>
          <h2>QQ频道</h2>
          <p>关注频道、看消息流，也可以像真实 QQ 频道一样发一条。</p>
        </div>
      </div>

      <div className="qq-channel-tabs">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => setActiveChannelId(row.id)}
            className={cn(activeChannel.id === row.id && 'active')}
          >
            <span style={{ background: row.color }}><Hash className="h-4 w-4" /></span>
            <b>{row.name}</b>
            <small>{row.messageCount ? `${row.messageCount}条` : row.topic}</small>
          </button>
        ))}
      </div>

      <section className="qq-channel-room">
        <header>
          <div>
            <p>{activeChannel.topic}</p>
            <h3>{activeChannel.name}</h3>
            <span>{activeChannel.description}</span>
          </div>
          <div className="qq-channel-room-actions">
            <button type="button" onClick={sendPersonaMessage} disabled={!personaCharacter}>
              <Sparkles className="h-4 w-4" />
              角色冒泡
            </button>
            <button type="button" onClick={() => toggleQqChannelFollow(activeChannel.id)} className={cn(activeChannel.followed && 'active')}>
              <Star className="h-4 w-4" />
              {activeChannel.followed ? '已关注' : '关注'}
            </button>
          </div>
        </header>

        <div className="qq-channel-message-feed">
          {activeMessages.length === 0 && (
            <div className="qq-empty-state static">
              <Radio className="h-6 w-6" />
              <span>这个频道还没有消息，发第一条吧。</span>
            </div>
          )}
          {activeMessages.map((message) => (
            <article key={message.id} className={cn('qq-channel-message', message.authorId === 'user' && 'mine')}>
              <span className="qq-channel-message-avatar">
                {message.authorAvatar ? <img src={message.authorAvatar} alt="" /> : message.authorName.slice(0, 1)}
              </span>
              <div>
                <p>{message.authorName}</p>
                <span>{message.content}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="qq-channel-composer">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') sendMessage();
            }}
            placeholder={`发到 ${activeChannel.name}`}
          />
          <button type="button" onClick={sendMessage} disabled={!draft.trim()}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
