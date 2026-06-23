import { ChevronLeft, CircleUserRound, Plus, Search } from 'lucide-react';

import { QQ_TOP_ACTIONS, buildQqHeaderSummary, type QqTopActionId } from './qqLogic';

export function QQHeader({
  userName,
  userAvatar,
  query,
  onBack,
  onAdd,
  onQueryChange,
  onAction,
  showMenu,
}: {
  userName: string;
  userAvatar: string | null;
  query: string;
  onBack: () => void;
  onAdd: () => void;
  onQueryChange: (query: string) => void;
  onAction: (actionId: QqTopActionId) => void;
  showMenu: boolean;
}) {
  const header = buildQqHeaderSummary({ userName, userAvatar });

  return (
    <header className="qq-home-header">
      <div className="qq-home-profile">
        <button type="button" onClick={onBack} className="qq-header-action qq-header-back" aria-label="返回">
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="qq-user-avatar">
          {header.avatar ? <img src={header.avatar} alt="" /> : <CircleUserRound className="h-6 w-6" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <h1>{header.name}</h1>
          <p className="qq-home-kicker">{header.status}</p>
        </div>
        <div className="qq-header-menu-wrap">
          <button type="button" onClick={onAdd} className="qq-header-action qq-header-add" aria-label="添加">
            <Plus className="h-5 w-5" />
          </button>
          {showMenu && (
            <div className="qq-top-menu">
              {QQ_TOP_ACTIONS.map((action) => (
                <button key={action.id} type="button" onClick={() => onAction(action.id)}>
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <label className="qq-search-bar">
        <Search className="h-4 w-4" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索好友、聊天记录"
        />
      </label>
    </header>
  );
}
